import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CalendarDays, ArrowRight } from 'lucide-react';
import api, { formatDate } from '../../lib/api';
import { PageHeader, Spinner, EmptyState } from '../../components/Common';
import Modal from '../../components/Modal';
import { useToast, apiErrorMessage } from '../../context/ToastContext';

const STATUS_LABEL = { planejado: 'Planejado', confirmado: 'Confirmado', realizado: 'Realizado', cancelado: 'Cancelado' };
const STATUS_BADGE = { planejado: 'badge-gray', confirmado: 'badge-amber', realizado: 'badge-green', cancelado: 'badge-red' };

export default function Events() {
  const navigate = useNavigate();
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  async function load() {
    setLoading(true);
    const [{ data: e }, { data: t }] = await Promise.all([api.get('/events'), api.get('/events/types')]);
    setEvents(e);
    setTypes(t.filter((x) => x.ativo));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = events.filter((e) => (!filterType || e.tipo_id === filterType) && (!filterStatus || e.status === filterStatus));

  return (
    <div>
      <PageHeader title="Eventos" description="Cultos, evangelismos, luaus, congressos e outras atividades da Juventude." action={<button className="btn-primary" onClick={() => setCreating(true)}><Plus size={16} /> Novo evento</button>} />

      <div className="flex flex-wrap gap-2 mb-4">
        <select className="input w-auto" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">Todos os tipos</option>
          {types.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <select className="input w-auto" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Nenhum evento encontrado" description="Cadastre o primeiro evento da Juventude." action={<button className="btn-primary" onClick={() => setCreating(true)}><Plus size={16}/>Novo evento</button>} />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Evento</th><th>Tipo</th><th>Data</th><th>Local</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="cursor-pointer" onClick={() => navigate(`/eventos/${e.id}`)}>
                  <td className="font-medium text-forest-900">{e.nome}</td>
                  <td>{e.tipo_nome ? <span className="badge-green">{e.tipo_nome}</span> : '—'}</td>
                  <td>{formatDate(e.data)}</td>
                  <td className="text-forest-600">{e.local || '—'}</td>
                  <td><span className={STATUS_BADGE[e.status] || 'badge-gray'}>{STATUS_LABEL[e.status] || e.status}</span></td>
                  <td><ArrowRight size={15} className="text-forest-400" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && <EventModal types={types} onClose={() => setCreating(false)} onSaved={(id) => { setCreating(false); navigate(`/eventos/${id}`); }} />}
    </div>
  );
}

export function EventModal({ event, types, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(() => event || {
    nome: '', tipo_id: types?.[0]?.id || '', data: '', hora_inicio: '', hora_fim: '', local: '', observacoes: '',
    responsavel: '', pregador: '', ministrante: '', louvor: '', convidados: '', equipe: '', status: 'planejado',
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.nome?.trim()) return toast.error('Informe o nome do evento.');
    setSaving(true);
    try {
      if (event) {
        await api.put(`/events/${event.id}`, form);
        toast.success('Evento atualizado.');
        onSaved(event.id);
      } else {
        const { data } = await api.post('/events', form);
        toast.success('Evento criado.');
        onSaved(data.id);
      }
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={event ? 'Editar evento' : 'Novo evento'} wide onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={save} disabled={saving}>Salvar</button></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2"><label className="label">Nome do evento</label><input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
        <div>
          <label className="label">Tipo</label>
          <select className="input" value={form.tipo_id || ''} onChange={(e) => setForm({ ...form, tipo_id: e.target.value })}>
            <option value="">Sem tipo</option>
            {types?.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div><label className="label">Data</label><input type="date" className="input" value={form.data || ''} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
        <div><label className="label">Local</label><input className="input" value={form.local || ''} onChange={(e) => setForm({ ...form, local: e.target.value })} /></div>
        <div><label className="label">Horário de início</label><input className="input" value={form.hora_inicio || ''} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} placeholder="19:00" /></div>
        <div><label className="label">Horário de término</label><input className="input" value={form.hora_fim || ''} onChange={(e) => setForm({ ...form, hora_fim: e.target.value })} placeholder="21:00" /></div>

        <div className="sm:col-span-2 border-t border-forest-100 pt-3 mt-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-forest-500 mb-2">Pessoas envolvidas (opcional)</p>
        </div>
        <div><label className="label">Responsável</label><input className="input" value={form.responsavel || ''} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></div>
        <div><label className="label">Pregador</label><input className="input" value={form.pregador || ''} onChange={(e) => setForm({ ...form, pregador: e.target.value })} /></div>
        <div><label className="label">Ministrante</label><input className="input" value={form.ministrante || ''} onChange={(e) => setForm({ ...form, ministrante: e.target.value })} /></div>
        <div><label className="label">Louvor</label><input className="input" value={form.louvor || ''} onChange={(e) => setForm({ ...form, louvor: e.target.value })} /></div>
        <div><label className="label">Convidados</label><input className="input" value={form.convidados || ''} onChange={(e) => setForm({ ...form, convidados: e.target.value })} /></div>
        <div><label className="label">Equipe responsável</label><input className="input" value={form.equipe || ''} onChange={(e) => setForm({ ...form, equipe: e.target.value })} /></div>

        <div className="sm:col-span-2"><label className="label">Observações</label><textarea className="input" rows={2} value={form.observacoes || ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
      </div>
    </Modal>
  );
}
