'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const { open, pause, errors, blobs } = require('./harness.cjs');
const file = path.resolve(__dirname, '../app/index.html');
const html = fs.readFileSync(file, 'utf8');
const fixtures=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/io-alarm.json'),'utf8'));
const read=name=>fixtures[name];
function embedded(text) { return JSON.parse(text.split('const PROJECT=')[1].split(';</script>')[0]); }
const checks = [];
async function check(name, fn) { await fn(); checks.push(name); console.log('PASS', name); }
(async () => {
  const app = open(html), w = app.window;
  const q = s => w.document.querySelector(s), d = () => q('#frame').contentDocument;
  const click = element => element.click();
  const row = index => d().querySelector('#base_alarm_io tbody tr[data-value="' + index + '"]');
  const main = (index, key) => row(index).querySelector('[data-param="IOP-' + index + '-' + key + '"]');
  const choose = (x, value) => click(x.closest('.lavaui-combo-container').querySelector('.list-group-item[data-value="' + value + '"]'));
  const modal = kind => d().getElementById(kind === 'trigger' ? 'io_alarm_trigger_modal' : 'io_alarm_linkage_modal');
  const setup = (index, kind) => click(row(index).querySelector('button[name="' + kind + '"]'));
  const close = (kind, accept = false) => click(modal(kind).querySelector('[data-io-close="' + (accept ? 'ok' : 'cancel') + '"]'));
  const keyField = (kind, key) => [...modal(kind).querySelectorAll('[data-io-key]')].find(x => x.dataset.ioKey === key);
  const detail = i => JSON.parse(row(i).querySelector('[data-io-details]').value);
  function visible(x, scope) { for (let n = x; n && n !== scope; n = n.parentElement) if (n.style.display === 'none' || n.hidden) return false; return true; }
  function referenceKeys(ref) { return ref.expected; }
  await pause();
  await check('all 29 built-in page bodies preserve the release baseline',()=>{const expected=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/baseline.json'),'utf8')),project=embedded(html),crypto=require('node:crypto');assert.equal(project.pages.length,expected.pages);for(const [key,hash] of Object.entries(expected.contentSHA256))assert.equal(crypto.createHash('sha256').update(project.content[key]).digest('hex'),hash,key);});
  q('#bp').click(); await pause();
  await check('nine sensors reproduce imported values and enable/disable states', () => {
    assert.equal(d().querySelectorAll('#base_alarm_io tbody tr').length, 9);
    for (const state of read('reference-base.json').controls.filter(x => x.param?.startsWith('IOP-'))) {
      const x = d().querySelector('[data-param="' + state.param + '"]');
      assert.equal(x.value, state.value); assert.equal(x.checked, state.checked); assert.equal(x.disabled, state.disabled);
    }
    assert.equal(row(0).querySelectorAll('.alarm-type:nth-child(5) .list-group-item').length, 21);
    assert.equal(row(8).querySelectorAll('.alarm-type:nth-child(5) .list-group-item').length, 2);
  });
  await check('all 21 common Uses reproduce each observed Trigger and Linkage field/disable rule', () => {
    for (const entry of read('use-inspection.json')) {
      choose(main(0, 'UT'), entry.use.value);
      for (const kind of ['trigger', 'link']) {
        setup(0, kind);
        assert.equal(modal(kind).style.display, 'block', entry.use.text + ' ' + kind);
        const reference = read('use-' + entry.use.value + '-' + kind + '.json');
        const expected = referenceKeys(reference).map(x => ({ key: x.key, disabled: x.disabled })).sort((a, b) => a.key.localeCompare(b.key));
        const actual = [...modal(kind).querySelectorAll('input[data-io-key]')].filter(x => visible(x, modal(kind))).map(x => ({ key: x.dataset.ioKey, disabled: x.disabled })).sort((a, b) => a.key.localeCompare(b.key));
        assert.deepEqual(actual, expected, entry.use.text + ' ' + kind);
        close(kind);
      }
    }
    choose(main(0, 'UT'), '8');
  });
  await check('Sensor9 supports Astern and returns to disabled without affecting other sensors', () => {
    main(8, 'EN').click(); choose(main(8, 'UT'), '24'); setup(8, 'trigger');
    assert.equal(modal('trigger').querySelector('.modal-title').textContent, 'Sensor9 Trigger'); close('trigger');
    setup(8, 'link'); assert.equal(modal('link').querySelector('[data-param="AR-CH"]').querySelectorAll('input').length, 25); close('link');
    choose(main(8, 'UT'), '0'); main(8, 'EN').click(); assert(row(8).querySelector('button[name="trigger"]').disabled); assert(!main(0, 'N').disabled);
  });
  await check('Trigger OK persists only that sensor; Cancel and invalid numbers commit nothing', () => {
    const other = JSON.stringify(detail(1));
    setup(0, 'trigger'); keyField('trigger', 'SDT').value = '7'; close('trigger', true);
    assert.equal(detail(0).trigger.SDT.v, '7'); assert.equal(JSON.stringify(detail(1)), other);
    setup(0, 'trigger'); assert.equal(keyField('trigger', 'SDT').value, '7'); keyField('trigger', 'SDT').value = '9'; close('trigger');
    setup(0, 'trigger'); assert.equal(keyField('trigger', 'SDT').value, '7'); keyField('trigger', 'SDT').value = '11'; close('trigger', true);
    assert.equal(modal('trigger').style.display, 'block'); assert(modal('trigger').querySelector('[data-io-error]').textContent.includes('0～10')); assert.equal(detail(0).trigger.SDT.v, '7'); close('trigger');
    choose(main(0, 'UT'), '23'); setup(0, 'trigger'); d().getElementById('CCMDuration').value = '8'; close('trigger', true);
    choose(main(0, 'UT'), '26'); setup(0, 'trigger'); d().getElementById('delayTime').value = '123'; close('trigger', true);
    choose(main(0, 'UT'), '23'); setup(0, 'trigger'); assert.equal(d().getElementById('CCMDuration').value, '8'); close('trigger');
    choose(main(0, 'UT'), '8');
  });
  await check('channel/output choices enable exactly the observed dependent fields', () => {
    setup(0, 'link'); assert(keyField('link', 'AR-D').disabled); assert(keyField('link', 'AR-L').disabled); assert(keyField('link', 'PS-T').disabled);
    keyField('link', 'AR-CH.0').click(); assert(!keyField('link', 'AR-D').disabled); assert(!keyField('link', 'AR-L').disabled); assert(keyField('link', 'AR-P').disabled);
    keyField('link', 'PS-ID.0').click(); assert(!keyField('link', 'PS-T').disabled);
    keyField('link', 'AR-D').value = '180'; keyField('link', 'PS-T').value = '15'; close('link', true);
    setup(0, 'link'); assert.equal(keyField('link', 'AR-D').value, '180'); assert(keyField('link', 'AR-CH.0').checked); close('link');
    setup(1, 'link'); assert(!keyField('link', 'AR-CH.0').checked); close('link');
  });
  await check('five screen modes reproduce their actual layouts and channel selections remain independent', () => {
    setup(0, 'link');
    for (let mode = 0; mode <= 4; mode++) {
      choose(keyField('link', 'SM'), String(mode));
      const expected = read('screen-' + mode + '.json');
      assert.equal(modal('link').querySelectorAll('#screen_layout input').length, expected.layoutInputs);
      assert.equal(visible(keyField('link', 'ST'), modal('link')), mode > 0);
    }
    choose(keyField('link', 'layout.0'), '24'); choose(keyField('link', 'SM'), '1'); choose(keyField('link', 'SM'), '4');
    assert.equal(keyField('link', 'layout.0').value, 'Channel 25'); close('link', true);
    setup(0, 'link'); assert.equal(keyField('link', 'layout.0').value, 'Channel 25'); close('link');
  });
  await check('help uses copied text and dismissing it does not close or commit the configuration', () => {
    setup(0, 'trigger'); modal('trigger').querySelector('[data-io-help="effective-time"]').click();
    assert(d().querySelector('[data-io-help-dialog]').textContent.includes('Reduce unnecessary alarm notice'));
    d().querySelector('[data-io-help-dismiss]').click(); assert(!d().querySelector('[data-io-help-dialog]')); assert.equal(modal('trigger').style.display, 'block'); close('trigger');
  });
  await check('Default resets only IO Alarm; Save restores all sensor detail states across navigation', async () => {
    const save = [...d().querySelectorAll('#div_save_default button')].find(x => x.textContent.trim() === 'Save');
    save.click(); const state = JSON.stringify(detail(0));
    w.eval("goPage('config-network')"); await pause(); assert.equal(w.eval('curKey'), 'config-network'); w.eval("goPage('config-alarm-base')"); await pause();
    assert.equal(JSON.stringify(detail(0)), state);
    const baseline = JSON.parse(d().querySelector('#base_alarm_io').dataset.ioDefaults);
    [...d().querySelectorAll('#div_save_default button')].find(x => x.textContent.trim() === 'Default').click();
    assert.deepEqual(detail(0), baseline[0].details); assert.equal(main(0, 'N').value, 'Sensor1');
    // Reset does not silently overwrite the last explicitly saved configuration.
    q('#bd').click(); await pause(); q('#bp').click(); await pause(); assert.equal(JSON.stringify(detail(0)), state);
  });
  await check('copy preserves identity, clones details, excludes self, and never creates invalid Sensor9 uses', () => {
    const copy = d().querySelector('#base_alarm_io #copy_to');
    choose(copy.querySelector('[name="to"]'), '1'); copy.querySelector('button').click();
    assert.equal(main(1, 'N').value, 'Sensor2'); assert.equal(main(1, 'S').value, 'S2'); assert.deepEqual(detail(1), detail(0));
    setup(1, 'trigger'); keyField('trigger', 'SDT').value = '4'; close('trigger', true); assert.equal(detail(0).trigger.SDT.v, '7');
    choose(copy.querySelector('[name="from"]'), '1'); assert(!copy.querySelector('.lavaui-combo-container:has(input[name="to"]) .list-group-item[data-value="1"]'));
    choose(copy.querySelector('[name="to"]'), '8'); copy.querySelector('button').click(); assert.equal(main(8, 'UT').value, 'None');
  });
  await check('exported HTML carries IO runtime and works after navigating away and back', async () => {
    q('#bd').click(); await pause(); const exported = w.eval('buildExport()');
    fs.writeFileSync(path.join(__dirname, '../.qa/exported-test.html'), exported);
    const out = open(exported); await pause(); const ow = out.window, od = ow.document;
    od.querySelector('#base_alarm_io button[name="trigger"]').click(); assert.equal(od.getElementById('io_alarm_trigger_modal').style.display, 'block');
    od.querySelector('#io_alarm_trigger_modal [data-io-close="cancel"]').click();
    ow.eval("render('config-network')"); assert(!od.querySelector('#base_alarm_io')); ow.eval("render('config-alarm-base')");
    od.querySelector('#base_alarm_io button[name="trigger"]').click(); assert.equal(od.getElementById('io_alarm_trigger_modal').style.display, 'block'); out.window.close();
  });
  await check('saving editable HTML retains the new page and runtime', async () => {
    q('#oe-save-html').click(); const saved = await blobs.at(-1).text(); const other = open(saved); await pause(); other.window.document.querySelector('#bp').click(); await pause();
    const frame = other.window.document.querySelector('#frame').contentDocument; frame.querySelector('#base_alarm_io button[name="trigger"]').click(); assert.equal(frame.getElementById('io_alarm_trigger_modal').style.display, 'block'); other.window.close();
  });
  await check('IO enable rules preserve user-edited font colors', async () => {
    main(0, 'N').style.color = '#ff0000'; w.eval('snap()'); q('#bp').click(); await pause();
    assert.equal(main(0, 'N').style.color, 'rgb(255, 0, 0)'); main(0, 'EN').click(); main(0, 'EN').click();
    assert.equal(main(0, 'N').style.color, 'rgb(255, 0, 0)');
  });
  await check('no renderer errors',()=>assert.deepEqual(errors,[]));
  app.window.close();
  fs.writeFileSync(path.join(__dirname, '../.qa/io-alarm-results.json'), JSON.stringify({ checks, errors }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
