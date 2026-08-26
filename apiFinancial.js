import { listByEdition, listAll, getOne, createDoc, patchDoc, removeDoc, writeAudit } from './fs';
import { apiError, categoryName } from './apiHandlers';

// Rótulo padrão da origem de uma movimentação/arrecadação/compra, usado para
// consolidar tudo no Financeiro Geral sem duplicar o cadastro em outro lugar.
async function resolveOrigin({ edition_id, origem_tipo, origem_id, origem_label }) {
  if (origem_tipo) return { origem_tipo, origem_id: origem_id || null, origem_label: origem_label || 'Juventude Geral' };
  if (edition_id) {
    const ed = await getOne('editions', edition_id);
    return { origem_tipo: 'retiro', origem_id: edition_id, origem_label: ed?.nome || 'Retiro' };
  }
  return { origem_tipo: 'geral', origem_id: null, origem_label: 'Juventude Geral' };
}

// =====================================================================
// FINANCEIRO — ENTRADAS / SAÍDAS
// =====================================================================
async function withCategoryNames(rows, edition_id) {
  const cats = await listByEdition('categories', edition_id);
  const map = Object.fromEntries(cats.map((c) => [c.id, c.nome]));
  return rows.map((r) => ({ ...r, categoria_nome: r.category_id ? map[r.category_id] || null : null }));
}

export async function movementsList(collName, { edition_id, category_id, data_inicio, data_fim }) {
  if (!edition_id) throw apiError('edition_id é obrigatório.');
  let rows = await listByEdition(collName, edition_id);
  if (category_id) rows = rows.filter((r) => r.category_id === category_id);
  if (data_inicio) rows = rows.filter((r) => r.data >= data_inicio);
  if (data_fim) rows = rows.filter((r) => r.data <= data_fim);
  rows = rows.sort((a, b) => (b.data || '').localeCompare(a.data || '') || (b.criado_em || '').localeCompare(a.criado_em || ''));
  return withCategoryNames(rows, edition_id);
}

export async function movementsCreate(collName, body) {
  const isIncome = collName === 'incomes';
  const { edition_id, data, descricao, valor, category_id, categoria_livre, responsavel, forma_recebimento, forma_pagamento, observacao, origem_tipo, origem_id, origem_label } = body;
  if (!descricao || valor === undefined) throw apiError('Descrição e valor são obrigatórios.');
  const origin = await resolveOrigin({ edition_id, origem_tipo, origem_id, origem_label });
  const payload = {
    edition_id: edition_id || null, data: data || new Date().toISOString().slice(0, 10), descricao, valor: Number(valor),
    category_id: category_id || null, categoria_livre: categoria_livre || null,
    responsavel: responsavel || '', observacao: observacao || '',
    ...origin,
  };
  if (isIncome) payload.forma_recebimento = forma_recebimento || '';
  else payload.forma_pagamento = forma_pagamento || '';
  const created = await createDoc(collName, payload);
  const cname = category_id ? await categoryName(category_id) : categoria_livre;
  await writeAudit({
    edition_id: edition_id || null, modulo: 'Financeiro', acao: 'criacao', registro: descricao,
    descricao: `Registrou ${isIncome ? 'entrada' : 'saída'} de R$ ${Number(valor).toFixed(2)} (${cname || 'sem categoria'}) — ${descricao}. Origem: ${origin.origem_label}.`,
  });
  return created;
}

// Lista TODAS as movimentações (de qualquer origem: retiros, eventos, geral),
// usada pelo Financeiro Geral para consolidar sem duplicar dados.
export async function movementsListAll(collName, { data_inicio, data_fim, origem_tipo } = {}) {
  let rows = await listAll(collName);
  if (data_inicio) rows = rows.filter((r) => r.data >= data_inicio);
  if (data_fim) rows = rows.filter((r) => r.data <= data_fim);
  if (origem_tipo) rows = rows.filter((r) => r.origem_tipo === origem_tipo);
  rows = rows.sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  const cats = await listAll('categories');
  const catMap = Object.fromEntries(cats.map((c) => [c.id, c.nome]));
  return rows.map((r) => ({ ...r, categoria_nome: r.category_id ? catMap[r.category_id] || null : r.categoria_livre || null }));
}

export async function movementsUpdate(collName, id, body) {
  const row = await getOne(collName, id);
  if (!row) throw apiError('Lançamento não encontrado.');
  const patch = {
    data: body.data ?? row.data, descricao: body.descricao ?? row.descricao,
    valor: body.valor !== undefined ? Number(body.valor) : row.valor,
    category_id: body.category_id ?? row.category_id, responsavel: body.responsavel ?? row.responsavel,
    observacao: body.observacao ?? row.observacao,
  };
  if (collName === 'incomes') patch.forma_recebimento = body.forma_recebimento ?? row.forma_recebimento;
  else patch.forma_pagamento = body.forma_pagamento ?? row.forma_pagamento;
  const updated = await patchDoc(collName, id, patch);
  await writeAudit({ edition_id: row.edition_id, modulo: 'Financeiro', acao: 'edicao', registro: row.descricao, descricao: `Editou ${collName === 'incomes' ? 'a entrada' : 'a saída'} "${row.descricao}".` });
  return updated;
}

export async function movementsDelete(collName, id) {
  const row = await getOne(collName, id);
  if (!row) throw apiError('Lançamento não encontrado.');
  await removeDoc(collName, id);
  await writeAudit({ edition_id: row.edition_id, modulo: 'Financeiro', acao: 'exclusao', registro: row.descricao, descricao: `Excluiu ${collName === 'incomes' ? 'a entrada' : 'a saída'} "${row.descricao}" (R$ ${row.valor.toFixed(2)}).` });
  return { ok: true };
}

// =====================================================================
// ARRECADAÇÕES
// =====================================================================
export async function fundraisersList({ edition_id }) {
  if (!edition_id) throw apiError('edition_id é obrigatório.');
  const rows = await listByEdition('fundraisers', edition_id);
  return rows
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''))
    .map((f) => ({ ...f, resultado_liquido: +((f.valor_arrecadado || 0) - (f.despesas || 0)).toFixed(2) }));
}

// Todas as arrecadações da Juventude (retiros + eventos + gerais), para a tela
// consolidada em Arrecadações no menu principal.
export async function fundraisersListAll() {
  const rows = await listAll('fundraisers');
  return rows
    .sort((a, b) => (b.data || '').localeCompare(a.data || ''))
    .map((f) => ({ ...f, resultado_liquido: +((f.valor_arrecadado || 0) - (f.despesas || 0)).toFixed(2) }));
}

export async function fundraisersCreate(body) {
  const { edition_id, nome, tipo, data, responsavel, valor_arrecadado, despesas, observacoes, origem_tipo, origem_id, origem_label } = body;
  if (!nome) throw apiError('Nome é obrigatório.');
  const origin = await resolveOrigin({ edition_id, origem_tipo, origem_id, origem_label });
  const created = await createDoc('fundraisers', {
    edition_id: edition_id || null, nome, tipo: tipo || 'Outros', data: data || null, responsavel: responsavel || '',
    valor_arrecadado: Number(valor_arrecadado) || 0, despesas: Number(despesas) || 0, observacoes: observacoes || '', integrado_financeiro: false,
    ...origin,
  });
  await writeAudit({ edition_id: edition_id || null, modulo: 'Arrecadações', acao: 'criacao', registro: nome, descricao: `Cadastrou a arrecadação "${nome}". Origem: ${origin.origem_label}.` });
  return created;
}

export async function fundraisersUpdate(id, body) {
  const f = await getOne('fundraisers', id);
  if (!f) throw apiError('Arrecadação não encontrada.');
  const updated = await patchDoc('fundraisers', id, {
    nome: body.nome ?? f.nome, tipo: body.tipo ?? f.tipo, data: body.data ?? f.data, responsavel: body.responsavel ?? f.responsavel,
    valor_arrecadado: body.valor_arrecadado !== undefined ? Number(body.valor_arrecadado) : f.valor_arrecadado,
    despesas: body.despesas !== undefined ? Number(body.despesas) : f.despesas,
    observacoes: body.observacoes ?? f.observacoes,
  });
  await writeAudit({ edition_id: f.edition_id, modulo: 'Arrecadações', acao: 'edicao', registro: f.nome, descricao: `Editou a arrecadação "${f.nome}".` });
  return updated;
}

export async function fundraisersIntegrate(id) {
  const f = await getOne('fundraisers', id);
  if (!f) throw apiError('Arrecadação não encontrada.');
  if (f.integrado_financeiro) throw apiError('Esta arrecadação já foi integrada ao financeiro.', 409);
  const liquido = f.valor_arrecadado - f.despesas;
  await createDoc('incomes', {
    edition_id: f.edition_id || null, data: f.data || new Date().toISOString().slice(0, 10), descricao: `Resultado líquido: ${f.nome}`,
    valor: liquido, category_id: null, categoria_livre: 'Arrecadação', responsavel: '', forma_recebimento: '',
    observacao: 'Gerado automaticamente a partir de Arrecadações.',
    origem_tipo: f.origem_tipo || (f.edition_id ? 'retiro' : 'geral'), origem_id: f.origem_id || f.edition_id || null, origem_label: f.origem_label || f.nome,
  });
  await patchDoc('fundraisers', id, { integrado_financeiro: true });
  await writeAudit({ edition_id: f.edition_id, modulo: 'Arrecadações', acao: 'edicao', registro: f.nome, descricao: `Integrou o resultado líquido de "${f.nome}" (R$ ${liquido.toFixed(2)}) ao financeiro.` });
  return { ok: true };
}

export async function fundraisersDelete(id) {
  const f = await getOne('fundraisers', id);
  if (!f) throw apiError('Arrecadação não encontrada.');
  await removeDoc('fundraisers', id);
  await writeAudit({ edition_id: f.edition_id, modulo: 'Arrecadações', acao: 'exclusao', registro: f.nome, descricao: `Excluiu a arrecadação "${f.nome}".` });
  return { ok: true };
}

// =====================================================================
// LISTA DE COMPRAS
// =====================================================================
export async function shoppingList({ edition_id, status }) {
  if (!edition_id) throw apiError('edition_id é obrigatório.');
  let items = await listByEdition('shoppingItems', edition_id);
  if (status) items = items.filter((i) => i.status === status);
  items = await withCategoryNames(items, edition_id);
  items.sort((a, b) => a.status.localeCompare(b.status) || a.produto.localeCompare(b.produto));
  const total = items.length;
  const pendentes = items.filter((i) => i.status === 'Pendente').length;
  const comprados = items.filter((i) => i.status === 'Comprado').length;
  const custoEstimado = items.reduce((s, i) => s + (i.preco_estimado || 0) * (i.quantidade || 1), 0);
  const custoReal = items.reduce((s, i) => s + (i.preco_real != null ? i.preco_real : 0), 0);
  return { items, resumo: { total, pendentes, comprados, custoEstimado: +custoEstimado.toFixed(2), custoReal: +custoReal.toFixed(2) } };
}

export async function shoppingCreate(body) {
  const { edition_id, produto, category_id, quantidade, unidade, preco_estimado, responsavel, observacao, origem_tipo, origem_id, origem_label } = body;
  if (!produto) throw apiError('Produto é obrigatório.');
  const origin = await resolveOrigin({ edition_id, origem_tipo, origem_id, origem_label });
  const created = await createDoc('shoppingItems', {
    edition_id: edition_id || null, produto, category_id: category_id || null, quantidade: Number(quantidade) || 1, unidade: unidade || 'un',
    preco_estimado: Number(preco_estimado) || 0, preco_real: null, responsavel: responsavel || '', status: 'Pendente',
    observacao: observacao || '', registrado_como_saida: false, expense_id: null,
    ...origin,
  });
  await writeAudit({ edition_id: edition_id || null, modulo: 'Lista de Compras', acao: 'criacao', registro: produto, descricao: `Adicionou "${produto}" à lista de compras. Origem: ${origin.origem_label}.` });
  return created;
}

// Todos os itens de compras da Juventude (retiros + eventos + gerais).
export async function shoppingListAll() {
  const items = await listAll('shoppingItems');
  const cats = await listAll('categories');
  const catMap = Object.fromEntries(cats.map((c) => [c.id, c.nome]));
  const withNames = items.map((i) => ({ ...i, categoria_nome: i.category_id ? catMap[i.category_id] || null : null }));
  withNames.sort((a, b) => a.status.localeCompare(b.status) || a.produto.localeCompare(b.produto));
  return withNames;
}

export async function shoppingUpdate(id, body) {
  const item = await getOne('shoppingItems', id);
  if (!item) throw apiError('Item não encontrado.');
  const updated = await patchDoc('shoppingItems', id, {
    produto: body.produto ?? item.produto, category_id: body.category_id ?? item.category_id,
    quantidade: body.quantidade ?? item.quantidade, unidade: body.unidade ?? item.unidade,
    preco_estimado: body.preco_estimado ?? item.preco_estimado, preco_real: body.preco_real ?? item.preco_real,
    responsavel: body.responsavel ?? item.responsavel, observacao: body.observacao ?? item.observacao,
  });
  await writeAudit({ edition_id: item.edition_id, modulo: 'Lista de Compras', acao: 'edicao', registro: item.produto, descricao: `Editou o item "${item.produto}".` });
  return updated;
}

export async function shoppingMarkPurchased(id, { preco_real, registrar_saida }) {
  const item = await getOne('shoppingItems', id);
  if (!item) throw apiError('Item não encontrado.');
  const precoFinal = preco_real !== undefined ? Number(preco_real) : item.preco_estimado * item.quantidade;
  const patch = { status: 'Comprado', preco_real: precoFinal };

  if (registrar_saida && !item.registrado_como_saida) {
    const expense = await createDoc('expenses', {
      edition_id: item.edition_id || null, data: new Date().toISOString().slice(0, 10), descricao: item.produto, valor: precoFinal,
      category_id: item.category_id, responsavel: item.responsavel || '', observacao: 'Gerado automaticamente a partir da lista de compras.',
      forma_pagamento: '',
      origem_tipo: item.origem_tipo || (item.edition_id ? 'retiro' : 'geral'), origem_id: item.origem_id || item.edition_id || null, origem_label: item.origem_label || 'Lista de Compras',
    });
    patch.registrado_como_saida = true;
    patch.expense_id = expense.id;
  }
  const updated = await patchDoc('shoppingItems', id, patch);
  await writeAudit({
    edition_id: item.edition_id, modulo: 'Lista de Compras', acao: 'status', registro: item.produto,
    descricao: registrar_saida && !item.registrado_como_saida
      ? `Marcou "${item.produto}" como comprado (R$ ${precoFinal.toFixed(2)}) e registrou automaticamente como saída financeira.`
      : `Marcou "${item.produto}" como comprado (R$ ${precoFinal.toFixed(2)}).`,
  });
  return updated;
}

export async function shoppingDelete(id) {
  const item = await getOne('shoppingItems', id);
  if (!item) throw apiError('Item não encontrado.');
  await removeDoc('shoppingItems', id);
  await writeAudit({ edition_id: item.edition_id, modulo: 'Lista de Compras', acao: 'exclusao', registro: item.produto, descricao: `Removeu "${item.produto}" da lista de compras.` });
  return { ok: true };
}

// =====================================================================
// PROGRAMAÇÃO
// =====================================================================
export async function scheduleList({ edition_id }) {
  if (!edition_id) throw apiError('edition_id é obrigatório.');
  const rows = await listByEdition('scheduleItems', edition_id);
  return rows.sort((a, b) => a.dia.localeCompare(b.dia) || (a.ordem - b.ordem) || a.horario.localeCompare(b.horario));
}

export async function scheduleCreate(body) {
  const { edition_id, dia, data, horario, duracao, nome, descricao, responsavel, local, observacoes } = body;
  if (!edition_id || !dia || !horario || !nome) throw apiError('edition_id, dia, horario e nome são obrigatórios.');
  const existing = await listByEdition('scheduleItems', edition_id);
  const ordem = existing.filter((s) => s.dia === dia).length;
  const created = await createDoc('scheduleItems', {
    edition_id, dia, data: data || null, horario, duracao: duracao || '', nome, descricao: descricao || '',
    responsavel: responsavel || '', local: local || '', observacoes: observacoes || '', ordem,
  });
  await writeAudit({ edition_id, modulo: 'Programação', acao: 'criacao', registro: nome, descricao: `Adicionou "${nome}" (${dia}, ${horario}) à programação.` });
  return created;
}

export async function scheduleUpdate(id, body) {
  const item = await getOne('scheduleItems', id);
  if (!item) throw apiError('Atividade não encontrada.');
  const updated = await patchDoc('scheduleItems', id, {
    dia: body.dia ?? item.dia, data: body.data ?? item.data, horario: body.horario ?? item.horario, duracao: body.duracao ?? item.duracao,
    nome: body.nome ?? item.nome, descricao: body.descricao ?? item.descricao, responsavel: body.responsavel ?? item.responsavel,
    local: body.local ?? item.local, observacoes: body.observacoes ?? item.observacoes, ordem: body.ordem ?? item.ordem,
  });
  await writeAudit({ edition_id: item.edition_id, modulo: 'Programação', acao: 'edicao', registro: item.nome, descricao: `Editou a atividade "${item.nome}".` });
  return updated;
}

export async function scheduleDelete(id) {
  const item = await getOne('scheduleItems', id);
  if (!item) throw apiError('Atividade não encontrada.');
  await removeDoc('scheduleItems', id);
  await writeAudit({ edition_id: item.edition_id, modulo: 'Programação', acao: 'exclusao', registro: item.nome, descricao: `Excluiu a atividade "${item.nome}".` });
  return { ok: true };
}
