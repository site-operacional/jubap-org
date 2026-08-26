import { listAll, createDoc, writeAudit } from './fs';
import { apiError } from './apiHandlers';

// =====================================================================
// CAIXA EM ESPÉCIE
// =====================================================================
export async function cashSummary() {
  const [incomes, deposits] = await Promise.all([listAll('incomes'), listAll('cashDeposits')]);
  const totalRecebido = incomes.filter((i) => i.forma_recebimento === 'Dinheiro').reduce((s, i) => s + i.valor, 0);
  const totalDepositado = deposits.reduce((s, d) => s + d.valor, 0);
  return {
    totalRecebido: +totalRecebido.toFixed(2),
    totalDepositado: +totalDepositado.toFixed(2),
    saldoEmEspecie: +(totalRecebido - totalDepositado).toFixed(2),
  };
}

export async function depositsList() {
  const rows = await listAll('cashDeposits');
  return rows.sort((a, b) => (b.data || '').localeCompare(a.data || ''));
}

export async function depositsCreate(body) {
  const { valor, data, responsavel, conta_destino, comprovante, observacao } = body;
  if (!valor) throw apiError('Informe o valor do depósito.');
  const created = await createDoc('cashDeposits', {
    valor: Number(valor), data: data || new Date().toISOString().slice(0, 10), responsavel: responsavel || '',
    conta_destino: conta_destino || '', comprovante: comprovante || '', observacao: observacao || '',
  });
  await writeAudit({
    edition_id: null, modulo: 'Financeiro', acao: 'criacao', registro: 'Depósito em espécie',
    descricao: `Registrou depósito de R$ ${Number(valor).toFixed(2)} em espécie${conta_destino ? ` na conta "${conta_destino}"` : ''}.`,
  });
  return created;
}
