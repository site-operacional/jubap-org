import { getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { dbFirestore } from './firebase';
import { col, toRow, listByEdition, getOne, createDoc, patchDoc, removeDoc, writeAudit } from './fs';
import { apiError } from './apiHandlers';

// =====================================================================
// EQUIPES
// =====================================================================
export async function teamsList({ edition_id }) {
  if (!edition_id) throw apiError('edition_id é obrigatório.');
  const [teams, participants] = await Promise.all([listByEdition('teams', edition_id), listByEdition('participants', edition_id)]);
  return teams
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .map((t) => ({ ...t, participantes: participants.filter((p) => p.team_id === t.id).map((p) => ({ id: p.id, nome: p.nome })) }));
}

export async function teamsCreate(body) {
  const { edition_id, nome, cor, tema, responsavel, observacoes } = body;
  if (!edition_id || !nome) throw apiError('edition_id e nome são obrigatórios.');
  const created = await createDoc('teams', { edition_id, nome, cor: cor || '#2f6a3d', tema: tema || '', responsavel: responsavel || '', observacoes: observacoes || '' });
  await writeAudit({ edition_id, modulo: 'Gincana', acao: 'criacao', registro: nome, descricao: `Criou a equipe "${nome}".` });
  return created;
}

export async function teamsUpdate(id, body) {
  const t = await getOne('teams', id);
  if (!t) throw apiError('Equipe não encontrada.');
  const updated = await patchDoc('teams', id, {
    nome: body.nome ?? t.nome, cor: body.cor ?? t.cor, tema: body.tema ?? t.tema, responsavel: body.responsavel ?? t.responsavel, observacoes: body.observacoes ?? t.observacoes,
  });
  await writeAudit({ edition_id: t.edition_id, modulo: 'Gincana', acao: 'edicao', registro: t.nome, descricao: `Editou a equipe "${t.nome}".` });
  return updated;
}

export async function teamsDelete(id) {
  const t = await getOne('teams', id);
  if (!t) throw apiError('Equipe não encontrada.');
  const participants = await listByEdition('participants', t.edition_id);
  await Promise.all(participants.filter((p) => p.team_id === id).map((p) => patchDoc('participants', p.id, { team_id: null })));
  const scoresSnap = await getDocs(query(col('gameScores'), where('team_id', '==', id)));
  await Promise.all(scoresSnap.docs.map((d) => deleteDoc(doc(dbFirestore, 'gameScores', d.id))));
  await removeDoc('teams', id);
  await writeAudit({ edition_id: t.edition_id, modulo: 'Gincana', acao: 'exclusao', registro: t.nome, descricao: `Excluiu a equipe "${t.nome}".` });
  return { ok: true };
}

export async function teamsAddMember(teamId, { participant_id }) {
  const t = await getOne('teams', teamId);
  if (!t) throw apiError('Equipe não encontrada.');
  const p = await getOne('participants', participant_id);
  if (!p) throw apiError('Participante não encontrado.');
  await patchDoc('participants', participant_id, { team_id: teamId });
  await writeAudit({ edition_id: t.edition_id, modulo: 'Gincana', acao: 'edicao', registro: p.nome, descricao: `Vinculou "${p.nome}" à equipe "${t.nome}".` });
  return { ok: true };
}

// =====================================================================
// PROVAS
// =====================================================================
export async function gamesList({ edition_id }) {
  if (!edition_id) throw apiError('edition_id é obrigatório.');
  const [games, teams] = await Promise.all([listByEdition('games', edition_id), listByEdition('teams', edition_id)]);
  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t]));
  const sorted = games.sort((a, b) => (a.data || '').localeCompare(b.data || '') || (a.horario || '').localeCompare(b.horario || ''));

  const withScores = await Promise.all(sorted.map(async (g) => {
    const snap = await getDocs(query(col('gameScores'), where('game_id', '==', g.id)));
    const pontuacoes = snap.docs
      .map((d) => toRow(d))
      .map((s) => ({ team_id: s.team_id, pontos: s.pontos, time_nome: teamMap[s.team_id]?.nome, time_cor: teamMap[s.team_id]?.cor }))
      .sort((a, b) => b.pontos - a.pontos);
    return { ...g, pontuacoes };
  }));
  return withScores;
}

export async function gamesCreate(body) {
  const { edition_id, nome, descricao, data, horario, duracao, responsavel, pontuacao_maxima, observacoes } = body;
  if (!edition_id || !nome) throw apiError('edition_id e nome são obrigatórios.');
  const created = await createDoc('games', {
    edition_id, nome, descricao: descricao || '', data: data || null, horario: horario || '', duracao: duracao || '',
    responsavel: responsavel || '', pontuacao_maxima: pontuacao_maxima || 100, observacoes: observacoes || '',
  });
  await writeAudit({ edition_id, modulo: 'Gincana', acao: 'criacao', registro: nome, descricao: `Cadastrou a prova "${nome}".` });
  return created;
}

export async function gamesDelete(id) {
  const g = await getOne('games', id);
  if (!g) throw apiError('Prova não encontrada.');
  const scoresSnap = await getDocs(query(col('gameScores'), where('game_id', '==', id)));
  await Promise.all(scoresSnap.docs.map((d) => deleteDoc(doc(dbFirestore, 'gameScores', d.id))));
  await removeDoc('games', id);
  await writeAudit({ edition_id: g.edition_id, modulo: 'Gincana', acao: 'exclusao', registro: g.nome, descricao: `Excluiu a prova "${g.nome}".` });
  return { ok: true };
}

export async function gamesScore(gameId, { team_id, pontos }) {
  const g = await getOne('games', gameId);
  if (!g) throw apiError('Prova não encontrada.');
  const team = await getOne('teams', team_id);
  if (!team) throw apiError('Equipe não encontrada.');

  const snap = await getDocs(query(col('gameScores'), where('game_id', '==', gameId), where('team_id', '==', team_id)));
  if (!snap.empty) {
    const existing = toRow(snap.docs[0]);
    await patchDoc('gameScores', existing.id, { pontos: Number(pontos) });
    await writeAudit({ edition_id: g.edition_id, modulo: 'Gincana', acao: 'pontuacao', registro: team.nome, descricao: `Alterou a pontuação de "${team.nome}" na prova "${g.nome}": ${existing.pontos} → ${pontos}.` });
  } else {
    await createDoc('gameScores', { game_id: gameId, team_id, pontos: Number(pontos) });
    await writeAudit({ edition_id: g.edition_id, modulo: 'Gincana', acao: 'pontuacao', registro: team.nome, descricao: `Registrou ${pontos} pontos para "${team.nome}" na prova "${g.nome}".` });
  }
  return { ok: true };
}

// =====================================================================
// RANKING
// =====================================================================
export async function ranking({ edition_id }) {
  if (!edition_id) throw apiError('edition_id é obrigatório.');
  const teams = await listByEdition('teams', edition_id);
  const results = await Promise.all(teams.map(async (t) => {
    const snap = await getDocs(query(col('gameScores'), where('team_id', '==', t.id)));
    const total = snap.docs.reduce((s, d) => s + (d.data().pontos || 0), 0);
    return { id: t.id, nome: t.nome, cor: t.cor, total };
  }));
  return results.sort((a, b) => b.total - a.total);
}
