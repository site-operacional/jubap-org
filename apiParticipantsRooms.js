import {
  listByEdition, listAll, getOne, createDoc, patchDoc, removeDoc, writeAudit,
} from './fs';
import { apiError, statusFrom, categoryName } from './apiHandlers';

// =====================================================================
// CATEGORIAS
// =====================================================================
export async function categoriesList({ edition_id, tipo }) {
  if (!edition_id) throw apiError('edition_id é obrigatório.');
  let rows = await listByEdition('categories', edition_id);
  if (tipo) rows = rows.filter((c) => c.tipo === tipo);
  return rows.sort((a, b) => (a.ordem - b.ordem) || a.nome.localeCompare(b.nome));
}

export async function categoriesCreate({ edition_id, tipo, nome, cor }) {
  if (!edition_id || !tipo || !nome) throw apiError('edition_id, tipo e nome são obrigatórios.');
  const existing = await listByEdition('categories', edition_id);
  const ordem = existing.filter((c) => c.tipo === tipo).length;
  const created = await createDoc('categories', { edition_id, tipo, nome, cor: cor || '#2f8f4e', ativo: true, ordem });
  await writeAudit({ edition_id, modulo: 'Categorias', acao: 'criacao', registro: nome, descricao: `Criou a categoria "${nome}" (${tipo}).` });
  return created;
}

export async function categoriesUpdate(id, body) {
  const cat = await getOne('categories', id);
  if (!cat) throw apiError('Categoria não encontrada.');
  const patch = {};
  if (body.nome !== undefined) patch.nome = body.nome;
  if (body.cor !== undefined) patch.cor = body.cor;
  if (body.ativo !== undefined) patch.ativo = !!body.ativo;
  const updated = await patchDoc('categories', id, patch);
  await writeAudit({ edition_id: cat.edition_id, modulo: 'Categorias', acao: 'edicao', registro: cat.nome, descricao: `Editou a categoria "${cat.nome}".` });
  return updated;
}

// =====================================================================
// PARTICIPANTES
// =====================================================================
export async function participantsList(params) {
  const { edition_id, status, classificacao, acomodacao, room_id, team_id, q } = params;
  if (!edition_id) throw apiError('edition_id é obrigatório.');
  let rows = await listByEdition('participants', edition_id);
  if (status) rows = rows.filter((p) => p.status_pagamento === status);
  if (classificacao) rows = rows.filter((p) => p.classificacao === classificacao);
  if (acomodacao) rows = rows.filter((p) => p.tipo_acomodacao === acomodacao);
  if (room_id) rows = rows.filter((p) => p.room_id === room_id);
  if (team_id) rows = rows.filter((p) => p.team_id === team_id);
  if (q) rows = rows.filter((p) => p.nome.toLowerCase().includes(q.toLowerCase()));
  return rows
    .map((p) => ({ ...p, valor_restante: +((p.valor_inscricao || 0) - (p.valor_pago || 0)).toFixed(2) }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

export async function participantsSummary({ edition_id }) {
  if (!edition_id) throw apiError('edition_id é obrigatório.');
  const all = await listByEdition('participants', edition_id);
  const totalRestante = all.reduce((s, p) => s + Math.max((p.valor_inscricao || 0) - (p.valor_pago || 0), 0), 0);
  return {
    total: all.length,
    pagos: all.filter((p) => p.status_pagamento === 'Pago').length,
    parciais: all.filter((p) => p.status_pagamento === 'Parcial').length,
    pendentes: all.filter((p) => p.status_pagamento === 'Pendente').length,
    meia: all.filter((p) => p.classificacao === 'Meia').length,
    inteira: all.filter((p) => p.classificacao === 'Inteira').length,
    naoPaga: all.filter((p) => p.classificacao === 'Não paga').length,
    porAcomodacao: all.reduce((acc, p) => { acc[p.tipo_acomodacao] = (acc[p.tipo_acomodacao] || 0) + 1; return acc; }, {}),
    valorAReceber: +totalRestante.toFixed(2),
  };
}

export async function participantsCreate(body) {
  const { edition_id, nome, telefone, responsavel, observacoes, tipo_acomodacao, classificacao, valor_inscricao, valor_pago } = body;
  if (!edition_id || !nome) throw apiError('edition_id e nome são obrigatórios.');
  const vi = Number(valor_inscricao) || 0;
  const vp = Number(valor_pago) || 0;
  const created = await createDoc('participants', {
    edition_id, nome, telefone: telefone || '', responsavel: responsavel || '', observacoes: observacoes || '',
    tipo_acomodacao: tipo_acomodacao || 'Coletivo', classificacao: classificacao || 'Inteira',
    valor_inscricao: vi, valor_pago: vp, status_pagamento: statusFrom(vi, vp), room_id: null, cama: null, team_id: null,
  });
  await writeAudit({ edition_id, modulo: 'Participantes', acao: 'criacao', registro: nome, descricao: `Cadastrou o participante "${nome}".` });
  return created;
}

export async function participantsUpdate(id, body) {
  const p = await getOne('participants', id);
  if (!p) throw apiError('Participante não encontrado.');
  const vi = body.valor_inscricao !== undefined ? Number(body.valor_inscricao) : p.valor_inscricao;
  const vp = body.valor_pago !== undefined ? Number(body.valor_pago) : p.valor_pago;
  const status = statusFrom(vi, vp);
  const changes = [];
  if (body.valor_pago !== undefined && Number(body.valor_pago) !== p.valor_pago) changes.push(`valor pago de R$ ${p.valor_pago.toFixed(2)} para R$ ${vp.toFixed(2)}`);
  if (status !== p.status_pagamento) changes.push(`status de pagamento: ${p.status_pagamento} → ${status}`);

  const updated = await patchDoc('participants', id, {
    nome: body.nome ?? p.nome, telefone: body.telefone ?? p.telefone, responsavel: body.responsavel ?? p.responsavel,
    observacoes: body.observacoes ?? p.observacoes, tipo_acomodacao: body.tipo_acomodacao ?? p.tipo_acomodacao,
    classificacao: body.classificacao ?? p.classificacao, valor_inscricao: vi, valor_pago: vp, status_pagamento: status,
  });
  await writeAudit({
    edition_id: p.edition_id, modulo: 'Participantes', acao: changes.length ? 'pagamento' : 'edicao',
    registro: body.nome || p.nome,
    descricao: changes.length ? `Editou participante "${p.nome}". Alterou ${changes.join('; ')}.` : `Editou participante "${p.nome}".`,
  });
  return updated;
}

export async function participantsDelete(id) {
  const p = await getOne('participants', id);
  if (!p) throw apiError('Participante não encontrado.');
  await removeDoc('participants', id);
  await writeAudit({ edition_id: p.edition_id, modulo: 'Participantes', acao: 'exclusao', registro: p.nome, descricao: `Excluiu o participante "${p.nome}".` });
  return { ok: true };
}

// =====================================================================
// ACOMODAÇÕES / QUARTOS
// =====================================================================
export async function roomsList({ edition_id }) {
  if (!edition_id) throw apiError('edition_id é obrigatório.');
  const [rooms, participants] = await Promise.all([listByEdition('rooms', edition_id), listByEdition('participants', edition_id)]);
  return rooms
    .sort((a, b) => (a.ordem - b.ordem) || a.nome.localeCompare(b.nome))
    .map((r) => {
      const ocupantes = participants.filter((p) => p.room_id === r.id).sort((a, b) => (a.cama || '').localeCompare(b.cama || '') || a.nome.localeCompare(b.nome));
      return { ...r, ocupacao: ocupantes.length, ocupantes: ocupantes.map((o) => ({ id: o.id, nome: o.nome, cama: o.cama })) };
    });
}

export async function roomsCreate(body) {
  const { edition_id, nome, tipo, capacidade, observacoes } = body;
  if (!edition_id || !nome || !capacidade) throw apiError('edition_id, nome e capacidade são obrigatórios.');
  const existing = await listByEdition('rooms', edition_id);
  const created = await createDoc('rooms', { edition_id, nome, tipo: tipo || 'Coletivo', capacidade: Number(capacidade), observacoes: observacoes || '', ordem: existing.length });
  await writeAudit({ edition_id, modulo: 'Acomodações', acao: 'criacao', registro: nome, descricao: `Criou a acomodação "${nome}" (capacidade ${capacidade}).` });
  return created;
}

export async function roomsUpdate(id, body) {
  const room = await getOne('rooms', id);
  if (!room) throw apiError('Acomodação não encontrada.');
  const updated = await patchDoc('rooms', id, {
    nome: body.nome ?? room.nome, tipo: body.tipo ?? room.tipo,
    capacidade: body.capacidade !== undefined ? Number(body.capacidade) : room.capacidade,
    observacoes: body.observacoes ?? room.observacoes,
  });
  await writeAudit({ edition_id: room.edition_id, modulo: 'Acomodações', acao: 'edicao', registro: body.nome || room.nome, descricao: `Editou a acomodação "${room.nome}".` });
  return updated;
}

export async function roomsDelete(id) {
  const room = await getOne('rooms', id);
  if (!room) throw apiError('Acomodação não encontrada.');
  const participants = await listByEdition('participants', room.edition_id);
  await Promise.all(participants.filter((p) => p.room_id === id).map((p) => patchDoc('participants', p.id, { room_id: null, cama: null })));
  await removeDoc('rooms', id);
  await writeAudit({ edition_id: room.edition_id, modulo: 'Acomodações', acao: 'exclusao', registro: room.nome, descricao: `Excluiu a acomodação "${room.nome}".` });
  return { ok: true };
}

export async function roomsAssign(roomId, { participant_id, cama }) {
  const room = await getOne('rooms', roomId);
  if (!room) throw apiError('Acomodação não encontrada.');
  const participant = await getOne('participants', participant_id);
  if (!participant) throw apiError('Participante não encontrado.');

  const allParticipants = await listByEdition('participants', room.edition_id);
  const occupancy = allParticipants.filter((p) => p.room_id === roomId && p.id !== participant_id).length;
  if (occupancy >= room.capacidade) {
    throw apiError(`Capacidade excedida: "${room.nome}" comporta ${room.capacidade} pessoa(s) e já está com ${occupancy}.`, 409);
  }

  const fromRoom = participant.room_id ? await getOne('rooms', participant.room_id) : null;
  await patchDoc('participants', participant_id, { room_id: roomId, cama: cama || null });
  await writeAudit({
    edition_id: room.edition_id, modulo: 'Acomodações', acao: 'transferencia', registro: participant.nome,
    descricao: fromRoom ? `Transferiu "${participant.nome}" de "${fromRoom.nome}" para "${room.nome}".` : `Alocou "${participant.nome}" em "${room.nome}".`,
  });
  return { ok: true };
}

export async function roomsUnassign(participantId) {
  const participant = await getOne('participants', participantId);
  if (!participant) throw apiError('Participante não encontrado.');
  await patchDoc('participants', participantId, { room_id: null, cama: null });
  await writeAudit({ edition_id: participant.edition_id, modulo: 'Acomodações', acao: 'transferencia', registro: participant.nome, descricao: `Removeu "${participant.nome}" da acomodação.` });
  return { ok: true };
}
