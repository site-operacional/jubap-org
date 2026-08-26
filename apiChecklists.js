import { listAll, getOne, createDoc, patchDoc, removeDoc, writeAudit } from './fs';
import { apiError } from './apiHandlers';

// =====================================================================
// CHECKLISTS
// =====================================================================
export async function checklistsList() {
  const [checklists, sections, items] = await Promise.all([
    listAll('checklists'), listAll('checklistSections'), listAll('checklistItems'),
  ]);
  return checklists
    .sort((a, b) => (b.criado_em || '').localeCompare(a.criado_em || ''))
    .map((c) => {
      const myItems = items.filter((i) => i.checklist_id === c.id);
      const concluidos = myItems.filter((i) => i.status === 'concluido').length;
      return {
        ...c,
        total_itens: myItems.length,
        itens_concluidos: concluidos,
        progresso: myItems.length ? Math.round((concluidos / myItems.length) * 100) : 0,
      };
    });
}

export async function checklistGet(id) {
  const checklist = await getOne('checklists', id);
  if (!checklist) throw apiError('Checklist não encontrado.', 404);
  const [sections, items] = await Promise.all([listAll('checklistSections'), listAll('checklistItems')]);
  const mySections = sections.filter((s) => s.checklist_id === id).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  const myItems = items.filter((i) => i.checklist_id === id);
  const concluidos = myItems.filter((i) => i.status === 'concluido').length;
  return {
    ...checklist,
    sections: mySections.map((s) => ({ ...s, items: myItems.filter((i) => i.section_id === s.id).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)) })),
    itemsSemSecao: myItems.filter((i) => !i.section_id).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
    total_itens: myItems.length,
    itens_concluidos: concluidos,
    progresso: myItems.length ? Math.round((concluidos / myItems.length) * 100) : 0,
  };
}

export async function checklistsCreate(body) {
  const { nome, descricao, evento_id, responsavel_geral, prazo } = body;
  if (!nome) throw apiError('Nome do checklist é obrigatório.');
  const created = await createDoc('checklists', {
    nome, descricao: descricao || '', evento_id: evento_id || null, responsavel_geral: responsavel_geral || '', prazo: prazo || null,
  });
  await writeAudit({ edition_id: null, modulo: 'Checklists', acao: 'criacao', registro: nome, descricao: `Criou o checklist "${nome}".` });
  return created;
}

export async function checklistsUpdate(id, body) {
  const c = await getOne('checklists', id);
  if (!c) throw apiError('Checklist não encontrado.');
  const fields = ['nome', 'descricao', 'evento_id', 'responsavel_geral', 'prazo'];
  const patch = {};
  fields.forEach((f) => { if (body[f] !== undefined) patch[f] = body[f]; });
  const updated = await patchDoc('checklists', id, patch);
  await writeAudit({ edition_id: null, modulo: 'Checklists', acao: 'edicao', registro: c.nome, descricao: `Editou o checklist "${c.nome}".` });
  return updated;
}

export async function checklistsDelete(id) {
  const c = await getOne('checklists', id);
  if (!c) throw apiError('Checklist não encontrado.');
  const [sections, items] = await Promise.all([listAll('checklistSections'), listAll('checklistItems')]);
  await Promise.all(sections.filter((s) => s.checklist_id === id).map((s) => removeDoc('checklistSections', s.id)));
  await Promise.all(items.filter((i) => i.checklist_id === id).map((i) => removeDoc('checklistItems', i.id)));
  await removeDoc('checklists', id);
  await writeAudit({ edition_id: null, modulo: 'Checklists', acao: 'exclusao', registro: c.nome, descricao: `Excluiu o checklist "${c.nome}".` });
  return { ok: true };
}

// =====================================================================
// SEÇÕES
// =====================================================================
export async function sectionsCreate({ checklist_id, nome }) {
  if (!checklist_id || !nome) throw apiError('checklist_id e nome são obrigatórios.');
  const existing = await listAll('checklistSections');
  const ordem = existing.filter((s) => s.checklist_id === checklist_id).length;
  return createDoc('checklistSections', { checklist_id, nome, ordem });
}

export async function sectionsDelete(id) {
  const items = await listAll('checklistItems');
  await Promise.all(items.filter((i) => i.section_id === id).map((i) => patchDoc('checklistItems', i.id, { section_id: null })));
  await removeDoc('checklistSections', id);
  return { ok: true };
}

// =====================================================================
// ITENS
// =====================================================================
export async function itemsCreate(body) {
  const { checklist_id, section_id, descricao, responsavel, prazo, prioridade } = body;
  if (!checklist_id || !descricao) throw apiError('checklist_id e descrição são obrigatórios.');
  const existing = await listAll('checklistItems');
  const ordem = existing.filter((i) => i.checklist_id === checklist_id).length;
  const checklist = await getOne('checklists', checklist_id);
  const created = await createDoc('checklistItems', {
    checklist_id, section_id: section_id || null, descricao, responsavel: responsavel || '', prazo: prazo || null,
    prioridade: prioridade || 'media', status: 'pendente', observacao: '', ordem,
  });
  await writeAudit({ edition_id: null, modulo: 'Checklists', acao: 'criacao', registro: descricao, descricao: `Adicionou a tarefa "${descricao}" ao checklist "${checklist?.nome}".` });
  return created;
}

export async function itemsUpdate(id, body) {
  const item = await getOne('checklistItems', id);
  if (!item) throw apiError('Tarefa não encontrada.');
  const fields = ['descricao', 'responsavel', 'prazo', 'prioridade', 'section_id', 'observacao', 'ordem'];
  const patch = {};
  fields.forEach((f) => { if (body[f] !== undefined) patch[f] = body[f]; });
  let auditDescricao = `Editou a tarefa "${item.descricao}".`;
  let acao = 'edicao';
  if (body.status !== undefined && body.status !== item.status) {
    patch.status = body.status;
    acao = 'status';
    const STATUS_LABEL = { pendente: 'Pendente', andamento: 'Em andamento', concluido: 'Concluído' };
    auditDescricao = body.status === 'concluido'
      ? `Marcou a tarefa "${item.descricao}" como concluída.`
      : `Alterou o status da tarefa "${item.descricao}": ${STATUS_LABEL[item.status]} → ${STATUS_LABEL[body.status]}.`;
  }
  const updated = await patchDoc('checklistItems', id, patch);
  const checklist = await getOne('checklists', item.checklist_id);
  await writeAudit({ edition_id: null, modulo: 'Checklists', acao, registro: item.descricao, descricao: `${auditDescricao} (checklist "${checklist?.nome}")` });
  return updated;
}

export async function itemsDelete(id) {
  const item = await getOne('checklistItems', id);
  if (!item) throw apiError('Tarefa não encontrada.');
  await removeDoc('checklistItems', id);
  await writeAudit({ edition_id: null, modulo: 'Checklists', acao: 'exclusao', registro: item.descricao, descricao: `Excluiu a tarefa "${item.descricao}".` });
  return { ok: true };
}
