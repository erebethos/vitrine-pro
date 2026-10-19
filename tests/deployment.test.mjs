import test from 'node:test';
import assert from 'node:assert/strict';
import { deploymentPlan } from '../scripts/deploy-o2switch.mjs';
const env = { O2_SSH_USER: 'user123', O2_DEPLOY_PATH: '/home/user123/portfolio.jobandjudith.com', GITHUB_SHA: 'a'.repeat(40) };

test('deployment is limited to the selected subdomain, with backups outside the webroot', () => {
  const plan = deploymentPlan(env);
  assert.equal(plan.origin, 'https://portfolio.jobandjudith.com');
  assert.equal(plan.server, 'oliviolet.o2switch.net');
  assert.equal(plan.destination, env.O2_DEPLOY_PATH);
  assert.ok(!plan.backup.startsWith(`${plan.destination}/`));
});
test('reject home, main domain, another account, traversal and shell injection before any network call', () => {
  for (const path of ['/', '/home/user123', '/home/user123/public_html', '/home/other/portfolio.jobandjudith.com', '/home/user123/../user123/portfolio.jobandjudith.com', '/home/user123/portfolio.jobandjudith.com;rm', '/home/user123/portfolio.jobandjudith.com/extra']) {
    assert.throws(() => deploymentPlan({ ...env, O2_DEPLOY_PATH: path }));
  }
  assert.throws(() => deploymentPlan({ ...env, O2_SSH_USER: 'user;echo' }));
  assert.throws(() => deploymentPlan({ ...env, GITHUB_SHA: '../main' }));
});
