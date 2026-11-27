'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { readProject } = require('../scripts/build.cjs');
const { importProject } = require('../scripts/import-project.cjs');
const root = path.join(__dirname, '../.qa/import-tests-' + Date.now());
fs.mkdirSync(root, { recursive: true });
const input = path.join(root, 'project.json'), project = readProject();
const data = { format: 'original-prototype-editor', version: 1, project, currentPage: project.pages[0].key };
fs.writeFileSync(input, JSON.stringify(data));
const first = importProject(input, root); assert.equal(first.pages, 29); assert.equal(first.backup, null);
const manifest = JSON.parse(fs.readFileSync(path.join(first.source, 'project.json'), 'utf8'));
assert.equal(manifest.project.editorStartKey, data.currentPage);
assert.equal(fs.readFileSync(path.join(first.source, manifest.files.theme), 'utf8'), project.theme);
assert.equal(fs.readFileSync(path.join(first.source, manifest.files.topNav), 'utf8'), project.topNav);
for (const field of ['content', 'typeStyles', 'shellByType']) for (const [key, value] of Object.entries(project[field])) assert.equal(fs.readFileSync(path.join(first.source, manifest.files[field][key]), 'utf8'), value);
assert.equal(fs.readFileSync(path.join(first.source, manifest.files.content['config-alarm-base']), 'utf8'), project.content['config-alarm-base']);
console.log('PASS project import retains all pages, shells and the requested starting page');
const changed = structuredClone(data); changed.project.content['config-alarm-base'] += '\n<!-- imported change -->'; fs.writeFileSync(input, JSON.stringify(changed));
const second = importProject(input, root); assert(second.backup);
assert.equal(fs.readFileSync(path.join(second.backup, 'pages/config-alarm-base.html'), 'utf8'), project.content['config-alarm-base']);
assert(fs.readFileSync(path.join(second.source, 'pages/config-alarm-base.html'), 'utf8').endsWith('<!-- imported change -->'));
console.log('PASS replacing source creates a recoverable backup before applying imported changes');
const before = fs.readFileSync(path.join(second.source, 'project.json'));
for (const bad of [{ format: 'wrong' }, { ...data, project: { ...project, content: { ...project.content, '../../outside': 'invalid' } } }]) {
  fs.writeFileSync(input, JSON.stringify(bad)); assert.throws(() => importProject(input, root));
  assert(fs.readFileSync(path.join(second.source, 'project.json')).equals(before));
}
console.log('PASS invalid formats and unsafe resource paths leave source files unchanged');
