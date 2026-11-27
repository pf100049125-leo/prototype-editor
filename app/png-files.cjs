'use strict';
function safePngName(name) {
  const clean = String(name || '原型页面').replace(/\.png$/i, '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/[. ]+$/g, '').trim().slice(0, 110) || '原型页面';
  return (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(clean) ? '原型_' + clean : clean) + '.png';
}
function validatePng(bytes) {
  if (!(bytes instanceof Uint8Array) && !(bytes instanceof ArrayBuffer)) throw Error('无效的 PNG 数据');
  const data = Buffer.from(bytes);
  if (data.length < 33 || data.length > 96 * 1024 * 1024 || !data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || data.toString('ascii', 12, 16) !== 'IHDR') throw Error('无效的 PNG 数据');
  const width = data.readUInt32BE(16), height = data.readUInt32BE(20);
  if (!width || !height || width > 16384 || height > 16384 || width * height > 24000000) throw Error('PNG 图片尺寸超出范围');
  return data;
}
module.exports = { safePngName, validatePng };
