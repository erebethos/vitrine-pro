import { mkdtemp, writeFile, chmod, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, posix } from 'node:path';
import { spawn } from 'node:child_process';
import { isIP } from 'node:net';
import { pathToFileURL } from 'node:url';
import { site } from '../site.config.mjs';

export function deploymentPlan(env) {
  const user = env.O2_SSH_USER;
  const destination = env.O2_DEPLOY_PATH?.replace(/\/+$/, '');
  if (!user || !/^[a-z0-9_]{1,32}$/.test(user)) throw new Error('O2_SSH_USER: identifiant cPanel requis.');
  if (!destination || !/^\/[a-zA-Z0-9_./-]+$/.test(destination) || posix.normalize(destination) !== destination) throw new Error('O2_DEPLOY_PATH: chemin absolu normalisé requis.');
  if (!destination.startsWith(`/home/${user}/`) || posix.basename(destination) !== site.documentRootName) {
    throw new Error(`O2_DEPLOY_PATH doit viser le dossier dédié ${site.documentRootName} dans le compte cPanel.`);
  }
  const revision = env.GITHUB_SHA;
  if (!revision || !/^[a-f0-9]{40}$/.test(revision)) throw new Error('GITHUB_SHA: révision Git complète requise.');
  return { user, destination, revision, server: site.o2Server, backup: `/home/${user}/.portfolio-backups/${revision}`, origin: site.publicOrigin };
}

async function run(command, args, signal) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', signal, timeout: 180000 });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error(`${command}: échec (${code}).`)));
  });
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, { ...options, redirect: 'error', signal: options.signal || AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`Requête HTTPS refusée (${response.status}).`);
  return response.json();
}

export async function deploy(env = process.env) {
  const plan = deploymentPlan(env);
  for (const key of ['O2_CPANEL_TOKEN', 'O2_SSH_PRIVATE_KEY', 'O2_SSH_KNOWN_HOSTS']) {
    if (!env[key]?.trim()) throw new Error(`Secret GitHub manquant : ${key}`);
  }
  if (!env.O2_SSH_PRIVATE_KEY.includes('PRIVATE KEY')) throw new Error('Clé SSH privée non reconnue.');
  await access(new URL('../dist/en/index.html', import.meta.url));
  const controller = new AbortController();
  const abort = () => controller.abort();
  process.once('SIGINT', abort);
  process.once('SIGTERM', abort);
  let temporary;
  let runnerIp;
  let attemptedWhitelist = false;
  let existingDirections = new Set();
  const api = async (operation, params = {}, cleanup = false) => {
    const url = new URL(`https://${plan.server}:2083/execute/SshWhitelist/${operation}`);
    for (const [name, value] of Object.entries(params)) url.searchParams.set(name, String(value));
    const data = await requestJson(url, {
      headers: { Authorization: `cpanel ${plan.user}:${env.O2_CPANEL_TOKEN}` },
      signal: cleanup ? AbortSignal.timeout(45000) : AbortSignal.any([controller.signal, AbortSignal.timeout(45000)])
    });
    if (data.status !== 1 || data.errors?.length) throw new Error(`o2switch SshWhitelist/${operation}: opération non confirmée.`);
    return data.data;
  };
  try {
    const ip = await requestJson('https://api4.ipify.org?format=json', { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]) });
    if (isIP(ip.ip) !== 4) throw new Error('Adresse IPv4 du runner non disponible.');
    runnerIp = ip.ip;
    const previous = await api('list');
    if (!Array.isArray(previous?.list)) throw new Error('Liste blanche o2switch non lisible.');
    existingDirections = new Set(previous.list.filter(item => item.address === runnerIp && Number(item.port) === 22).map(item => item.direction));
    if (!existingDirections.has('in') || !existingDirections.has('out')) {
      attemptedWhitelist = true;
      await api('add', { address: runnerIp, port: 22 });
    }
    // Keep pre-existing entries: cleanup only removes directions added by this run.
    const confirmed = await api('list');
    if (!confirmed?.list?.some(item => item.address === runnerIp && Number(item.port) === 22 && item.direction === 'in')) throw new Error('Accès SSH du runner non confirmé.');
    temporary = await mkdtemp(join(tmpdir(), 'portfolio-deploy-'));
    await chmod(temporary, 0o700);
    const identity = join(temporary, 'identity');
    const knownHosts = join(temporary, 'known_hosts');
    await writeFile(identity, `${env.O2_SSH_PRIVATE_KEY.trim()}\n`, { mode: 0o600 });
    await writeFile(knownHosts, `${env.O2_SSH_KNOWN_HOSTS.trim()}\n`, { mode: 0o600 });
    const options = ['-i', identity, '-o', `UserKnownHostsFile=${knownHosts}`, '-o', 'StrictHostKeyChecking=yes', '-o', 'BatchMode=yes', '-o', 'IdentitiesOnly=yes', '-o', 'ConnectTimeout=20'];
    const remote = `${plan.user}@${plan.server}`;
    // Path and username have been restricted above; never deploy to the home or main web root.
    const command = `mkdir -p -- '${plan.destination}' && test "$(readlink -f -- '${plan.destination}')" = '${plan.destination}' && mkdir -p -- '${plan.backup}'`;
    await run('ssh', [...options, remote, command], controller.signal);
    await writeFile(new URL('../dist/deployment.json', import.meta.url), `${JSON.stringify({ revision: plan.revision, builtAt: new Date().toISOString() })}\n`);
    // No --delete: unrelated remote files are preserved. Replaced files have an off-webroot backup.
    const transport = ['ssh', ...options.map(option => `'${option.replaceAll("'", "'\\''")}'`)].join(' ');
    await run('rsync', ['--archive', '--compress', '--checksum', '--delay-updates', '--backup', `--backup-dir=${plan.backup}`, '--timeout=60', '-e', transport, 'dist/', `${remote}:${plan.destination}/`], controller.signal);
    const live = await requestJson(`${plan.origin}/deployment.json?revision=${plan.revision}`, { cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]) });
    if (live.revision !== plan.revision) throw new Error('Les fichiers ont été transférés, mais la révision publique ne correspond pas. Vérifier le sous-domaine et sa racine.');
    console.log(`Version vérifiée sur ${plan.origin}`);
  } finally {
    let cleanupFailed = false;
    if (attemptedWhitelist && runnerIp) {
      for (const direction of ['in', 'out']) if (!existingDirections.has(direction)) {
        try { await api('remove', { address: runnerIp, port: 22, direction }, true); }
        catch { console.error(`Nettoyage de la direction ${direction} non confirmé. Vérifier l’exception SSH du runner dans cPanel.`); cleanupFailed = true; }
      }
    }
    if (temporary) await rm(temporary, { recursive: true, force: true });
    process.removeListener('SIGINT', abort);
    process.removeListener('SIGTERM', abort);
    if (cleanupFailed) throw new Error('Publication terminée ou interrompue ; nettoyage de l’exception SSH à vérifier.');
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  if (process.argv.includes('--plan')) {
    try { console.log(JSON.stringify(deploymentPlan(process.env), null, 2)); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
  } else {
    deploy().catch(error => { console.error(error.message); process.exitCode = 1; });
  }
}
