import { zipSync, strToU8 } from 'fflate';
/* eslint-disable no-control-regex -- Intentionally remove control characters from CSV/XML output. */
type Cell = string | number | null | undefined;
export function csvCell(value: Cell) {
  let text = String(value ?? '').replace(/[\r\n\t\u0000-\u001f]/g, ' ');
  if (/^\s*[=+\-@]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
export function makeCsv(rows: Cell[][]) { return '\uFEFF' + rows.map(row => row.map(csvCell).join(';')).join('\r\n'); }
function xml(value: string) { return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function column(index: number) { let result = ''; for (index++; index > 0; index = Math.floor((index - 1) / 26)) result = String.fromCharCode(65 + (index - 1) % 26) + result; return result; }
export function makeXlsx(sheets: { name: string; rows: Cell[][] }[]) {
  const ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const rel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const pkg = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const files: Record<string, Uint8Array> = {};
  files['[Content_Types].xml'] = strToU8(`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`);
  files['_rels/.rels'] = strToU8(`<Relationships xmlns="${pkg}"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  files['xl/workbook.xml'] = strToU8(`<workbook xmlns="${ns}" xmlns:r="${rel}"><sheets>${sheets.map((s, i) => `<sheet name="${xml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`);
  files['xl/_rels/workbook.xml.rels'] = strToU8(`<Relationships xmlns="${pkg}">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${rel}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}</Relationships>`);
  for (const [i, sheet] of sheets.entries()) files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(`<worksheet xmlns="${ns}"><sheetData>${sheet.rows.map((row, r) => `<row r="${r + 1}">${row.map((value, c) => typeof value === 'number' && Number.isFinite(value) ? `<c r="${column(c)}${r + 1}"><v>${value}</v></c>` : `<c r="${column(c)}${r + 1}" t="inlineStr"><is><t xml:space="preserve">${xml(String(value ?? ''))}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`);
  // User input is always inlineStr: no formulas, hyperlinks or external relationships.
  return zipSync(files, { level: 6 });
}
