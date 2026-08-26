import { listAll, getOne, createDoc, patchDoc, removeDoc, writeAudit } from './fs';
import { apiError } from './apiHandlers';

// =====================================================================
// ÁREAS (personalizáveis)
// =====================================================================
export async function areasList() {
  const rows = await listAll('areas');
  return rows.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.nome.localeCompare(b.nome));
}

export async function areasCreate({ nome }) {
  if (!nome) throw apiError('Nome da área é obrigatório.');
  const existing = await listAll('areas');
  const created = await createDoc('areas', { nome, ativo: true, ordem: existing.length });
  await writeAudit({ edition_id: null, modulo: 'Equipe', acao: 'criacao', registro: nome, descricao: `Criou a área "${nome}".` });
  return created;
}

// =====================================================================
// PESSOAS (equipe e responsáveis)
// =====================================================================
export async function peopleList() {
  const [people, areas] = await Promise.all([listAll('people'), listAll('areas')]);
  const areaMap = Object.fromEntries(areas.map((a) => [a.id, a.nome]));
  return people
    .map((p) => ({ ...p, area_nome: areaMap[p.area_id] || null }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

export async function peopleCreate(body) {
  const { nome, telefone, email, funcao, area_id, observacoes } = body;
  if (!nome) throw apiError('Nome é obrigatório.');
  const created = await createDoc('people', {
    nome, telefone: telefone || '', email: email || '', funcao: funcao || '', area_id: area_id || null,
    observacoes: observacoes || '', ativo: true,
  });
  await writeAudit({ edition_id: null, modulo: 'Equipe', acao: 'criacao', registro: nome, descricao: `Cadastrou "${nome}" na equipe.` });
  return created;
}

export async function peopleUpdate(id, body) {
  const p = await getOne('people', id);
  if (!p) throw apiError('Pessoa não encontrada.');
  const fields = ['nome', 'telefone', 'email', 'funcao', 'area_id', 'observacoes', 'ativo'];
  const patch = {};
  fields.forEach((f) => { if (body[f] !== undefined) patch[f] = body[f]; });
  const updated = await patchDoc('people', id, patch);
  await writeAudit({ edition_id: null, modulo: 'Equipe', acao: 'edicao', registro: p.nome, descricao: `Editou o cadastro de "${p.nome}".` });
  return updated;
}

export async function peopleDelete(id) {
  const p = await getOne('people', id);
  if (!p) throw apiError('Pessoa não encontrada.');
  await removeDoc('people', id);
  await writeAudit({ edition_id: null, modulo: 'Equipe', acao: 'exclusao', registro: p.nome, descricao: `Removeu "${p.nome}" da equipe.` });
  return { ok: true };
}
