'use strict';
// Runs inside a real Electron process with a disposable profile and hidden window.
const { app, dialog } = require('electron');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..'), scenario = process.argv[2], reportPath = process.argv[3];
const result = { scenario, prompts: [], closed: false, quit: false, ok: false };
let target, complete = false;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
app.commandLine.appendSwitch('user-data-dir', path.join(path.dirname(reportPath), scenario + '-profile'));
app.commandLine.appendSwitch('disable-gpu');
function write() { fs.writeFileSync(reportPath, JSON.stringify(result, null, 2) + '\n'); }
function fail(error) { if (complete) return; complete = true; result.error = error.stack || String(error); write(); app.exit(1); }
const watchdog = setTimeout(() => fail(Error('Window close regression timed out')), 25000);
dialog.showMessageBoxSync = (parent, options) => {
  assert.equal(parent, target);
  result.prompts.push(options);
  return scenario === 'discard' ? 1 : 0;
};
dialog.showErrorBox = (title, message) => fail(Error(title + ': ' + message));
app.on('will-quit', () => {
  if (complete) return;
  try {
    assert(result.closed, 'The window must close before the application quits');
    assert(result.readyToClose, 'The application quit before the scenario completed');
    assert.equal(result.prompts.length, scenario === 'discard' ? 1 : scenario === 'cancel-then-save' ? 2 : 0);
    result.quit = true; result.ok = true; complete = true; clearTimeout(watchdog); write();
  } catch (error) { fail(error); }
});
app.on('browser-window-created', (_event, win) => {
  target = win;
  win.show = () => {}; win.maximize = () => {};
  win.on('closed', () => { result.closed = true; });
  const evaluate = code => win.webContents.executeJavaScript(code, true);
  win.webContents.once('did-finish-load', async () => {
    try {
      for (let i = 0; ; i++) {
        if (await evaluate('typeof readyKey !== "undefined" && readyKey === curKey')) break;
        if (i === 100) throw Error('The editor did not finish loading');
        await delay(50);
      }
      assert.equal(await evaluate("snap(); signature() !== savedSignature"), false, 'An untouched project should be clean');
      if (scenario !== 'untouched') {
        assert.equal(await evaluate("const marker = doc().createElement('span'); marker.id = 'close-regression-marker'; marker.textContent = 'Unsaved close regression'; (doc().getElementById('sub_page_body') || doc().querySelector('.module-root')).append(marker); snap(); signature() !== savedSignature"), true);
      }
      if (scenario === 'cancel-then-save') {
        for (let attempt = 0; attempt < 2; attempt++) {
          win.close(); await delay(250);
          assert(!win.isDestroyed(), 'Cancel must keep the editor open');
          assert.equal(result.prompts.length, attempt + 1, 'Every blocked close needs a native confirmation');
          const options = result.prompts.at(-1);
          assert.equal(options.defaultId, 0); assert.equal(options.cancelId, 0);
          assert.deepEqual(options.buttons, ['继续编辑', '不保存并关闭']);
          assert(await evaluate("!!doc().getElementById('close-regression-marker') && signature() !== savedSignature"), 'Cancel must retain unsaved edits');
        }
        const savedPath = path.join(path.dirname(reportPath), 'saved-project.json');
        const saved = new Promise((resolve, reject) => {
          win.webContents.session.once('will-download', (_e, item) => {
            item.setSavePath(savedPath);
            item.once('done', (_done, state) => state === 'completed' ? resolve() : reject(Error('Project save failed: ' + state)));
          });
        });
        await evaluate("document.getElementById('oe-save').click()"); await saved;
        const data = JSON.parse(fs.readFileSync(savedPath, 'utf8'));
        assert.equal(data.format, 'original-prototype-editor');
        assert(Object.values(data.project.content).some(value => value.includes('close-regression-marker')));
        assert.equal(await evaluate('signature() !== savedSignature'), false);
        result.projectSaved = true;
      }
      const expectedPrompts = scenario === 'discard' ? 1 : scenario === 'cancel-then-save' ? 2 : 0;
      result.readyToClose = true;
      win.close();
      // This check runs before app quits, after the renderer beforeunload event.
      await delay(750);
      assert(win.isDestroyed(), 'The close request was silently blocked');
      assert.equal(result.prompts.length, expectedPrompts);
    } catch (error) { fail(error); }
  });
});
require(path.join(root, 'app/main.cjs'));
