'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { root, renderHtml, readProject } = require('./build.cjs');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pkg = JSON.parse(read('package.json')), lock = JSON.parse(read('package-lock.json'));
assert.equal(pkg.version, lock.version); assert.equal(pkg.version, lock.packages[''].version);
assert.deepEqual(pkg.devDependencies, lock.packages[''].devDependencies);
assert.equal(pkg.build.electronDist, 'node_modules/electron/dist', 'Use the project-local Electron dependency');
assert.equal(pkg.build.directories.output, 'dist');
for (const file of ['app/main.cjs', 'app/preload.cjs', 'app/png-files.cjs', 'src/editor.js', 'src/io-alarm.js', 'src/image-export.js', 'src/toolbar.js', 'src/startup.js', 'scripts/import-project.cjs']) new vm.Script(read(file), { filename: file });
const project = readProject();
assert(Array.isArray(project.pages) && project.pages.length > 0);
const keys = new Set(), urls = new Set();
for (const page of project.pages) {
  assert(!keys.has(page.key), 'Duplicate page key: ' + page.key); keys.add(page.key);
  assert(!urls.has(page.url), 'Duplicate page URL: ' + page.url); urls.add(page.url);
  assert.equal(typeof project.content[page.key], 'string', 'Missing page content: ' + page.key);
  if (['config', 'maintenance'].includes(page.type)) assert.equal(typeof project.shellByType[page.type], 'string');
}
assert(keys.has(project.editorStartKey));
assert(project.content['config-alarm-base'].includes('data-io-alarm-version'));
const html = renderHtml(); let scripts = 0;
for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
  if (match[1].trim()) { new vm.Script(match[1], { filename: 'generated-script-' + scripts }); scripts++; }
}
assert.equal(scripts, 6);
const main = read('app/main.cjs');
assert(main.includes('contextIsolation: true')); assert(main.includes('sandbox: true')); assert(main.includes('nodeIntegration: false'));
assert(fs.existsSync(path.join(root, 'app/icon.ico')));
assert(fs.existsSync(path.join(root, 'licenses/html2canvas-MIT.txt')));
console.log(JSON.stringify({ ok: true, version: pkg.version, pages: project.pages.length, inlineScripts: scripts, sourceSyntax: 'passed', localCachePathRequired: false }, null, 2));
