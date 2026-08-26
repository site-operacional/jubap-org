import { listByEdition, listAll, getOne } from './fs';
import { apiError } from './apiHandlers';

export async function dashboardGet(edition_id) {
  const ed = await getOne('editions', edition_id);
  if (!ed) throw apiError('Edição não encontrada.', 404);

  const [participants, incomes, expenses, fundraisers, rooms, shoppingItems, scheduleItems, categories] = await Promise.all([
    listByEdition('participants', edition_id),
    listByEdition('incomes', edition_id),
    listByEdition('expenses', edition_id),
    listByEdition('fundraisers', edition_id),
    listByEdition('rooms', edition_id),
    listByEdition('shoppingItems', edition_id),
    listByEdition('scheduleItems', edition_id),
    listByEdition('categories', edition_id),
  ]);
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c.nome]));

  const entradas = incomes.reduce((s, i) => s + i.valor, 0);
  const saidas = expenses.reduce((s, e) => s + e.valor, 0);
  const arrecadacoes = fundraisers.reduce((s, f) => s + (f.valor_arrecadado - f.despesas), 0);
  const aReceber = participants.reduce((s, p) => s + Math.max((p.valor_inscricao || 0) - (p.valor_pago || 0), 0), 0);
  const capacidadeTotal = rooms.reduce((s, r) => s + (r.capacidade || 0), 0);
  const ocupacaoAtual = participants.filter((p) => p.room_id).length;

  function groupSum(rows, keyId) {
    const map = {};
    rows.forEach((r) => {
      const nome = r.category_id ? (catMap[r.category_id] || 'Sem categoria') : 'Sem categoria';
      map[nome] = (map[nome] || 0) + r.valor;
    });
    return Object.entries(map).map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total);
  }
  function groupCount(rows, field) {
    const map = {};
    rows.forEach((r) => { map[r[field]] = (map[r[field]] || 0) + 1; });
    return Object.entries(map).map(([nome, total]) => ({ nome, total }));
  }

  const alerts = [];
  const pendentes = participants.filter((p) => ['Pendente', 'Parcial'].includes(p.status_pagamento)).length;
  if (pendentes > 0) alerts.push({ tipo: 'financeiro', texto: `${pendentes} participante(s) com pagamento pendente ou parcial.` });
  if (aReceber > 0) alerts.push({ tipo: 'financeiro', texto: `Ainda há R$ ${aReceber.toFixed(2)} a receber das inscrições.` });

  rooms.forEach((r) => {
    const ocup = participants.filter((p) => p.room_id === r.id).length;
    if (ocup >= r.capacidade) alerts.push({ tipo: 'acomodacao', texto: `"${r.nome}" está com capacidade máxima atingida (${ocup}/${r.capacidade}).` });
  });

  const comprasPendentes = shoppingItems.filter((i) => i.status === 'Pendente').length;
  if (comprasPendentes > 0) alerts.push({ tipo: 'compras', texto: `${comprasPendentes} item(ns) pendente(s) na lista de compras.` });

  const semResponsavel = scheduleItems.filter((s) => !s.responsavel).length;
  if (semResponsavel > 0) alerts.push({ tipo: 'programacao', texto: `${semResponsavel} atividade(s) da programação sem responsável definido.` });

  return {
    edicao: ed,
    indicadores: {
      participantes: participants.length,
      entradas: +entradas.toFixed(2),
      saidas: +saidas.toFixed(2),
      saldo: +(entradas - saidas).toFixed(2),
      aReceber: +aReceber.toFixed(2),
      arrecadacoes: +arrecadacoes.toFixed(2),
      quartos: rooms.length,
      capacidadeTotal,
      ocupacaoAtual,
    },
    graficos: {
      entradasVsSaidas: [
        { nome: 'Entradas', valor: +entradas.toFixed(2) },
        { nome: 'Saídas', valor: +saidas.toFixed(2) },
        { nome: 'Saldo', valor: +(entradas - saidas).toFixed(2) },
      ],
      entradasPorCategoria: groupSum(incomes),
      saidasPorCategoria: groupSum(expenses),
      participantesPorClassificacao: groupCount(participants, 'classificacao'),
      participantesPorAcomodacao: groupCount(participants, 'tipo_acomodacao'),
    },
    alertas: alerts,
  };
}

export async function historyList(params) {
  const { edition_id, usuario, modulo, acao, data_inicio, data_fim, limit } = params;
  let rows = edition_id ? await listByEdition('auditLog', edition_id) : await listAll('auditLog');
  if (usuario) rows = rows.filter((r) => (r.user_nome || '').toLowerCase().includes(usuario.toLowerCase()));
  if (modulo) rows = rows.filter((r) => r.modulo === modulo);
  if (acao) rows = rows.filter((r) => r.acao === acao);
  if (data_inicio) rows = rows.filter((r) => (r.criado_em || '') >= data_inicio);
  if (data_fim) rows = rows.filter((r) => (r.criado_em || '') <= `${data_fim}T23:59:59`);
  rows = rows.sort((a, b) => (b.criado_em || '').localeCompare(a.criado_em || ''));
  return rows.slice(0, Number(limit) || 300);
}
