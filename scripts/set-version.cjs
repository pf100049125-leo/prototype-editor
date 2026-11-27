'use strict';
const fs = require('node:fs'), path = require('node:path');
function setVersion(version, root = path.resolve(__dirname, '..')) {
  if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) throw Error('Use a stable version such as 1.0.1');
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const pkg = JSON.parse(read('package.json')), lock = JSON.parse(read('package-lock.json'));
  const prior = pkg.version;
  pkg.version = version; lock.version = version; lock.packages[''].version = version;
  const updates = {
    'package.json': JSON.stringify(pkg, null, 2) + '\n',
    'package-lock.json': JSON.stringify(lock, null, 2) + '\n'
  };
  for (const [file, pattern, replacement] of [
    ['app/main.cjs', /title: 'PrototypeEditor [0-9.]+ · 原型编辑器'/g, "title: 'PrototypeEditor " + version + " · 原型编辑器'"],
    ['app/preload.cjs', /version: '[0-9.]+'/g, "version: '" + version + "'"],
    ['src/editor.template.html', /<title>PrototypeEditor [0-9.]+ · 原型编辑器<\/title>/g, '<title>PrototypeEditor ' + version + ' · 原型编辑器</title>']
  ]) {
    const source = read(file);
    if ([...source.matchAll(pattern)].length !== 1) throw Error('Cannot locate one version marker in ' + file);
    updates[file] = source.replace(pattern, replacement);
  }
  for (const [file, content] of Object.entries(updates)) fs.writeFileSync(path.join(root, file), content);
  return { from: prior, to: version, files: Object.keys(updates) };
}
module.exports = { setVersion };
if (require.main === module) {
  try { if (process.argv.length !== 3) throw Error('Usage: npm run version:set -- 1.0.1'); console.log(JSON.stringify(setVersion(process.argv[2]), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
