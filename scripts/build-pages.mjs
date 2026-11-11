import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { english } from '../dist/assets/content.mjs';
import { site } from '../site.config.mjs';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');
let html = await read('dist/index.html');
const originUrl = new URL(process.env.SITE_ORIGIN || site.previewOrigin);
if (originUrl.protocol !== 'https:' || originUrl.pathname !== '/' || originUrl.search || originUrl.hash || originUrl.username || originUrl.password) {
  throw new Error('SITE_ORIGIN must be an HTTPS origin without a path, query or credentials.');
}
const origin = originUrl.origin;
html = html.replace(/(<link rel="canonical" href=")[^"]+("\s*>)/, `$1${origin}/$2`)
  .replace(/(<link rel="alternate" hreflang="(?:fr|x-default)" href=")[^"]+("\s*>)/g, `$1${origin}/$2`)
  .replace(/(<link rel="alternate" hreflang="en" href=")[^"]+("\s*>)/, `$1${origin}/en/$2`);
await writeFile(new URL('dist/index.html', root), html);
const used = new Set();
html = html.replace(/<([a-z][a-z0-9]*)([^>]*\bdata-i18n="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/g, (match, tag, attrs, key) => {
  if (!(key in english)) throw new Error(`Missing EN text: ${key}`);
  used.add(key);
  return `<${tag}${attrs}>${english[key]}</${tag}>`;
});
html = html.replace(/<[^>]+\bdata-i18n-(aria|alt)="[^"]+"[^>]*>/g, tag => tag.replace(/\bdata-i18n-(aria|alt)="([^"]+)"/, (attribute, kind, key) => {
  if (!(key in english)) throw new Error(`Missing EN attribute: ${key}`);
  used.add(key);
  return attribute;
}).replace(/\b(aria-label|alt)="[^"]*"/, (attribute, name) => {
  const key = tag.match(/\bdata-i18n-(?:aria|alt)="([^"]+)"/)[1];
  return `${name}="${english[key].replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"`;
}));
html = html.replace('<html lang="fr">', '<html lang="en">')
  .replace('<title>François de Gennaro — Réseaux & développement logiciel</title>', '<title>François de Gennaro — Networks & software development</title>')
  .replace(/<meta name="description"[^>]+>/, '<meta name="description" content="Hybrid profile in Mons, Belgium: networks, Linux and software development. Java and SQL projects, Python tooling and Rust learning. Seeking an internship.">')
  .replace('property="og:title" content="François de Gennaro — Réseaux & développement logiciel"', 'property="og:title" content="François de Gennaro — Networks & software development"')
  .replace('property="og:description" content="Réseaux et développement logiciel : projets Java et SQL, scripts Python, apprentissage Rust et laboratoire IPv4 interactif."', 'property="og:description" content="Networks and software development: Java and SQL projects, Python scripts, Rust learning and an interactive IPv4 lab."')
  .replace('content="fr_BE"', 'content="en_GB"')
  .replace(`rel="canonical" href="${origin}/"`, `rel="canonical" href="${origin}/en/"`)
  .replaceAll('"./assets/', '"../assets/')
  .replaceAll('CV_Francois_de_Gennaro_FR.pdf', 'CV_Francois_de_Gennaro_EN.pdf')
  .replace('href="./" lang="fr" hreflang="fr" data-language="fr" aria-current="page"', 'href="../?lang=fr" lang="fr" hreflang="fr" data-language="fr"')
  .replace('href="./en/" lang="en" hreflang="en" data-language="en"', 'href="./" lang="en" hreflang="en" data-language="en" aria-current="page"');
await mkdir(new URL('dist/en/', root), { recursive: true });
await writeFile(new URL('dist/en/index.html', root), html);
// Old inbound page URLs now take visitors to the corresponding section, without publishing school content.
for (const [path, hash] of Object.entries({profil:'profil',competences:'competences',projets:'projets',contact:'contact',demarche:'profil',sources:'projets'})) {
  await writeFile(new URL(`dist/${path}.html`, root), `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="refresh" content="0;url=./#${hash}"><title>François de Gennaro</title><a href="./#${hash}">François de Gennaro — Continuer</a></html>\n`);
}
console.log(`Generated FR/EN for ${origin} (${used.size} translation keys), plus 6 legacy redirects.`);

