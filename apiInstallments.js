import { listAll, getOne, createDoc, patchDoc, removeDoc, writeAudit } from './fs';
import { apiError } from './apiHandlers';

function addMonths(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// =====================================================================
// PARCELAMENTOS (compras no cartão de crédito)
// =====================================================================
export async function plansList() {
  const [plans, installments] = await Promise.all([listAll('installmentPlans'), listAll('installments')]);
  return plans
    .sort((a, b) => (b.data_primeira_parcela || '').localeCompare(a.data_primeira_parcela || ''))
    .map((p) => {
      const parcelas = installments
        .filter((i) => i.plan_id === p.id)
        .map((i) => ({ ...i, status: i.status === 'paga' ? 'paga' : (i.vencimento < today() ? 'atrasada' : 'pendente') }))
        .sort((a, b) => a.numero - b.numero);
      const pagas = parcelas.filter((i) => i.status === 'paga').length;
      return {
        ...p,
        parcelas,
        pagas,
        totalPago: +parcelas.filter((i) => i.status === 'paga').reduce((s, i) => s + i.valor, 0).toFixed(2),
        totalComprometido: +parcelas.reduce((s, i) => s + i.valor, 0).toFixed(2),
      };
    });
}

export async function plansCreate(body) {
  const { descricao, valor_total, numero_parcelas, data_primeira_parcela, responsavel, observacao, categoria_livre, category_id, edition_id, origem_tipo, origem_id, origem_label } = body;
  if (!descricao || !valor_total || !numero_parcelas || !data_primeira_parcela) {
    throw apiError('Descrição, valor total, número de parcelas e data da primeira parcela são obrigatórios.');
  }
  const n = Number(numero_parcelas);
  const total = Number(valor_total);
  const baseParcela = Math.floor((total / n) * 100) / 100;
  const resto = +(total - baseParcela * n).toFixed(2);

  let origin = { origem_tipo: origem_tipo || (edition_id ? 'retiro' : 'geral'), origem_id: origem_id || edition_id || null, origem_label: origem_label || 'Juventude Geral' };
  if (origin.origem_tipo === 'retiro' && origin.origem_id && !origem_label) {
    const ed = await getOne('editions', origin.origem_id);
    origin.origem_label = ed?.nome || 'Retiro';
  }

  const plan = await createDoc('installmentPlans', {
    descricao, valor_total: total, numero_parcelas: n, data_primeira_parcela, responsavel: responsavel || '',
    observacao: observacao || '', categoria_livre: categoria_livre || '', category_id: category_id || null, edition_id: edition_id || null,
    ...origin,
  });

  const inserts = [];
  for (let i = 1; i <= n; i++) {
    const valor = i === n ? +(baseParcela + resto).toFixed(2) : baseParcela;
    inserts.push(createDoc('installments', {
      plan_id: plan.id, numero: i, valor, vencimento: addMonths(data_primeira_parcela, i - 1), status: 'pendente', data_pagamento: null,
    }));
  }
  await Promise.all(inserts);

  await writeAudit({
    edition_id: edition_id || null, modulo: 'Financeiro', acao: 'criacao', registro: descricao,
    descricao: `Registrou compra parcelada "${descricao}" — R$ ${total.toFixed(2)} em ${n}x. Origem: ${origin.origem_label}.`,
  });
  return plan;
}

export async function installmentMarkPaid(id, { data_pagamento } = {}) {
  const installment = await getOne('installments', id);
  if (!installment) throw apiError('Parcela não encontrada.');
  if (installment.status === 'paga') throw apiError('Esta parcela já está marcada como paga.', 409);
  const plan = await getOne('installmentPlans', installment.plan_id);
  if (!plan) throw apiError('Parcelamento não encontrado.');

  await patchDoc('installments', id, { status: 'paga', data_pagamento: data_pagamento || today() });

  await createDoc('expenses', {
    edition_id: plan.edition_id || null, data: data_pagamento || today(),
    descricao: `${plan.descricao} — parcela ${installment.numero}/${plan.numero_parcelas}`,
    valor: installment.valor, category_id: plan.category_id || null, categoria_livre: plan.categoria_livre || 'Cartão de crédito',
    responsavel: plan.responsavel || '', forma_pagamento: 'Cartão de Crédito',
    observacao: 'Gerado automaticamente a partir de um parcelamento.',
    origem_tipo: plan.origem_tipo, origem_id: plan.origem_id, origem_label: plan.origem_label,
  });

  await writeAudit({
    edition_id: plan.edition_id || null, modulo: 'Financeiro', acao: 'pagamento', registro: plan.descricao,
    descricao: `Marcou a parcela ${installment.numero}/${plan.numero_parcelas} de "${plan.descricao}" (R$ ${installment.valor.toFixed(2)}) como paga.`,
  });
  return { ok: true };
}

export async function installmentsSummary() {
  const installments = await listAll('installments');
  const withStatus = installments.map((i) => ({ ...i, status: i.status === 'paga' ? 'paga' : (i.vencimento < today() ? 'atrasada' : 'pendente') }));
  return {
    totalComprometido: +withStatus.reduce((s, i) => s + i.valor, 0).toFixed(2),
    totalPago: +withStatus.filter((i) => i.status === 'paga').reduce((s, i) => s + i.valor, 0).toFixed(2),
    totalAtrasado: +withStatus.filter((i) => i.status === 'atrasada').reduce((s, i) => s + i.valor, 0).toFixed(2),
    parcelasAtrasadas: withStatus.filter((i) => i.status === 'atrasada').length,
  };
}
