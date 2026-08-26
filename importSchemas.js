import api from './api';
import { normalizeText } from './importLogic';

function applyOrigin(body, ctx) {
  if (ctx.origemTipo === 'retiro') {
    body.edition_id = ctx.origemId; // o backend resolve o nome da edição automaticamente
  } else if (ctx.origemTipo === 'evento') {
    body.origem_tipo = 'evento';
    body.origem_id = ctx.origemId;
    body.origem_label = ctx.origemLabel;
  }
  // origemTipo === 'geral' não precisa de nada — vira "Juventude Geral" por padrão
}

const STATUS_MAP = { planejado: 'planejado', confirmado: 'confirmado', realizado: 'realizado', cancelado: 'cancelado' };
function normalizeStatus(v) {
  const k = normalizeText(v);
  return STATUS_MAP[k] || 'planejado';
}
const ESTADO_MAP = { disponivel: 'disponivel', disponível: 'disponivel', reservado: 'reservado', emprestado: 'emprestado', manutencao: 'manutencao', manutenção: 'manutencao', perdido: 'perdido', indisponivel: 'indisponivel', indisponível: 'indisponivel' };
function normalizeEstado(v) {
  const k = normalizeText(v);
  return ESTADO_MAP[k] || 'disponivel';
}

export const IMPORT_SCHEMAS = {
  expense: {
    label: 'Financeiro — Saídas',
    needsOrigin: true,
    fields: [
      { key: 'data', label: 'Data', type: 'date', required: true },
      { key: 'descricao', label: 'Descrição', type: 'text', required: true },
      { key: 'valor', label: 'Valor', type: 'money', required: true },
      { key: 'categoria', label: 'Categoria', type: 'text' },
      { key: 'forma', label: 'Forma de pagamento', type: 'text' },
      { key: 'responsavel', label: 'Responsável', type: 'text' },
    ],
    dedupeKey: (r) => [r.data || '', normalizeText(r.descricao), typeof r.valor === 'number' ? r.valor.toFixed(2) : r.valor, normalizeText(r.categoria)].join('|'),
    fetchExisting: async (ctx) => {
      const { data } = await api.get('/financial/all/expenses');
      return ctx.origemTipo === 'geral' ? data : data.filter((x) => x.origem_tipo === ctx.origemTipo && x.origem_id === ctx.origemId);
    },
    createRow: async (row, ctx) => {
      const body = { data: row.data, descricao: row.descricao, valor: row.valor, categoria_livre: row.categoria || undefined, forma_pagamento: row.forma || undefined, responsavel: row.responsavel || undefined };
      applyOrigin(body, ctx);
      return api.post('/financial/expenses', body);
    },
  },
  income: {
    label: 'Financeiro — Entradas',
    needsOrigin: true,
    fields: [
      { key: 'data', label: 'Data', type: 'date', required: true },
      { key: 'descricao', label: 'Descrição', type: 'text', required: true },
      { key: 'valor', label: 'Valor', type: 'money', required: true },
      { key: 'categoria', label: 'Categoria', type: 'text' },
      { key: 'forma', label: 'Forma de recebimento', type: 'text' },
      { key: 'responsavel', label: 'Responsável', type: 'text' },
    ],
    dedupeKey: (r) => [r.data || '', normalizeText(r.descricao), typeof r.valor === 'number' ? r.valor.toFixed(2) : r.valor, normalizeText(r.categoria)].join('|'),
    fetchExisting: async (ctx) => {
      const { data } = await api.get('/financial/all/incomes');
      return ctx.origemTipo === 'geral' ? data : data.filter((x) => x.origem_tipo === ctx.origemTipo && x.origem_id === ctx.origemId);
    },
    createRow: async (row, ctx) => {
      const body = { data: row.data, descricao: row.descricao, valor: row.valor, categoria_livre: row.categoria || undefined, forma_recebimento: row.forma || undefined, responsavel: row.responsavel || undefined };
      applyOrigin(body, ctx);
      return api.post('/financial/incomes', body);
    },
  },
  participant: {
    label: 'Participantes de um retiro',
    needsEdition: true,
    fields: [
      { key: 'nome', label: 'Nome', type: 'text', required: true },
      { key: 'telefone', label: 'Telefone', type: 'text' },
      { key: 'tipo_acomodacao', label: 'Tipo de acomodação', type: 'text' },
      { key: 'classificacao', label: 'Classificação', type: 'text' },
      { key: 'valor_inscricao', label: 'Valor da inscrição', type: 'money' },
      { key: 'valor_pago', label: 'Valor pago', type: 'money' },
    ],
    dedupeKey: (r) => normalizeText(r.nome),
    fetchExisting: async (ctx) => (await api.get('/participants', { params: { edition_id: ctx.editionId } })).data,
    createRow: async (row, ctx) => api.post('/participants', {
      edition_id: ctx.editionId, nome: row.nome, telefone: row.telefone || '',
      tipo_acomodacao: row.tipo_acomodacao || 'Coletivo', classificacao: row.classificacao || 'Inteira',
      valor_inscricao: row.valor_inscricao || 0, valor_pago: row.valor_pago || 0,
    }),
  },
  event: {
    label: 'Eventos',
    fields: [
      { key: 'nome', label: 'Nome', type: 'text', required: true },
      { key: 'data', label: 'Data', type: 'date' },
      { key: 'local', label: 'Local', type: 'text' },
      { key: 'status', label: 'Status (planejado/confirmado/realizado/cancelado)', type: 'text' },
      { key: 'responsavel', label: 'Responsável', type: 'text' },
    ],
    dedupeKey: (r) => [normalizeText(r.nome), r.data || ''].join('|'),
    fetchExisting: async () => (await api.get('/events')).data,
    createRow: async (row) => api.post('/events', { nome: row.nome, data: row.data, local: row.local || '', status: normalizeStatus(row.status), responsavel: row.responsavel || '' }),
  },
  team: {
    label: 'Equipe e Responsáveis',
    fields: [
      { key: 'nome', label: 'Nome', type: 'text', required: true },
      { key: 'telefone', label: 'Telefone', type: 'text' },
      { key: 'email', label: 'E-mail', type: 'text' },
      { key: 'funcao', label: 'Função', type: 'text' },
    ],
    dedupeKey: (r) => `${normalizeText(r.nome)}|${normalizeText(r.email)}`,
    fetchExisting: async () => (await api.get('/team/people')).data,
    createRow: async (row) => api.post('/team/people', { nome: row.nome, telefone: row.telefone || '', email: row.email || '', funcao: row.funcao || '' }),
  },
  inventory: {
    label: 'Estoque',
    fields: [
      { key: 'nome', label: 'Nome do item', type: 'text', required: true },
      { key: 'quantidade', label: 'Quantidade', type: 'money' },
      { key: 'unidade', label: 'Unidade', type: 'text' },
      { key: 'estado', label: 'Estado', type: 'text' },
      { key: 'responsavel', label: 'Responsável', type: 'text' },
    ],
    dedupeKey: (r) => normalizeText(r.nome),
    fetchExisting: async () => (await api.get('/inventory/items')).data,
    createRow: async (row) => api.post('/inventory/items', { nome: row.nome, quantidade: row.quantidade || 1, unidade: row.unidade || 'un', estado: normalizeEstado(row.estado), responsavel: row.responsavel || '' }),
  },
  shopping: {
    label: 'Lista de Compras',
    needsOrigin: true,
    fields: [
      { key: 'produto', label: 'Produto', type: 'text', required: true },
      { key: 'quantidade', label: 'Quantidade', type: 'money' },
      { key: 'unidade', label: 'Unidade', type: 'text' },
      { key: 'preco_estimado', label: 'Preço estimado', type: 'money' },
      { key: 'responsavel', label: 'Responsável', type: 'text' },
    ],
    dedupeKey: (r) => normalizeText(r.produto),
    fetchExisting: async (ctx) => {
      const { data } = await api.get('/shopping/all');
      return ctx.origemTipo === 'geral' ? data : data.filter((x) => x.origem_tipo === ctx.origemTipo && x.origem_id === ctx.origemId);
    },
    createRow: async (row, ctx) => {
      const body = { produto: row.produto, quantidade: row.quantidade || 1, unidade: row.unidade || 'un', preco_estimado: row.preco_estimado || 0, responsavel: row.responsavel || '' };
      applyOrigin(body, ctx);
      return api.post('/shopping', body);
    },
  },
  fundraiser: {
    label: 'Arrecadações',
    needsOrigin: true,
    fields: [
      { key: 'nome', label: 'Nome', type: 'text', required: true },
      { key: 'tipo', label: 'Tipo', type: 'text' },
      { key: 'data', label: 'Data', type: 'date' },
      { key: 'valor_arrecadado', label: 'Valor arrecadado', type: 'money' },
      { key: 'despesas', label: 'Despesas', type: 'money' },
      { key: 'responsavel', label: 'Responsável', type: 'text' },
    ],
    dedupeKey: (r) => [normalizeText(r.nome), r.data || ''].join('|'),
    fetchExisting: async (ctx) => {
      const { data } = await api.get('/fundraisers/all');
      return ctx.origemTipo === 'geral' ? data : data.filter((x) => x.origem_tipo === ctx.origemTipo && x.origem_id === ctx.origemId);
    },
    createRow: async (row, ctx) => {
      const body = { nome: row.nome, tipo: row.tipo || 'Outros', data: row.data, valor_arrecadado: row.valor_arrecadado || 0, despesas: row.despesas || 0, responsavel: row.responsavel || '' };
      applyOrigin(body, ctx);
      return api.post('/fundraisers', body);
    },
  },
};
