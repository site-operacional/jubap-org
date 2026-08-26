import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CheckSquare, ArrowRight } from 'lucide-react';
import api, { formatDate } from '../../lib/api';
import { PageHeader, Spinner, EmptyState } from '../../components/Common';
import Modal from '../../components/Modal';
import { useToast, apiErrorMessage } from '../../context/ToastContext';

export default function Checklists() {
  const navigate = useNavigate();
  const toast = useToast();
  const [checklists, setChecklists] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: c }, { data: e }] = await Promise.all([api.get('/checklists'), api.get('/events')]);
    setChecklists(c);
    setEvents(e);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  return (
    <div>
      <PageHeader title="Checklists" description="Organize tarefas por seções, prioridades e responsáveis." action={<button className="btn-primary" onClick={() => setCreating(true)}><Plus size={16} /> Novo checklist</button>} />

      {loading ? <Spinner /> : checklists.length === 0 ? (
        <EmptyState icon={CheckSquare} title="Nenhum checklist criado ainda" description="Crie checklists para o retiro, um evento, compras, montagem, o que precisar." action={<button className="btn-primary" onClick={() => setCreating(true)}><Plus size={16}/>Novo checklist</button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {checklists.map((c) => (
            <button key={c.id} onClick={() => navigate(`/checklists/${c.id}`)} className="card p-4 text-left hover:border-forest-300 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <p className="font-display text-forest-900 pr-2">{c.nome}</p>
                <ArrowRight size={15} className="text-forest-400 shrink-0" />
              </div>
              {c.prazo && <p className="text-xs text-forest-500 mb-2">Prazo: {formatDate(c.prazo)}</p>}
              <div className="w-full bg-forest-100 rounded-full h-2 mb-1.5">
                <div className="bg-forest-600 h-2 rounded-full transition-all" style={{ width: `${c.progresso}%` }} />
              </div>
              <p className="text-xs text-forest-500">{c.itens_concluidos} de {c.total_itens} tarefas concluídas — {c.progresso}%</p>
            </button>
          ))}
        </div>
      )}

      {creating && <ChecklistModal events={events} onClose={() => setCreating(false)} onSaved={(id) => { setCreating(false); navigate(`/checklists/${id}`); }} />}
    </div>
  );
}

export function ChecklistModal({ checklist, events, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(() => checklist || { nome: '', descricao: '', evento_id: '', responsavel_geral: '', prazo: '' });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.nome?.trim()) return toast.error('Informe o nome do checklist.');
    setSaving(true);
    try {
      if (checklist) {
        await api.put(`/checklists/${checklist.id}`, form);
        toast.success('Checklist atualizado.');
        onSaved(checklist.id);
      } else {
        const { data } = await api.post('/checklists', form);
        toast.success('Checklist criado.');
        onSaved(data.id);
      }
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={checklist ? 'Editar checklist' : 'Novo checklist'} onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={save} disabled={saving}>Salvar</button></>}>
      <div className="space-y-3">
        <div><label className="label">Nome</label><input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Checklist do Luau" /></div>
        <div><label className="label">Descrição</label><textarea className="input" rows={2} value={form.descricao || ''} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
        <div>
          <label className="label">Evento relacionado (opcional)</label>
          <select className="input" value={form.evento_id || ''} onChange={(e) => setForm({ ...form, evento_id: e.target.value })}>
            <option value="">Nenhum</option>
            {events?.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Responsável geral</label><input className="input" value={form.responsavel_geral || ''} onChange={(e) => setForm({ ...form, responsavel_geral: e.target.value })} /></div>
          <div><label className="label">Prazo</label><input type="date" className="input" value={form.prazo || ''} onChange={(e) => setForm({ ...form, prazo: e.target.value })} /></div>
        </div>
      </div>
    </Modal>
  );
}
