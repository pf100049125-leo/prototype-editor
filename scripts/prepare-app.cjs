'use strict';
const fs = require('node:fs');
require('./build.cjs').build();
// Electron 45 installs its runtime on demand. Resolve it before a directory
// build so building immediately after npm ci works without starting the UI.
try {
  const executable = require('electron');
  if (!fs.existsSync(executable)) throw Error('Electron executable is missing');
  console.log('Electron runtime is ready.');
} catch (error) {
  console.error('Unable to prepare the Electron runtime. Check the network and dependency installation.');
  console.error(error.message);
  process.exitCode = 1;
}
