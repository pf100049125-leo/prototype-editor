'use strict';
const fs = require('node:fs'), path = require('node:path');
const { spawnSync } = require('node:child_process');
function verifyRelease(tag, root = path.resolve(__dirname, '..')) {
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const pkg = JSON.parse(read('package.json')), lock = JSON.parse(read('package-lock.json'));
  if (!/^v\d+\.\d+\.\d+$/.test(tag || '') || tag !== 'v' + pkg.version) throw Error('Release tag must equal v' + pkg.version);
  if (lock.version !== pkg.version || lock.packages[''].version !== pkg.version) throw Error('Package and lock versions differ');
  for (const [file, expected] of [
    ['app/main.cjs', "title: 'PrototypeEditor " + pkg.version + " · 原型编辑器'"],
    ['app/preload.cjs', "version: '" + pkg.version + "'"],
    ['src/editor.template.html', '<title>PrototypeEditor ' + pkg.version + ' · 原型编辑器</title>']
  ]) if (!read(file).includes(expected)) throw Error('Version mismatch in ' + file + '; use npm run version:set');
  const git = spawnSync('git', ['merge-base', '--is-ancestor', 'HEAD', 'refs/remotes/origin/main'], { cwd: root, encoding: 'utf8' });
  if (git.error || git.status !== 0) throw Error('Release commit must be part of origin/main. Merge the reviewed PR first; checkout must fetch the full history.');
  return { tag, version: pkg.version, mainHistory: true };
}
module.exports = { verifyRelease };
if (require.main === module) {
  try { console.log(JSON.stringify(verifyRelease(process.argv[2] || process.env.RELEASE_TAG), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
