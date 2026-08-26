// Normaliza um valor de célula de planilha (pode vir como "R$ 1.234,56", "1234.56",
// número, etc.) para um número JS.
export function parseValorCell(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') return raw;
  let s = String(raw).trim().replace(/R\$\s?/gi, '').replace(/\s/g, '');
  const hasComma = s.includes(',');
  const hasDot = s.includes('.');
  if (hasComma && hasDot) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    s = s.replace(',', '.');
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// Normaliza uma célula de data para o formato ISO (YYYY-MM-DD).
export function parseDataCell(raw) {
  if (!raw) return null;
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 10);
  }
  const s = String(raw).trim();
  const br = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (br) {
    let [, d, m, y] = br;
    if (y.length === 2) y = `20${y}`;
    return `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const [, y, m, d] = iso;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

export function normalizeText(s) {
  return (s || '').toString().trim().toLowerCase();
}

function parseCellByType(raw, type) {
  if (type === 'money') return parseValorCell(raw);
  if (type === 'date') return parseDataCell(raw);
  return raw === null || raw === undefined ? '' : String(raw).trim();
}

/**
 * Aplica o mapeamento de colunas escolhido pelo usuário sobre as linhas cruas
 * da planilha, usando a definição de campos (fields) do tipo de importação
 * selecionado, e classifica cada linha como nova, inválida ou duplicata.
 *
 * fields: [{ key, type: 'text'|'money'|'date', required }]
 * dedupeKeyFn: (row) => string — chave usada para detectar duplicidade
 */
export function buildPreview(rawRows, mapping, fields, existingRows, dedupeKeyFn) {
  const existingKeys = new Set(existingRows.map(dedupeKeyFn));
  const seenInFile = new Set();

  return rawRows.map((raw, index) => {
    const row = {};
    const missing = [];
    fields.forEach((f) => {
      const value = mapping[f.key] ? parseCellByType(raw[mapping[f.key]], f.type) : (f.type === 'text' ? '' : null);
      row[f.key] = value;
      const isEmpty = value === null || value === '' || value === undefined;
      if (f.required && isEmpty) missing.push(f.label || f.key);
    });

    let status = 'novo';
    if (missing.length) {
      status = 'invalido';
    } else {
      const key = dedupeKeyFn(row);
      if (existingKeys.has(key) || seenInFile.has(key)) status = 'duplicata';
      seenInFile.add(key);
    }

    return { ...row, _index: index, _status: status, _missing: missing, _raw: raw };
  });
}

export function summarize(previewRows) {
  return {
    total: previewRows.length,
    novos: previewRows.filter((r) => r._status === 'novo').length,
    duplicatas: previewRows.filter((r) => r._status === 'duplicata').length,
    invalidos: previewRows.filter((r) => r._status === 'invalido').length,
  };
}
