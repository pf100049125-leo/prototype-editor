'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { pipeline } = require('node:stream/promises');
(async () => {
  const root = path.resolve(__dirname, '..'), version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'))).version;
  const filename = 'PrototypeEditor-' + version + '-portable.exe', file = path.join(root, 'dist', filename);
  if (!fs.statSync(file).size) throw Error('Portable EXE is empty');
  const hash = crypto.createHash('sha256'); await pipeline(fs.createReadStream(file), hash);
  fs.writeFileSync(path.join(root, 'dist/SHA256SUMS.txt'), hash.digest('hex') + '  ' + filename + '\n');
  console.log('Prepared portable EXE checksum for ' + version);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
