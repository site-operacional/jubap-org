import * as XLSX from 'xlsx';

/**
 * Lê um arquivo .xlsx, .xls ou .csv e retorna as colunas detectadas e as
 * linhas como objetos simples (chave = nome da coluna, valor = célula).
 */
export function parseSpreadsheetFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
        const headers = rows.length ? Object.keys(rows[0]) : [];
        resolve({ headers, rows, sheetName: firstSheetName });
      } catch (err) {
        reject(new Error('Não foi possível interpretar este arquivo. Verifique se é uma planilha válida (.xlsx ou .csv).'));
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Exporta um array de objetos (linhas) para .xlsx, com nomes de colunas
 * amigáveis definidos por `columns` (opcional): [{key, label}].
 */
export function exportToXlsx(filename, rows, columns) {
  const data = columns
    ? rows.map((r) => Object.fromEntries(columns.map((c) => [c.label, r[c.key]])))
    : rows;
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');
  XLSX.writeFile(workbook, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

export function exportToCsv(filename, rows, columns) {
  const data = columns
    ? rows.map((r) => Object.fromEntries(columns.map((c) => [c.label, r[c.key]])))
    : rows;
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename.endsWith('.csv') ? filename : `${filename}.csv`);
}
