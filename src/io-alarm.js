// Local prototype behavior only. No connection or writes to the reference device.
function wireIoAlarm(d, options) {
  d.__oeIoOptions = options || {};
  const opts = () => d.__oeIoOptions || {};
  const root = () => d.querySelector('#base_alarm_io[data-io-alarm-version]');
  if (!root() || opts().design) return;
  if (d.__oeIoWired) { d.__oeIoRestore?.(); return; }
  d.__oeIoWired = true;
  let context = null;
  const clone = x => JSON.parse(JSON.stringify(x));
  const rows = () => [...(root()?.querySelectorAll('tbody>tr') || [])];
  const defaults = () => JSON.parse(root().dataset.ioDefaults);
  const field = (row, suffix) => row.querySelector('input[data-param$="-' + suffix + '"]');
  const optionValue = x => x?.closest('.lavaui-combo-container')?.querySelector('.list-group-item.active')?.dataset.value;
  function read(x) { return { v: x.value, c: x.checked, option: optionValue(x) }; }
  function write(x, value) {
    if (!x || !value) return;
    x.value = value.v ?? '';
    if (x.type === 'checkbox') x.checked = !!value.c;
    x.closest('.lavaui-combo-container')?.querySelectorAll('.list-group-item').forEach(a => a.classList.toggle('active', value.option != null ? a.dataset.value === value.option : a.textContent.trim() === x.value));
  }
  function details(row) {
    try { return JSON.parse(row.querySelector('[data-io-details]').value); }
    catch (_) { return clone(defaults()[+row.dataset.value].details); }
  }
  function writeDetails(row, data) {
    const hidden = row.querySelector('[data-io-details]');
    hidden.value = JSON.stringify(data); hidden.setAttribute('value', hidden.value);
  }
  function mainState(row) { return Object.fromEntries([...row.querySelectorAll('input[data-param]')].map(x => [x.dataset.param.split('-').pop(), read(x)])); }
  function captureRows() { return rows().map(row => ({ main: mainState(row), details: details(row) })); }
  function disable(x, disabled) {
    if (!x) return;
    if (x.style.color && x.style.color !== 'gray' && x.style.color !== 'rgb(128, 128, 128)') x.dataset.ioActiveColor = x.style.color;
    x.disabled = disabled; x.style.color = disabled ? 'gray' : (x.dataset.ioActiveColor || 'rgb(255, 255, 255)');
    if (disabled) x.closest('.lavaui-combo-container')?.querySelector('.lavaui-combo-panel')?.classList.remove('is-open');
  }
  function refreshRow(row) {
    const enabled = field(row, 'EN').checked;
    row.querySelectorAll('input:not([data-io-details]),button').forEach(x => { if (x !== field(row, 'EN')) disable(x, !enabled); });
  }
  function writeRows(values) {
    rows().forEach((row, i) => {
      const value = values[i]; if (!value?.main || !value.details) return;
      for (const [key, state] of Object.entries(value.main)) write(field(row, key), state);
      writeDetails(row, clone(value.details)); refreshRow(row);
    });
    refreshCopy();
  }
  const storageKey = () => 'prototype-editor-io-alarm-v1:' + (opts().projectId || 'exported-prototype') + ':' + (opts().pageKey || 'config-alarm-base');
  function restore() {
    if (!root() || opts().design) return;
    context = null;
    if (opts().restore !== false) {
      try { const saved = JSON.parse((opts().storage || d.defaultView.localStorage).getItem(storageKey()) || 'null'); if (Array.isArray(saved) && saved.length === rows().length) writeRows(saved); } catch (_) {}
    }
    rows().forEach(refreshRow); refreshCopy();
  }
  d.__oeIoRestore = restore;
  function message(text, error = false) {
    let node = d.querySelector('[data-io-feedback]');
    if (!node) { node = d.createElement('div'); node.dataset.ioFeedback = ''; node.setAttribute('role', 'status'); node.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:25000;background:#0c161d;color:white;padding:10px 16px;border:1px solid #09c;max-width:420px;'; d.body.append(node); }
    node.textContent = text; node.style.borderColor = error ? '#e65b5b' : '#09c';
    clearTimeout(d.__oeIoMessageTimer); d.__oeIoMessageTimer = setTimeout(() => node.remove(), 4500);
  }
  function refreshCopy() {
    const box = root()?.querySelector('#copy_to'); if (!box) return;
    const from = box.querySelector('input[name="from"]');
    const to = box.querySelector('input[name="to"]');
    const source = optionValue(from) || '0';
    const panel = to.closest('.lavaui-combo-container').querySelector('.lavaui-combo-panel');
    const selected = optionValue(to) || '-1';
    panel.replaceChildren();
    for (const item of [{ value: '-1', text: 'All' }, ...rows().filter(row => row.dataset.value !== source).map(row => ({ value: row.dataset.value, text: field(row, 'N').value }))]) {
      const a = d.createElement('a'); a.href = 'javascript:;'; a.className = 'list-group-item'; a.dataset.value = item.value; a.textContent = item.text; a.classList.toggle('active', item.value === selected); panel.append(a);
    }
    let active = panel.querySelector('.active'); if (!active) { active = panel.firstElementChild; active.classList.add('active'); }
    to.value = active.textContent;
  }
  function showPart(modal, selector, visible) { const el = modal.querySelector(selector); if (el) el.style.display = visible ? 'block' : 'none'; }
  function modalStates(modal) { return Object.fromEntries([...modal.querySelectorAll('input[data-io-key]')].map(x => [x.dataset.ioKey, read(x)])); }
  function writeModal(modal, data) { modal.querySelectorAll('input[data-io-key]').forEach(x => write(x, data[x.dataset.ioKey])); }
  function refreshTrigger(modal) {
    const use = optionValue(field(context.row, 'UT')) || '0';
    showPart(modal, '#io_alarm', !['23', '26'].includes(use));
    showPart(modal, '#ccm_alarm', use === '23');
    showPart(modal, '#forget_alarm', use === '26');
    showPart(modal, '#stop_alarm', use === '32');
    showPart(modal, '#alarm_duration_time_div', use === '1');
    const source = modal.querySelector('[data-param="TM"]');
    if (use === '1') write(source, { v: 'Source Voltage', option: '0' });
    disable(source, use === '1');
    disable(modal.querySelector('#ignitionDelay1'), true); disable(modal.querySelector('#ignitionDelay2'), true);
  }
  function refreshLink(modal) {
    const use = optionValue(field(context.row, 'UT')) || '0';
    showPart(modal, '#iolinkageout', use !== '23'); showPart(modal, '#linkageouttime', use !== '23');
    const recording = [...modal.querySelectorAll('[data-param="AR-CH"] input')].some(x => x.checked);
    // Pre-recording is read-only in the reference, even with a channel selected.
    disable(modal.querySelector('[data-param="AR-P"]'), true);
    for (const key of ['AR-D', 'AR-L']) disable(modal.querySelector('[data-param="' + key + '"]'), !recording);
    const output = [...modal.querySelectorAll('[data-param="PS-ID"] input')].some(x => x.checked);
    disable(modal.querySelector('[data-param="PS-T"]'), !output);
    const mode = optionValue(modal.querySelector('[data-param="SM"]')) || '0';
    modal.querySelectorAll('[name="linkage-screen-show"]').forEach(x => x.style.display = mode === '0' ? 'none' : 'block');
    let layout = modal.querySelector('#screen_layout');
    if (layout && layout.dataset.ioMode !== mode) {
      Object.assign(context.draft, modalStates(modal));
      const template = root().querySelector('template[data-io-layout="' + mode + '"]');
      if (template) {
        const replacement = template.content.firstElementChild.cloneNode(true);
        replacement.dataset.ioMode = mode; layout.replaceWith(replacement); layout = replacement;
        writeModal(modal, context.draft);
        if (typeof ids === 'function') ids(d);
      } else { layout.replaceChildren(); layout.dataset.ioMode = mode; }
    }
  }
  function openModal(row, kind, button) {
    if (button.disabled) return;
    const modal = d.getElementById(kind === 'trigger' ? 'io_alarm_trigger_modal' : 'io_alarm_linkage_modal');
    const data = details(row);
    context = { row, kind, modal, draft: clone(data[kind]), focus: button };
    writeModal(modal, context.draft);
    modal.querySelector('.modal-title').textContent = field(row, 'N').value + (kind === 'trigger' ? ' Trigger' : ' Alarm Linkage');
    const error = modal.querySelector('[data-io-error]'); if (error) error.textContent = '';
    if (kind === 'trigger') refreshTrigger(modal);
    else {
      const layout = modal.querySelector('#screen_layout'); if (layout) { layout.replaceChildren(); layout.removeAttribute('data-io-mode'); }
      refreshLink(modal);
    }
    modal.style.display = 'block'; modal.classList.add('in');
  }
  function isVisible(x, scope) { for (let node = x; node && node !== scope; node = node.parentElement) if (node.hidden || node.style.display === 'none') return false; return true; }
  function valid(modal) {
    for (const x of modal.querySelectorAll('input[data-io-min]')) {
      if (x.disabled || !isVisible(x, modal)) continue;
      const value = x.value.trim(), min = Number(x.dataset.ioMin), max = Number(x.dataset.ioMax);
      if (!/^\d+$/.test(value) || Number(value) < min || Number(value) > max) {
        const message = '请输入 ' + min + '～' + max + ' 范围内的整数';
        modal.querySelector('[data-io-error]').textContent = message;
        x.focus(); return false;
      }
    }
    return true;
  }
  function closeModal(accept) {
    if (!context) return;
    const { modal, row, kind, focus } = context;
    if (accept) {
      if (!valid(modal)) return;
      Object.assign(context.draft, modalStates(modal));
      const data = details(row); data[kind] = clone(context.draft); writeDetails(row, data);
    }
    modal.style.display = 'none'; modal.querySelectorAll('.lavaui-combo-panel').forEach(x => x.classList.remove('is-open'));
    context = null; focus?.focus();
  }
  function chooseOption(a) {
    const box = a.closest('.lavaui-combo-container'), input = box.querySelector('input');
    if (input.disabled) return;
    box.querySelectorAll('.list-group-item').forEach(x => x.classList.toggle('active', x === a)); input.value = a.textContent.trim();
    box.querySelector('.lavaui-combo-panel').classList.remove('is-open');
    if (context && context.modal.contains(a)) { Object.assign(context.draft, modalStates(context.modal)); if (context.kind === 'trigger') refreshTrigger(context.modal); else refreshLink(context.modal); }
    if (input.name === 'from' && root().contains(input)) refreshCopy();
    input.dispatchEvent(new d.defaultView.Event('change', { bubbles: true }));
  }
  function copyConfiguration() {
    const box = root().querySelector('#copy_to');
    const from = Number(optionValue(box.querySelector('[name="from"]')) || 0);
    const to = optionValue(box.querySelector('[name="to"]')) || '-1';
    const source = rows()[from], values = captureRows()[from];
    const targets = rows().filter(row => row !== source && (to === '-1' || row.dataset.value === to));
    let copied = 0, skipped = 0;
    for (const row of targets) {
      const use = values.main.UT.option;
      // Sensor9 has a different set of allowed uses; never insert an invalid option.
      const allowed = row.querySelector('.lavaui-combo-container:has(input[data-param$="-UT"]) .list-group-item[data-value="' + use + '"]');
      if (!allowed) { skipped++; continue; }
      for (const key of ['EN', 'AS', 'UT']) write(field(row, key), values.main[key]);
      writeDetails(row, clone(values.details)); refreshRow(row); copied++;
    }
    message('已复制到 ' + copied + ' 路 Sensor（保留各路名称和 OSD）' + (skipped ? '；Sensor9 用途不兼容，已跳过' : '') + '，点击 Save 后保存到本地原型');
  }
  restore();
  d.addEventListener('click', e => {
    if (opts().design || !root()) return;
    const target = e.target;
    const helpClose = target.closest('[data-io-help-dismiss]');
    if (helpClose) { e.preventDefault(); e.stopImmediatePropagation(); helpClose.closest('[data-io-help-dialog]').remove(); return; }
    const help = target.closest('[data-io-help]');
    if (help && context?.modal.contains(help)) {
      e.preventDefault(); e.stopImmediatePropagation(); const template = root().querySelector('template[data-io-help-template="' + help.dataset.ioHelp + '"]');
      if (template) d.body.append(template.content.firstElementChild.cloneNode(true)); return;
    }
    const close = target.closest('[data-io-close]');
    if (close && context?.modal.contains(close)) { e.preventDefault(); e.stopImmediatePropagation(); closeModal(close.dataset.ioClose === 'ok'); return; }
    const option = target.closest('.lavaui-combo-panel .list-group-item');
    if (option && (root().contains(option) || context?.modal.contains(option))) { e.preventDefault(); e.stopImmediatePropagation(); chooseOption(option); return; }
    const setup = target.closest('#base_alarm_io button[name="trigger"],#base_alarm_io button[name="link"]');
    if (setup && !setup.disabled) { e.preventDefault(); e.stopImmediatePropagation(); openModal(setup.closest('tr'), setup.name, setup); return; }
    if (target.closest('#base_alarm_io #copy_to button')) { e.preventDefault(); e.stopImmediatePropagation(); copyConfiguration(); return; }
    const action = target.closest('#div_save_default button');
    if (action && root().classList.contains('active')) {
      const text = action.textContent.trim().toLowerCase();
      if (!['save', 'default'].includes(text)) return;
      e.preventDefault(); e.stopImmediatePropagation();
      if (text === 'default') { writeRows(clone(defaults())); message('已恢复 IO Alarm 的导入默认值，点击 Save 后保存到本地原型'); return; }
      try { (opts().storage || d.defaultView.localStorage).setItem(storageKey(), JSON.stringify(captureRows())); message('已保存 IO Alarm 全部 Sensor 配置到本地原型'); }
      catch (_) { message('保存失败：本地存储不可用，请保存工程备份', true); }
      return;
    }
  }, true);
  d.addEventListener('change', e => {
    if (opts().design || !root()) return;
    const row = e.target.closest('#base_alarm_io tbody>tr');
    if (row && e.target === field(row, 'EN')) refreshRow(row);
    if (context?.modal.contains(e.target)) { Object.assign(context.draft, modalStates(context.modal)); if (context.kind === 'link') refreshLink(context.modal); }
  }, true);
  d.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const help = d.querySelector('[data-io-help-dialog]');
    if (help) { e.preventDefault(); help.remove(); }
    else if (context) { e.preventDefault(); closeModal(false); }
  }, true);
}
