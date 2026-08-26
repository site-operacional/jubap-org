import { useEffect, useState } from 'react';
import { Plus, Trophy, Pencil, Trash2, UserPlus, Medal } from 'lucide-react';
import api from '../../lib/api';
import { useEdition } from '../../context/EditionContext';
import { PageHeader, Spinner, EmptyState } from '../../components/Common';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast, apiErrorMessage } from '../../context/ToastContext';

const SUBTABS = [
  { key: 'equipes', label: 'Equipes' },
  { key: 'provas', label: 'Provas' },
  { key: 'ranking', label: 'Ranking' },
];

export default function Gymkhana() {
  const [tab, setTab] = useState('equipes');
  return (
    <div>
      <PageHeader title="Gincana" description="Equipes, provas, pontuação e ranking do retiro." />
      <div className="flex gap-1 mb-6 border-b border-forest-100">
        {SUBTABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px ${tab === t.key ? 'border-forest-700 text-forest-800' : 'border-transparent text-forest-500 hover:text-forest-700'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'equipes' && <TeamsTab />}
      {tab === 'provas' && <GamesTab />}
      {tab === 'ranking' && <RankingTab />}
    </div>
  );
}

function TeamsTab() {
  const { currentId } = useEdition();
  const toast = useToast();
  const [teams, setTeams] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [addingMember, setAddingMember] = useState(null);

  async function load() {
    if (!currentId) return;
    setLoading(true);
    const [{ data: t }, { data: p }] = await Promise.all([
      api.get('/gymkhana/teams', { params: { edition_id: currentId } }),
      api.get('/participants', { params: { edition_id: currentId } }),
    ]);
    setTeams(t);
    setParticipants(p);
    setLoading(false);
  }
  useEffect(() => { load(); }, [currentId]);

  async function handleDelete(t) {
    try { await api.delete(`/gymkhana/teams/${t.id}`); toast.success('Equipe excluída.'); load(); }
    catch (e) { toast.error(apiErrorMessage(e)); }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn-primary" onClick={() => setEditing('new')}><Plus size={16} /> Nova equipe</button>
      </div>
      {loading ? <Spinner /> : teams.length === 0 ? (
        <EmptyState icon={Trophy} title="Nenhuma equipe cadastrada" description="Crie as equipes que vão participar da gincana." action={<button className="btn-primary" onClick={() => setEditing('new')}><Plus size={16}/>Nova equipe</button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map((t) => (
            <div key={t.id} className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: t.cor }} />
                <p className="font-display text-forest-900 flex-1 truncate">{t.nome}</p>
              </div>
              {t.tema && <p className="text-xs text-forest-500 mb-2">Tema: {t.tema}</p>}
              <div className="space-y-1 mb-3 min-h-[24px]">
                {t.participantes.length === 0 && <p className="text-xs text-forest-400 italic">Nenhum integrante</p>}
                {t.participantes.map((p) => <p key={p.id} className="text-sm text-forest-700 bg-forest-50 rounded px-2 py-1">{p.nome}</p>)}
              </div>
              <div className="flex gap-1.5">
                <button className="btn-secondary !py-1.5 !px-2.5 text-xs flex-1" onClick={() => setAddingMember(t)}><UserPlus size={13} /> Integrante</button>
                <button className="btn-ghost !px-2" onClick={() => setEditing(t)}><Pencil size={14} /></button>
                <button className="btn-ghost !px-2 text-berry-500 hover:bg-red-50" onClick={() => setDeleting(t)}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && <TeamModal team={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {deleting && <ConfirmDialog title="Excluir equipe" message={`Excluir "${deleting.nome}"?`} confirmLabel="Excluir" danger onClose={() => setDeleting(null)} onConfirm={() => handleDelete(deleting)} />}
      {addingMember && <AddMemberModal team={addingMember} candidates={participants.filter((p) => p.team_id !== addingMember.id)} onClose={() => setAddingMember(null)} onSaved={() => { setAddingMember(null); load(); }} />}
    </div>
  );
}

function TeamModal({ team, onClose, onSaved }) {
  const { currentId } = useEdition();
  const toast = useToast();
  const [form, setForm] = useState(() => team || { nome: '', cor: '#2f6a3d', tema: '', responsavel: '', observacoes: '' });
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!form.nome?.trim()) return toast.error('Informe o nome da equipe.');
    setSaving(true);
    try {
      if (team) await api.put(`/gymkhana/teams/${team.id}`, form);
      else await api.post('/gymkhana/teams', { ...form, edition_id: currentId });
      toast.success(team ? 'Equipe atualizada.' : 'Equipe criada.');
      onSaved();
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setSaving(false); }
  }
  return (
    <Modal title={team ? 'Editar equipe' : 'Nova equipe'} onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={save} disabled={saving}>Salvar</button></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2"><label className="label">Nome</label><input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
        <div><label className="label">Cor</label><input type="color" className="input h-10 p-1" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} /></div>
        <div><label className="label">Tema</label><input className="input" value={form.tema || ''} onChange={(e) => setForm({ ...form, tema: e.target.value })} /></div>
        <div className="sm:col-span-2"><label className="label">Responsável</label><input className="input" value={form.responsavel || ''} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></div>
      </div>
    </Modal>
  );
}

function AddMemberModal({ team, candidates, onClose, onSaved }) {
  const toast = useToast();
  const [id, setId] = useState('');
  async function save() {
    if (!id) return toast.error('Selecione um participante.');
    try {
      await api.post(`/gymkhana/teams/${team.id}/members`, { participant_id: id });
      toast.success('Participante vinculado à equipe.');
      onSaved();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  }
  return (
    <Modal title={`Adicionar integrante a "${team.nome}"`} onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={save}>Adicionar</button></>}>
      <select className="input" value={id} onChange={(e) => setId(e.target.value)}>
        <option value="">Selecione um participante...</option>
        {candidates.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
      </select>
    </Modal>
  );
}

function GamesTab() {
  const { currentId } = useEdition();
  const toast = useToast();
  const [games, setGames] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [scoring, setScoring] = useState(null);

  async function load() {
    if (!currentId) return;
    setLoading(true);
    const [{ data: g }, { data: t }] = await Promise.all([
      api.get('/gymkhana/games', { params: { edition_id: currentId } }),
      api.get('/gymkhana/teams', { params: { edition_id: currentId } }),
    ]);
    setGames(g); setTeams(t);
    setLoading(false);
  }
  useEffect(() => { load(); }, [currentId]);

  async function handleDelete(g) {
    try { await api.delete(`/gymkhana/games/${g.id}`); toast.success('Prova excluída.'); load(); }
    catch (e) { toast.error(apiErrorMessage(e)); }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn-primary" onClick={() => setEditing('new')}><Plus size={16} /> Nova prova</button>
      </div>
      {loading ? <Spinner /> : games.length === 0 ? (
        <EmptyState icon={Trophy} title="Nenhuma prova cadastrada" description="Cadastre as provas e brincadeiras da gincana." action={<button className="btn-primary" onClick={() => setEditing('new')}><Plus size={16}/>Nova prova</button>} />
      ) : (
        <div className="space-y-3">
          {games.map((g) => (
            <div key={g.id} className="card p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-display text-forest-900">{g.nome}</p>
                  <p className="text-xs text-forest-500">{[g.data, g.horario, g.responsavel].filter(Boolean).join(' · ') || 'Sem detalhes'}</p>
                </div>
                <div className="flex gap-1">
                  <button className="btn-secondary !py-1.5 !px-2.5 text-xs" onClick={() => setScoring(g)}>Pontuar</button>
                  <button className="btn-ghost !px-2" onClick={() => setDeleting(g)}><Trash2 size={14} /></button>
                </div>
              </div>
              {g.pontuacoes.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {g.pontuacoes.map((p) => (
                    <span key={p.team_id} className="badge-green">{p.time_nome}: {p.pontos} pts</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {editing && <GameModal game={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {deleting && <ConfirmDialog title="Excluir prova" message={`Excluir "${deleting.nome}"?`} confirmLabel="Excluir" danger onClose={() => setDeleting(null)} onConfirm={() => handleDelete(deleting)} />}
      {scoring && <ScoreModal game={scoring} teams={teams} onClose={() => setScoring(null)} onSaved={() => { setScoring(null); load(); }} />}
    </div>
  );
}

function GameModal({ game, onClose, onSaved }) {
  const { currentId } = useEdition();
  const toast = useToast();
  const [form, setForm] = useState(() => game || { nome: '', descricao: '', data: '', horario: '', duracao: '', responsavel: '', pontuacao_maxima: 100, observacoes: '' });
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!form.nome?.trim()) return toast.error('Informe o nome da prova.');
    setSaving(true);
    try {
      await api.post('/gymkhana/games', { ...form, edition_id: currentId });
      toast.success('Prova cadastrada.');
      onSaved();
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setSaving(false); }
  }
  return (
    <Modal title={game ? 'Editar prova' : 'Nova prova'} onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={save} disabled={saving}>Salvar</button></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2"><label className="label">Nome</label><input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
        <div><label className="label">Data</label><input type="date" className="input" value={form.data || ''} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
        <div><label className="label">Horário</label><input className="input" value={form.horario || ''} onChange={(e) => setForm({ ...form, horario: e.target.value })} /></div>
        <div><label className="label">Responsável</label><input className="input" value={form.responsavel || ''} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></div>
        <div><label className="label">Pontuação máxima</label><input type="number" className="input" value={form.pontuacao_maxima} onChange={(e) => setForm({ ...form, pontuacao_maxima: e.target.value })} /></div>
        <div className="sm:col-span-2"><label className="label">Descrição</label><textarea className="input" rows={2} value={form.descricao || ''} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
      </div>
    </Modal>
  );
}

function ScoreModal({ game, teams, onClose, onSaved }) {
  const toast = useToast();
  const initial = Object.fromEntries(teams.map((t) => [t.id, game.pontuacoes.find((p) => p.team_id === t.id)?.pontos ?? '']));
  const [scores, setScores] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function saveAll() {
    setSaving(true);
    try {
      for (const t of teams) {
        if (scores[t.id] !== '' && scores[t.id] !== undefined) {
          await api.post(`/gymkhana/games/${game.id}/score`, { team_id: t.id, pontos: Number(scores[t.id]) });
        }
      }
      toast.success('Pontuações registradas. O ranking foi atualizado automaticamente.');
      onSaved();
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={`Pontuação — ${game.nome}`} onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={saveAll} disabled={saving}>Salvar pontuações</button></>}>
      <div className="space-y-2">
        {teams.length === 0 && <p className="text-sm text-forest-500">Cadastre equipes primeiro na aba Equipes.</p>}
        {teams.map((t) => (
          <div key={t.id} className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: t.cor }} />
            <span className="text-sm text-forest-800 flex-1">{t.nome}</span>
            <input type="number" className="input w-28" placeholder="Pontos" value={scores[t.id]} onChange={(e) => setScores({ ...scores, [t.id]: e.target.value })} />
          </div>
        ))}
      </div>
    </Modal>
  );
}

function RankingTab() {
  const { currentId } = useEdition();
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentId) return;
    setLoading(true);
    api.get('/gymkhana/ranking', { params: { edition_id: currentId } }).then(({ data }) => { setRanking(data); setLoading(false); });
  }, [currentId]);

  if (loading) return <Spinner />;
  if (ranking.length === 0) return <EmptyState icon={Trophy} title="Nenhuma equipe para exibir" description="Crie equipes e registre pontuações nas provas." />;

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="card divide-y divide-forest-100">
      {ranking.map((r, i) => (
        <div key={r.id} className="flex items-center gap-4 px-5 py-4">
          <span className="text-xl w-8 text-center">{medals[i] || `${i + 1}º`}</span>
          <span className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: r.cor }} />
          <span className="flex-1 font-medium text-forest-900">{r.nome}</span>
          <span className="font-mono font-semibold text-forest-800">{r.total} pontos</span>
        </div>
      ))}
    </div>
  );
}
