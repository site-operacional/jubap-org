import { listAll, getOne, createDoc, patchDoc, removeDoc, writeAudit } from './fs';
import { apiError } from './apiHandlers';

// =====================================================================
// TIPOS DE EVENTO (personalizáveis pelo administrador)
// =====================================================================
export async function eventTypesList() {
  const rows = await listAll('eventTypes');
  return rows.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.nome.localeCompare(b.nome));
}

export async function eventTypesCreate({ nome, cor }) {
  if (!nome) throw apiError('Nome do tipo é obrigatório.');
  const existing = await listAll('eventTypes');
  const created = await createDoc('eventTypes', { nome, cor: cor || '#2f6a3d', ativo: true, ordem: existing.length });
  await writeAudit({ edition_id: null, modulo: 'Eventos', acao: 'criacao', registro: nome, descricao: `Criou o tipo de evento "${nome}".` });
  return created;
}

export async function eventTypesUpdate(id, body) {
  const t = await getOne('eventTypes', id);
  if (!t) throw apiError('Tipo de evento não encontrado.');
  const patch = {};
  if (body.nome !== undefined) patch.nome = body.nome;
  if (body.cor !== undefined) patch.cor = body.cor;
  if (body.ativo !== undefined) patch.ativo = !!body.ativo;
  const updated = await patchDoc('eventTypes', id, patch);
  await writeAudit({ edition_id: null, modulo: 'Eventos', acao: 'edicao', registro: t.nome, descricao: `Editou o tipo de evento "${t.nome}".` });
  return updated;
}

// =====================================================================
// EVENTOS
// =====================================================================
export async function eventsList() {
  const [events, types] = await Promise.all([listAll('events'), listAll('eventTypes')]);
  const typeMap = Object.fromEntries(types.map((t) => [t.id, t]));
  return events
    .map((e) => ({ ...e, tipo_nome: typeMap[e.tipo_id]?.nome || null, tipo_cor: typeMap[e.tipo_id]?.cor || '#2f6a3d' }))
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''));
}

export async function eventGet(id) {
  const e = await getOne('events', id);
  if (!e) throw apiError('Evento não encontrado.', 404);
  const type = e.tipo_id ? await getOne('eventTypes', e.tipo_id) : null;
  return { ...e, tipo_nome: type?.nome || null, tipo_cor: type?.cor || '#2f6a3d' };
}

export async function eventsCreate(body) {
  const { nome, tipo_id, data, hora_inicio, hora_fim, local, observacoes, responsavel, pregador, ministrante, louvor, convidados, equipe, status } = body;
  if (!nome) throw apiError('Nome do evento é obrigatório.');
  const created = await createDoc('events', {
    nome, tipo_id: tipo_id || null, data: data || null, hora_inicio: hora_inicio || '', hora_fim: hora_fim || '',
    local: local || '', observacoes: observacoes || '', responsavel: responsavel || '', pregador: pregador || '',
    ministrante: ministrante || '', louvor: louvor || '', convidados: convidados || '', equipe: equipe || '',
    status: status || 'planejado',
  });
  await writeAudit({ edition_id: null, modulo: 'Eventos', acao: 'criacao', registro: nome, descricao: `Criou o evento "${nome}".` });
  return created;
}

export async function eventsUpdate(id, body) {
  const e = await getOne('events', id);
  if (!e) throw apiError('Evento não encontrado.');
  const fields = ['nome', 'tipo_id', 'data', 'hora_inicio', 'hora_fim', 'local', 'observacoes', 'responsavel', 'pregador', 'ministrante', 'louvor', 'convidados', 'equipe', 'status'];
  const patch = {};
  fields.forEach((f) => { if (body[f] !== undefined) patch[f] = body[f]; });
  const updated = await patchDoc('events', id, patch);
  const statusChanged = body.status && body.status !== e.status;
  await writeAudit({
    edition_id: null, modulo: 'Eventos', acao: statusChanged ? 'status' : 'edicao', registro: e.nome,
    descricao: statusChanged ? `Alterou o status do evento "${e.nome}": ${e.status} → ${body.status}.` : `Editou o evento "${e.nome}".`,
  });
  return updated;
}

export async function eventsDelete(id) {
  const e = await getOne('events', id);
  if (!e) throw apiError('Evento não encontrado.');
  await removeDoc('events', id);
  await writeAudit({ edition_id: null, modulo: 'Eventos', acao: 'exclusao', registro: e.nome, descricao: `Excluiu o evento "${e.nome}".` });
  return { ok: true };
}
