'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function read(relative) { return fs.readFileSync(path.join(root, relative), 'utf8'); }
function readProject() {
  const definition = JSON.parse(read('src/prototype/project.json'));
  const base = path.join(root, 'src/prototype');
  function resource(relative) {
    const file = path.resolve(base, relative);
    if (!file.startsWith(base + path.sep)) throw Error('Prototype file must stay inside src/prototype: ' + relative);
    return fs.readFileSync(file, 'utf8');
  }
  const map = paths => Object.fromEntries(Object.entries(paths).map(([key, file]) => [key, resource(file)]));
  const files = definition.files;
  const values = { ...definition.project, theme: resource(files.theme), typeStyles: map(files.typeStyles),
    topNav: resource(files.topNav), shellByType: map(files.shellByType), content: map(files.content) };
  const keys = [...new Set([...definition.order, ...Object.keys(values)])];
  return Object.fromEntries(keys.map(key => [key, values[key]]));
}
function renderHtml() {
  const safeJson = JSON.stringify(readProject()).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  let editor = read('src/editor.js');
  const ioMarker = '/*__IO_ALARM_RUNTIME__*/';
  if (editor.split(ioMarker).length !== 2) throw Error('Expected one IO Alarm runtime marker');
  editor = editor.replace(ioMarker, () => read('src/io-alarm.js'));
  const parts = { PROJECT: 'const PROJECT=' + safeJson + ';', EDITOR: editor,
    VENDOR: read('vendor/html2canvas-1.4.1.min.js'), IMAGE_EXPORT: read('src/image-export.js'),
    TOOLBAR: read('src/toolbar.js'), STARTUP: read('src/startup.js') };
  let html = read('src/editor.template.html');
  for (const [key, content] of Object.entries(parts)) {
    const marker = '@@' + key + '@@';
    if (html.split(marker).length !== 2) throw Error('Expected one template marker: ' + marker);
    html = html.replace(marker, () => content);
  }
  return html;
}
function build() {
  const html = renderHtml();
  fs.mkdirSync(path.join(root, 'app'), { recursive: true });
  fs.writeFileSync(path.join(root, 'app/index.html'), html);
  console.log('Built app/index.html (' + Buffer.byteLength(html) + ' bytes)');
  return html;
}
module.exports = { root, readProject, renderHtml, build };
if (require.main === module) build();
