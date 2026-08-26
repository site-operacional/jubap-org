import { listAll } from './fs';
import { installmentsSummary } from './apiInstallments';
import { cashSummary } from './apiCashRegister';

export async function generalDashboardGet() {
  const [events, incomes, expenses, editions, fundraisers, people, checklistItems, inventoryItems, parcelamentos, caixa] = await Promise.all([
    listAll('events'), listAll('incomes'), listAll('expenses'), listAll('editions'), listAll('fundraisers'), listAll('people'),
    listAll('checklistItems'), listAll('inventoryItems'), installmentsSummary(), cashSummary(),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const monthPrefix = today.slice(0, 7);

  const eventosRealizados = events.filter((e) => e.status === 'realizado').length;
  const proximosEventos = events
    .filter((e) => e.data && e.data >= today && e.status !== 'cancelado')
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, 5);
  const eventosDoMes = events.filter((e) => (e.data || '').startsWith(monthPrefix)).length;

  const entradas = incomes.reduce((s, i) => s + i.valor, 0);
  const saidas = expenses.reduce((s, e) => s + e.valor, 0);

  // Retiro atual: edição ativa mais recente (por ano)
  const retiroAtual = [...editions].sort((a, b) => b.ano - a.ano).find((e) => e.status === 'ativa') || editions.sort((a, b) => b.ano - a.ano)[0] || null;
  let retiroInfo = null;
  if (retiroAtual) {
    const [rIncomes, rExpenses, rParticipants] = await Promise.all([
      listAll('incomes').then((r) => r.filter((i) => i.edition_id === retiroAtual.id)),
      listAll('expenses').then((r) => r.filter((e) => e.edition_id === retiroAtual.id)),
      listAll('participants').then((r) => r.filter((p) => p.edition_id === retiroAtual.id)),
    ]);
    const rEntradas = rIncomes.reduce((s, i) => s + i.valor, 0);
    const rSaidas = rExpenses.reduce((s, e) => s + e.valor, 0);
    const rAReceber = rParticipants.reduce((s, p) => s + Math.max((p.valor_inscricao || 0) - (p.valor_pago || 0), 0), 0);
    retiroInfo = {
      id: retiroAtual.id, nome: retiroAtual.nome, ano: retiroAtual.ano, data_inicio: retiroAtual.data_inicio,
      participantes: rParticipants.length, saldo: +(rEntradas - rSaidas).toFixed(2), aReceber: +rAReceber.toFixed(2),
    };
  }

  const arrecadacoesLiquido = fundraisers.reduce((s, f) => s + (f.valor_arrecadado - f.despesas), 0);

  const hoje = today;
  const checklist = {
    pendentes: checklistItems.filter((i) => i.status !== 'concluido').length,
    atrasadas: checklistItems.filter((i) => i.status !== 'concluido' && i.prazo && i.prazo < hoje).length,
    concluidas: checklistItems.filter((i) => i.status === 'concluido').length,
  };
  const estoque = {
    disponiveis: inventoryItems.filter((i) => i.estado === 'disponivel').length,
    reservados: inventoryItems.filter((i) => i.estado === 'reservado').length,
    emprestados: inventoryItems.filter((i) => i.estado === 'emprestado').length,
    manutencao: inventoryItems.filter((i) => i.estado === 'manutencao').length,
  };

  return {
    eventos: { realizados: eventosRealizados, esteMes: eventosDoMes, proximos: proximosEventos },
    financeiro: {
      entradas: +entradas.toFixed(2), saidas: +saidas.toFixed(2), saldo: +(entradas - saidas).toFixed(2),
      comprometidoCartao: parcelamentos.totalComprometido, aPagarCartao: +(parcelamentos.totalComprometido - parcelamentos.totalPago).toFixed(2),
      caixaEmEspecie: caixa.saldoEmEspecie,
    },
    retiro: retiroInfo,
    arrecadacoes: +arrecadacoesLiquido.toFixed(2),
    equipe: { total: people.length, ativos: people.filter((p) => p.ativo).length },
    checklist,
    estoque,
  };
}
