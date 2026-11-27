'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const directory = path.join(root, '.qa/window-close-' + Date.now());
fs.mkdirSync(directory, { recursive: true });
const runtime = process.env.PROTOTYPE_EDITOR_TEST_ELECTRON || require('electron');
const environment = { ...process.env }; delete environment.ELECTRON_RUN_AS_NODE;
const scenarios = process.argv[2] ? [process.argv[2]] : ['untouched', 'discard', 'cancel-then-save'];
const reports = [];
for (const scenario of scenarios) {
  const reportPath = path.join(directory, scenario + '.json');
  const child = spawnSync(runtime, [path.join(__dirname, 'fixtures/window-close.cjs'), scenario, reportPath], {
    cwd: root, encoding: 'utf8', env: environment, timeout: 35000, windowsHide: true
  });
  const report = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, 'utf8')) : null;
  assert.equal(child.status, 0, report?.error || child.error?.message || child.stderr || child.stdout);
  assert(report?.ok && report.closed && report.quit, 'The editor must close and quit: ' + scenario);
  reports.push(report); console.log('PASS real Electron window close: ' + scenario);
}
fs.writeFileSync(path.join(root, '.qa/window-close-results.json'), JSON.stringify({ scenarios: reports }, null, 2) + '\n');
