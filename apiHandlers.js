import {
  signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth, getSecondaryAuth } from './firebase';
import { session, setSession } from './session';
import {
  col, toRow, listByEdition, listAll, getOne, createDoc, createDocWithId,
  patchDoc, removeDoc, writeAudit,
} from './fs';
import { getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { dbFirestore } from './firebase';

// ---------------------------------------------------------------------
// Este módulo substitui a antiga chamada HTTP (axios) por operações no
// Firestore, mas mantém a MESMA interface (api.get/post/put/delete) para
// que as telas não precisem ser reescritas. Cada "rota" abaixo corresponde
// a uma tela do sistema.
// ---------------------------------------------------------------------

function apiError(message, status = 400) {
  const err = new Error(message);
  err.response = { status, data: { error: message } };
  return err;
}

function seg(path) {
  return path.replace(/^\//, '').split('/').filter(Boolean);
}

function statusFrom(valor_inscricao, valor_pago) {
  if (valor_pago <= 0) return 'Pendente';
  if (valor_pago >= valor_inscricao) return 'Pago';
  return 'Parcial';
}

async function categoryName(id) {
  if (!id) return null;
  const c = await getOne('categories', id);
  return c ? c.nome : null;
}

// =====================================================================
// AUTH
// =====================================================================
async function authLogin({ email, senha }) {
  if (!email || !senha) throw apiError('Informe e-mail e senha.');
  let cred;
  try {
    cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), senha);
  } catch (e) {
    throw apiError('Credenciais inválidas.');
  }
  const uid = cred.user.uid;
  const profile = await getOne('users', uid);
  if (!profile || !profile.ativo) {
    await signOut(auth);
    throw apiError('Usuário inválido ou inativo. Fale com um administrador.');
  }
  const role = await getOne('roles', profile.role_id);
  setSession({ uid, nome: profile.nome, role_id: profile.role_id });
  return {
    token: uid,
    user: { id: uid, nome: profile.nome, email: profile.email, role: role?.nome, role_id: profile.role_id },
    permissoes: role ? role.permissoes : [],
    readOnly: !!role?.readOnly,
  };
}

async function authMe() {
  const user = auth.currentUser;
  if (!user) throw apiError('Não autenticado.', 401);
  const profile = await getOne('users', user.uid);
  if (!profile) throw apiError('Perfil de usuário não encontrado.', 401);
  const role = await getOne('roles', profile.role_id);
  setSession({ uid: user.uid, nome: profile.nome, role_id: profile.role_id });
  return { user: { id: user.uid, ...profile }, role: role?.nome, permissoes: role ? role.permissoes : [], readOnly: !!role?.readOnly };
}

// =====================================================================
// EDIÇÕES
// =====================================================================
async function editionsList() {
  const rows = await listAll('editions');
  return rows.sort((a, b) => (b.ano - a.ano) || (b.criado_em || '').localeCompare(a.criado_em || ''));
}

async function editionsCreate(body) {
  const { nome, ano, tema, versiculo, data_inicio, data_fim, local, endereco, observacoes } = body;
  if (!nome || !ano) throw apiError('Nome e ano são obrigatórios.');
  const ed = await createDoc('editions', {
    nome, ano, tema: tema || 'A definir', versiculo: versiculo || 'A definir',
    data_inicio: data_inicio || null, data_fim: data_fim || null, local: local || 'A definir',
    endereco: endereco || '', observacoes: observacoes || '', status: 'ativa', criado_a_partir_de: null,
  });
  const seedCats = [
    ...['Individual', 'Coletivo', 'Barraca'].map((n, i) => ({ tipo: 'acomodacao', nome: n, ordem: i })),
    ...['Meia', 'Inteira', 'Não paga'].map((n, i) => ({ tipo: 'classificacao', nome: n, ordem: i })),
  ];
  await Promise.all(seedCats.map((c) => createDoc('categories', { ...c, edition_id: ed.id, ativo: true, cor: '#2f6a3d' })));
  await writeAudit({ edition_id: ed.id, modulo: 'Edições', acao: 'criacao', registro: nome, descricao: `Criou a edição "${nome}" (${ano}).` });
  return ed;
}

async function editionsUpdate(id, body) {
  const { id: _drop, criado_em: _drop2, ...rest } = body;
  const updated = await patchDoc('editions', id, rest);
  await writeAudit({ edition_id: id, modulo: 'Edições', acao: 'edicao', registro: rest.nome, descricao: `Atualizou informações gerais da edição "${rest.nome}".` });
  return updated;
}

async function editionsDuplicate(sourceId, body) {
  const source = await getOne('editions', sourceId);
  if (!source) throw apiError('Edição de origem não encontrada.');
  const { nome, ano, data_inicio, data_fim, local, copy = {} } = body;
  if (!nome || !ano) throw apiError('Informe nome e ano da nova edição.');

  const newEd = await createDoc('editions', {
    nome, ano, tema: source.tema, versiculo: source.versiculo,
    data_inicio: data_inicio || null, data_fim: data_fim || null, local: local || source.local,
    endereco: source.endereco || '', observacoes: '', status: 'ativa', criado_a_partir_de: source.id,
  });
  const newId = newEd.id;
  const idMap = { rooms: {}, teams: {} };

  const allCats = await listByEdition('categories', source.id);
  const baseCats = allCats.filter((c) => ['acomodacao', 'classificacao'].includes(c.tipo));
  await Promise.all(baseCats.map((c) => createDoc('categories', { edition_id: newId, tipo: c.tipo, nome: c.nome, cor: c.cor, ativo: true, ordem: c.ordem })));

  if (copy.financialCategories) {
    const fc = allCats.filter((c) => ['entrada', 'saida'].includes(c.tipo));
    await Promise.all(fc.map((c) => createDoc('categories', { edition_id: newId, tipo: c.tipo, nome: c.nome, cor: c.cor, ativo: true, ordem: c.ordem })));
  }
  if (copy.shoppingCategories) {
    const sc = allCats.filter((c) => c.tipo === 'compra');
    await Promise.all(sc.map((c) => createDoc('categories', { edition_id: newId, tipo: c.tipo, nome: c.nome, cor: c.cor, ativo: true, ordem: c.ordem })));
  }
  const arrCats = allCats.filter((c) => c.tipo === 'arrecadacao');
  await Promise.all(arrCats.map((c) => createDoc('categories', { edition_id: newId, tipo: c.tipo, nome: c.nome, cor: c.cor, ativo: true, ordem: c.ordem })));

  if (copy.rooms) {
    const rooms = await listByEdition('rooms', source.id);
    for (const r of rooms) {
      const created = await createDoc('rooms', { edition_id: newId, nome: r.nome, tipo: r.tipo, capacidade: r.capacidade, observacoes: r.observacoes || '', ordem: r.ordem || 0 });
      idMap.rooms[r.id] = created.id;
    }
  }
  if (copy.schedule) {
    const items = await listByEdition('scheduleItems', source.id);
    await Promise.all(items.map((s) => createDoc('scheduleItems', {
      edition_id: newId, dia: s.dia, data: null, horario: s.horario, duracao: s.duracao || '', nome: s.nome,
      descricao: s.descricao || '', responsavel: s.responsavel || '', local: s.local || '', observacoes: s.observacoes || '', ordem: s.ordem || 0,
    })));
  }
  if (copy.teams) {
    const teams = await listByEdition('teams', source.id);
    for (const t of teams) {
      const created = await createDoc('teams', { edition_id: newId, nome: t.nome, cor: t.cor, tema: t.tema || '', responsavel: t.responsavel || '', observacoes: t.observacoes || '' });
      idMap.teams[t.id] = created.id;
    }
  }
  if (copy.gymkhanaStructure) {
    const games = await listByEdition('games', source.id);
    await Promise.all(games.map((g) => createDoc('games', {
      edition_id: newId, nome: g.nome, descricao: g.descricao || '', data: null, horario: g.horario || '',
      duracao: g.duracao || '', responsavel: g.responsavel || '', pontuacao_maxima: g.pontuacao_maxima || 100, observacoes: g.observacoes || '',
    })));
  }
  if (copy.participants) {
    const participants = await listByEdition('participants', source.id);
    await Promise.all(participants.map((p) => createDoc('participants', {
      edition_id: newId, nome: p.nome, telefone: p.telefone || '', responsavel: p.responsavel || '', observacoes: p.observacoes || '',
      tipo_acomodacao: p.tipo_acomodacao, classificacao: p.classificacao, valor_inscricao: p.valor_inscricao,
      valor_pago: 0, status_pagamento: 'Pendente',
      room_id: copy.rooms ? (idMap.rooms[p.room_id] || null) : null, cama: null,
      team_id: copy.teams ? (idMap.teams[p.team_id] || null) : null,
    })));
  }
  if (copy.financial) {
    const incomes = await listByEdition('incomes', source.id);
    const expenses = await listByEdition('expenses', source.id);
    await Promise.all(incomes.map((i) => createDoc('incomes', { edition_id: newId, data: i.data, descricao: i.descricao, valor: i.valor, category_id: null, responsavel: i.responsavel || '', forma_recebimento: i.forma_recebimento || '', observacao: i.observacao || '' })));
    await Promise.all(expenses.map((e) => createDoc('expenses', { edition_id: newId, data: e.data, descricao: e.descricao, valor: e.valor, category_id: null, responsavel: e.responsavel || '', forma_pagamento: e.forma_pagamento || '', observacao: e.observacao || '' })));
  }
  if (copy.fundraisers) {
    const fundraisers = await listByEdition('fundraisers', source.id);
    await Promise.all(fundraisers.map((f) => createDoc('fundraisers', { edition_id: newId, nome: f.nome, tipo: f.tipo, data: f.data, responsavel: f.responsavel || '', valor_arrecadado: f.valor_arrecadado, despesas: f.despesas, observacoes: f.observacoes || '', integrado_financeiro: false })));
  }

  await writeAudit({ edition_id: newId, modulo: 'Edições', acao: 'criacao', registro: nome, descricao: `Duplicou a edição "${source.nome}" para criar "${nome}" (${ano}).` });
  return getOne('editions', newId);
}

async function editionsCompare({ ids }) {
  if (!Array.isArray(ids) || ids.length < 2) throw apiError('Selecione ao menos duas edições.');
  const rows = [];
  for (const id of ids) {
    const ed = await getOne('editions', id);
    if (!ed) continue;
    const [participants, incomes, expenses, fundraisers] = await Promise.all([
      listByEdition('participants', id), listByEdition('incomes', id), listByEdition('expenses', id), listByEdition('fundraisers', id),
    ]);
    const entradas = incomes.reduce((s, i) => s + i.valor, 0);
    const saidas = expenses.reduce((s, e) => s + e.valor, 0);
    const arrecadado = fundraisers.reduce((s, f) => s + (f.valor_arrecadado - f.despesas), 0);
    rows.push({
      id, nome: ed.nome, ano: ed.ano, participantes: participants.length,
      entradas: +entradas.toFixed(2), saidas: +saidas.toFixed(2), saldo: +(entradas - saidas).toFixed(2),
      arrecadado: +arrecadado.toFixed(2),
      valorMedioPorParticipante: participants.length ? +(saidas / participants.length).toFixed(2) : 0,
    });
  }
  return rows;
}

export { seg, apiError, statusFrom, categoryName, authLogin, authMe, editionsList, editionsCreate, editionsUpdate, editionsDuplicate, editionsCompare };
