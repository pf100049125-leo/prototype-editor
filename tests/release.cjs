'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), { spawnSync } = require('node:child_process');
const { setVersion } = require('../scripts/set-version.cjs');
const { verifyRelease } = require('../scripts/verify-release.cjs');
const source = path.resolve(__dirname, '..'), root = path.join(source, '.qa/release-tests-' + Date.now());
for (const file of ['package.json', 'package-lock.json', 'app/main.cjs', 'app/preload.cjs', 'src/editor.template.html']) {
  const target = path.join(root, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(path.join(source, file), target);
}
function git(...args) { const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' }); if (result.error || result.status) throw Error(result.stderr || result.error?.message); }
const initial = JSON.parse(fs.readFileSync(path.join(root, 'package.json'))).version;
const parts = initial.split('.').map(Number), next = parts[0] + '.' + parts[1] + '.' + (parts[2] + 1);
setVersion(next, root);
assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'))).packages[''].version, next);
assert(fs.readFileSync(path.join(root, 'app/preload.cjs'), 'utf8').includes("version: '" + next + "'"));
assert.throws(() => setVersion('3.0.2;unexpected', root));
console.log('PASS version updates synchronize package, lock, main, preload and renderer');
git('init', '-b', 'main'); git('add', '.');
git('-c', 'user.name=Release test fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-m', 'test fixture');
git('update-ref', 'refs/remotes/origin/main', 'HEAD');
assert.equal(verifyRelease('v' + next, root).mainHistory, true);
assert.throws(() => verifyRelease('v' + initial, root));
console.log('PASS release tags must match all application version markers');
git('switch', '-c', 'feature/unmerged'); fs.writeFileSync(path.join(root, 'feature.txt'), 'unmerged'); git('add', '.');
git('-c', 'user.name=Release test fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-m', 'unmerged fixture');
assert.throws(() => verifyRelease('v' + next, root), /origin\/main/);
console.log('PASS unmerged feature branch commits cannot create a stable release');
