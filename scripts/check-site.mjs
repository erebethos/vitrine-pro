import { readFile, access } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { english, messages } from '../dist/assets/content.mjs';
import { site } from '../site.config.mjs';
const root = new URL('../dist/', import.meta.url);
const expectedOrigin = new URL(process.env.SITE_ORIGIN || site.previewOrigin).origin;
for (const [path, lang] of [['index.html','fr'],['en/index.html','en']]) {
  const url = new URL(path, root);
  const html = await readFile(url, 'utf8');
  assert.ok(html.includes(`<html lang="${lang}">`));
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length, `${path}: duplicate IDs`);
  for (const m of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(m[1]), `${path}: missing #${m[1]}`);
  for (const m of html.matchAll(/(?:src|href)="(\.[^"]+)"/g)) {
    const file = new URL(m[1], url);
    file.search = ''; file.hash = '';
    if (file.pathname.endsWith('/')) file.pathname += 'index.html';
    await access(file);
  }
  for (const m of html.matchAll(/data-i18n(?:-aria|-alt)?="([^"]+)"/g)) assert.ok(m[1] in english, `Missing EN: ${m[1]}`);
  assert.ok(!html.includes('href="#"'), `${path}: dummy link`);
  assert.ok(!html.includes('version pédagogique'), `${path}: obsolete school copy`);
  assert.ok(html.includes('rel="canonical"'));
  assert.ok(html.includes(`rel="canonical" href="${expectedOrigin}/${lang === 'en' ? 'en/' : ''}"`));
  assert.ok(html.includes(`hreflang="en" href="${expectedOrigin}/en/"`));
  assert.ok(html.includes(`hreflang="fr" href="${expectedOrigin}/"`));
  assert.ok(html.includes('hreflang="en"'));
  assert.ok(html.includes('hreflang="fr"'));
  assert.ok(html.includes('data-language="en"'));
  assert.ok(html.includes('data-language="fr"'));
  if (lang === 'en') {
    for (const french of ['À la recherche', 'Réseaux d’abord', 'Voir le périmètre', 'Premier hôte', 'Retour en haut', 'Fermer la fiche']) assert.ok(!html.includes(french), `Untranslated: ${french}`);
    assert.ok(html.includes('Networks first. Curiosity everywhere.'));
    assert.ok(html.includes('Close project notes'));
  }
}
assert.deepEqual(Object.keys(messages.fr).sort(), Object.keys(messages.en).sort(), 'Runtime translations must match');
for (const project of ['tfe','sql','java','infra']) assert.deepEqual(Object.keys(messages.fr[project]).sort(), Object.keys(messages.en[project]).sort());
console.log('Static checks passed: FR/EN, local assets, IDs, anchors, translations, metadata and no dummy links.');
