'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
fs.mkdirSync(path.join(root, '.qa'), { recursive: true });
for (const test of ['tests/release.cjs', 'tests/import-project.cjs', 'tests/desktop.cjs', 'tests/io-alarm.cjs']) {
  const result = spawnSync(process.execPath, [path.join(root, test)], { cwd: root, stdio: 'inherit', env: process.env });
  if (result.error) { console.error(result.error.message); process.exit(1); }
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log('All tests passed. Reports: .qa/');
