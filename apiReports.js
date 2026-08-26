import { listAll } from './fs';

function sum(arr, keyOrFn) {
  return +arr.reduce((s, x) => s + (typeof keyOrFn === 'function' ? keyOrFn(x) : (x[keyOrFn] || 0)), 0).toFixed(2);
}

export async function annualReport(year) {
  const yr = String(year);
  const [
    events, eventTypes, incomesAll, expensesAll, editions, participantsAll,
    fundraisersAll, shoppingAll, categories, inventoryItems, installments,
    checklists, checklistItems,
  ] = await Promise.all([
    listAll('events'), listAll('eventTypes'), listAll('incomes'), listAll('expenses'), listAll('editions'),
    listAll('participants'), listAll('fundraisers'), listAll('shoppingItems'), listAll('categories'),
    listAll('inventoryItems'), listAll('installments'), listAll('checklists'), listAll('checklistItems'),
  ]);

  // ---------------- EVENTOS ----------------
  const yEvents = events.filter((e) => (e.data || '').startsWith(yr));
  const typeMap = Object.fromEntries(eventTypes.map((t) => [t.id, t.nome]));
  const eventosPorTipoMap = {};
  yEvents.forEach((e) => {
    const t = typeMap[e.tipo_id] || 'Sem tipo';
    eventosPorTipoMap[t] = (eventosPorTipoMap[t] || 0) + 1;
  });

  // ---------------- FINANCEIRO ----------------
  const yIncomes = incomesAll.filter((i) => (i.data || '').startsWith(yr));
  const yExpenses = expensesAll.filter((e) => (e.data || '').startsWith(yr));
  const entradas = sum(yIncomes, 'valor');
  const saidas = sum(yExpenses, 'valor');
  const yFundraisers = fundraisersAll.filter((f) => (f.data || '').startsWith(yr));
  const arrecadacoesLiquido = sum(yFundraisers, (f) => f.valor_arrecadado - f.despesas);

  const yEditions = editions.filter((ed) => ed.ano === Number(year));
  const yEditionIds = new Set(yEditions.map((e) => e.id));
  const yParticipants = participantsAll.filter((p) => yEditionIds.has(p.edition_id));
  const aReceber = sum(yParticipants, (p) => Math.max((p.valor_inscricao || 0) - (p.valor_pago || 0), 0));

  const yInstallmentsPend = installments.filter((i) => (i.vencimento || '').startsWith(yr) && i.status !== 'paga');
  const aPagar = sum(yInstallmentsPend, 'valor');

  // ---------------- RETIROS ----------------
  const retiros = yEditions.map((ed) => {
    const p = participantsAll.filter((x) => x.edition_id === ed.id);
    const inc = incomesAll.filter((x) => x.edition_id === ed.id);
    const exp = expensesAll.filter((x) => x.edition_id === ed.id);
    const ent = sum(inc, 'valor');
    const sai = sum(exp, 'valor');
    return { id: ed.id, nome: ed.nome, participantes: p.length, entradas: ent, saidas: sai, saldo: +(ent - sai).toFixed(2) };
  });

  // ---------------- COMPRAS ----------------
  const yShopping = shoppingAll.filter((s) => (s.criado_em || '').startsWith(yr));
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c.nome]));
  const totalGastoCompras = sum(yShopping, (s) => (s.preco_real != null ? s.preco_real : 0));
  const gastoPorCategoriaMap = {};
  yShopping.forEach((s) => {
    const val = s.preco_real != null ? s.preco_real : 0;
    if (val > 0) {
      const cat = s.category_id ? catMap[s.category_id] || 'Sem categoria' : 'Sem categoria';
      gastoPorCategoriaMap[cat] = (gastoPorCategoriaMap[cat] || 0) + val;
    }
  });
  const topCategoriasCompras = Object.entries(gastoPorCategoriaMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nome, total]) => ({ nome, total: +total.toFixed(2) }));

  // ---------------- ESTOQUE ----------------
  // Observação: o estoque não guarda histórico por ano (é uma foto do estado atual),
  // então "emprestados"/"em manutenção" refletem a situação de hoje, não daquele ano.
  const estoque = {
    totalCadastrados: inventoryItems.length,
    adquiridosNoAno: inventoryItems.filter((i) => (i.data_aquisicao || '').startsWith(yr)).length,
    emprestadosAtualmente: inventoryItems.filter((i) => i.estado === 'emprestado').length,
    manutencaoAtualmente: inventoryItems.filter((i) => i.estado === 'manutencao').length,
  };

  // ---------------- CHECKLISTS ----------------
  // Baseado no prazo do checklist, quando definido.
  const yChecklists = checklists.filter((c) => (c.prazo || '').startsWith(yr));
  const yChecklistIds = new Set(yChecklists.map((c) => c.id));
  const yItems = checklistItems.filter((i) => yChecklistIds.has(i.checklist_id));

  return {
    ano: Number(year),
    eventos: {
      total: yEvents.length,
      realizados: yEvents.filter((e) => e.status === 'realizado').length,
      cancelados: yEvents.filter((e) => e.status === 'cancelado').length,
      porTipo: Object.entries(eventosPorTipoMap).map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total),
    },
    financeiro: { entradas, saidas, saldo: +(entradas - saidas).toFixed(2), aReceber, aPagar, arrecadacoes: arrecadacoesLiquido },
    retiros,
    compras: { totalGasto: totalGastoCompras, topCategorias: topCategoriasCompras },
    estoque,
    checklists: {
      checklistsComPrazoNoAno: yChecklists.length,
      checklistsConcluidos: yChecklists.filter((c) => {
        const its = checklistItems.filter((i) => i.checklist_id === c.id);
        return its.length > 0 && its.every((i) => i.status === 'concluido');
      }).length,
      tarefasConcluidas: yItems.filter((i) => i.status === 'concluido').length,
      tarefasPendentes: yItems.filter((i) => i.status !== 'concluido').length,
    },
  };
}
