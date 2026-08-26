import { listAll, getOne, createDoc, patchDoc, removeDoc, writeAudit } from './fs';
import { apiError } from './apiHandlers';

// =====================================================================
// LOCAIS (estrutura hierárquica: Igreja > Sala dos Jovens > Armário 02 > Prateleira 3)
// =====================================================================
export async function locationsList() {
  const rows = await listAll('inventoryLocations');
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  function pathOf(loc) {
    const parts = [loc.nome];
    let cur = loc;
    while (cur.parent_id && byId[cur.parent_id]) {
      cur = byId[cur.parent_id];
      parts.unshift(cur.nome);
    }
    return parts.join(' → ');
  }
  return rows
    .map((r) => ({ ...r, caminho: pathOf(r) }))
    .sort((a, b) => a.caminho.localeCompare(b.caminho));
}

export async function locationsCreate({ nome, parent_id }) {
  if (!nome) throw apiError('Nome do local é obrigatório.');
  const created = await createDoc('inventoryLocations', { nome, parent_id: parent_id || null });
  await writeAudit({ edition_id: null, modulo: 'Estoque', acao: 'criacao', registro: nome, descricao: `Criou o local "${nome}".` });
  return created;
}

export async function locationsDelete(id) {
  const loc = await getOne('inventoryLocations', id);
  if (!loc) throw apiError('Local não encontrado.');
  const [children, items] = await Promise.all([listAll('inventoryLocations'), listAll('inventoryItems')]);
  if (children.some((c) => c.parent_id === id)) throw apiError('Este local possui sublocais — remova-os primeiro.', 409);
  if (items.some((i) => i.location_id === id)) throw apiError('Este local possui itens cadastrados — mova-os primeiro.', 409);
  await removeDoc('inventoryLocations', id);
  await writeAudit({ edition_id: null, modulo: 'Estoque', acao: 'exclusao', registro: loc.nome, descricao: `Excluiu o local "${loc.nome}".` });
  return { ok: true };
}

// =====================================================================
// ITENS
// =====================================================================
const ESTADOS = ['disponivel', 'reservado', 'emprestado', 'manutencao', 'perdido', 'indisponivel'];

export async function itemsList({ q, location_id, estado, category_id } = {}) {
  const [items, locations, categories] = await Promise.all([
    listAll('inventoryItems'), locationsList(), listAll('categories'),
  ]);
  const locMap = Object.fromEntries(locations.map((l) => [l.id, l]));
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c.nome]));
  let rows = items.map((i) => ({
    ...i,
    local_caminho: i.location_id ? locMap[i.location_id]?.caminho || null : null,
    categoria_nome: i.category_id ? catMap[i.category_id] || null : null,
  }));
  if (q) rows = rows.filter((i) => i.nome.toLowerCase().includes(q.toLowerCase()));
  if (location_id) rows = rows.filter((i) => i.location_id === location_id);
  if (estado) rows = rows.filter((i) => i.estado === estado);
  if (category_id) rows = rows.filter((i) => i.category_id === category_id);
  return rows.sort((a, b) => a.nome.localeCompare(b.nome));
}

export async function itemsGet(id) {
  const item = await getOne('inventoryItems', id);
  if (!item) throw apiError('Item não encontrado.', 404);
  const [locations, movements] = await Promise.all([locationsList(), listAll('inventoryMovements')]);
  const loc = locations.find((l) => l.id === item.location_id);
  const myMovements = movements.filter((m) => m.item_id === id).sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  return { ...item, local_caminho: loc?.caminho || null, movimentacoes: myMovements };
}

export async function itemsCreate(body) {
  const { nome, category_id, quantidade, unidade, estado, location_id, responsavel, observacao, data_aquisicao } = body;
  if (!nome) throw apiError('Nome do item é obrigatório.');
  if (estado && !ESTADOS.includes(estado)) throw apiError('Estado inválido.');
  const created = await createDoc('inventoryItems', {
    nome, category_id: category_id || null, quantidade: Number(quantidade) || 1, unidade: unidade || 'un',
    estado: estado || 'disponivel', location_id: location_id || null, responsavel: responsavel || '',
    observacao: observacao || '', data_aquisicao: data_aquisicao || null,
  });
  await writeAudit({ edition_id: null, modulo: 'Estoque', acao: 'criacao', registro: nome, descricao: `Cadastrou o item "${nome}" no estoque.` });
  return created;
}

export async function itemsUpdate(id, body) {
  const item = await getOne('inventoryItems', id);
  if (!item) throw apiError('Item não encontrado.');
  const fields = ['nome', 'category_id', 'quantidade', 'unidade', 'estado', 'location_id', 'responsavel', 'observacao', 'data_aquisicao'];
  const patch = {};
  fields.forEach((f) => { if (body[f] !== undefined) patch[f] = body[f]; });
  const updated = await patchDoc('inventoryItems', id, patch);
  await writeAudit({ edition_id: null, modulo: 'Estoque', acao: 'edicao', registro: item.nome, descricao: `Editou o item "${item.nome}".` });
  return updated;
}

export async function itemsDelete(id) {
  const item = await getOne('inventoryItems', id);
  if (!item) throw apiError('Item não encontrado.');
  const movements = await listAll('inventoryMovements');
  await Promise.all(movements.filter((m) => m.item_id === id).map((m) => removeDoc('inventoryMovements', m.id)));
  await removeDoc('inventoryItems', id);
  await writeAudit({ edition_id: null, modulo: 'Estoque', acao: 'exclusao', registro: item.nome, descricao: `Removeu o item "${item.nome}" do estoque.` });
  return { ok: true };
}

// =====================================================================
// MOVIMENTAÇÕES (entrada, saída, empréstimo, devolução, transferência, reserva)
// =====================================================================
const MOV_LABEL = {
  entrada: 'Entrada', saida: 'Saída', emprestimo: 'Empréstimo', devolucao: 'Devolução',
  transferencia: 'Transferência de local', reserva: 'Reserva',
};

export async function movementsCreate(body) {
  const { item_id, tipo, responsavel, data, destino, observacao, novo_location_id, evento_id } = body;
  const item = await getOne('inventoryItems', item_id);
  if (!item) throw apiError('Item não encontrado.');
  if (!MOV_LABEL[tipo]) throw apiError('Tipo de movimentação inválido.');

  const created = await createDoc('inventoryMovements', {
    item_id, tipo, responsavel: responsavel || '', data: data || new Date().toISOString().slice(0, 10),
    destino: destino || '', observacao: observacao || '', evento_id: evento_id || null,
  });

  // Atualiza o estado do item automaticamente conforme o tipo de movimentação
  const patch = {};
  if (tipo === 'reserva') patch.estado = 'reservado';
  if (tipo === 'emprestimo') patch.estado = 'emprestado';
  if (tipo === 'devolucao') patch.estado = 'disponivel';
  if (tipo === 'manutencao') patch.estado = 'manutencao';
  if (tipo === 'transferencia' && novo_location_id) patch.location_id = novo_location_id;
  if (Object.keys(patch).length) await patchDoc('inventoryItems', item_id, patch);

  await writeAudit({
    edition_id: null, modulo: 'Estoque', acao: 'transferencia', registro: item.nome,
    descricao: `${MOV_LABEL[tipo]}: "${item.nome}"${destino ? ` — destino: ${destino}` : ''}${responsavel ? ` (responsável: ${responsavel})` : ''}.`,
  });
  return created;
}

// =====================================================================
// RESUMO PARA O DASHBOARD
// =====================================================================
export async function inventorySummary() {
  const items = await listAll('inventoryItems');
  return {
    total: items.length,
    disponiveis: items.filter((i) => i.estado === 'disponivel').length,
    reservados: items.filter((i) => i.estado === 'reservado').length,
    emprestados: items.filter((i) => i.estado === 'emprestado').length,
    manutencao: items.filter((i) => i.estado === 'manutencao').length,
  };
}

// =====================================================================
// RESERVAS POR EVENTO (seção "Estoque × Eventos")
// =====================================================================
export async function movementsByEvent(evento_id) {
  if (!evento_id) throw apiError('evento_id é obrigatório.');
  const [movements, items] = await Promise.all([listAll('inventoryMovements'), listAll('inventoryItems')]);
  const itemMap = Object.fromEntries(items.map((i) => [i.id, i]));
  // Para cada item, pega a movimentação mais recente ligada a este evento —
  // assim sabemos se ainda está reservado/emprestado ou já foi devolvido.
  const relevant = movements.filter((m) => m.evento_id === evento_id).sort((a, b) => (a.criado_em || '').localeCompare(b.criado_em || ''));
  const byItem = {};
  relevant.forEach((m) => { byItem[m.item_id] = m; });
  return Object.entries(byItem).map(([itemId, lastMovement]) => ({
    item: itemMap[itemId] || null,
    ultimaMovimentacao: lastMovement,
    devolvido: lastMovement.tipo === 'devolucao',
  })).filter((r) => r.item);
}

export async function availableItems() {
  return itemsList({ estado: 'disponivel' });
}
