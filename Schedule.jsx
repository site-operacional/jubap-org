import { useEffect, useState } from 'react';
import { Plus, CalendarDays, Pencil, Trash2, Clock } from 'lucide-react';
import api from '../../lib/api';
import { useEdition } from '../../context/EditionContext';
import { PageHeader, Spinner, EmptyState } from '../../components/Common';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast, apiErrorMessage } from '../../context/ToastContext';

export default function Schedule() {
  const { currentId } = useEdition();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  async function load() {
    if (!currentId) return;
    setLoading(true);
    const { data } = await api.get('/schedule', { params: { edition_id: currentId } });
    setItems(data);
    setLoading(false);
  }
  useEffect(() => { load(); }, [currentId]);

  async function handleDelete(item) {
    try { await api.delete(`/schedule/${item.id}`); toast.success('Atividade removida.'); load(); }
    catch (e) { toast.error(apiErrorMessage(e)); }
  }

  const byDay = items.reduce((acc, i) => {
    (acc[i.dia] = acc[i.dia] || []).push(i);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader title="Programação" description="Organize as atividades do retiro por dia." action={<button className="btn-primary" onClick={() => setEditing('new')}><Plus size={16} /> Nova atividade</button>} />

      {loading ? <Spinner /> : items.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Nenhuma atividade cadastrada" description="Monte a programação dia a dia do retiro." action={<button className="btn-primary" onClick={() => setEditing('new')}><Plus size={16}/>Nova atividade</button>} />
      ) : (
        <div className="space-y-6">
          {Object.entries(byDay).map(([dia, acts]) => (
            <div key={dia}>
              <p className="font-display text-lg text-forest-900 mb-2 uppercase tracking-wide text-sm">{dia}</p>
              <div className="card divide-y divide-forest-100">
                {acts.map((a) => (
                  <div key={a.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="flex items-center gap-1.5 text-forest-700 font-mono text-sm w-16 shrink-0">
                      <Clock size={13} /> {a.horario}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-forest-900">{a.nome}</p>
                      <p className="text-xs text-forest-500 truncate">
                        {a.local && <>{a.local} · </>}
                        {a.responsavel ? `Responsável: ${a.responsavel}` : <span className="text-clay-600">Sem responsável definido</span>}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button className="btn-ghost !px-2" onClick={() => setEditing(a)}><Pencil size={14} /></button>
                      <button className="btn-ghost !px-2 text-berry-500 hover:bg-red-50" onClick={() => setDeleting(a)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <ActivityModal item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {deleting && <ConfirmDialog title="Remover atividade" message={`Remover "${deleting.nome}"?`} confirmLabel="Remover" danger onClose={() => setDeleting(null)} onConfirm={() => handleDelete(deleting)} />}
    </div>
  );
}

function ActivityModal({ item, onClose, onSaved }) {
  const { currentId } = useEdition();
  const toast = useToast();
  const [form, setForm] = useState(() => item || { dia: 'Sexta-feira', horario: '', duracao: '', nome: '', descricao: '', responsavel: '', local: '', observacoes: '' });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.dia?.trim() || !form.horario?.trim() || !form.nome?.trim()) return toast.error('Informe dia, horário e nome da atividade.');
    setSaving(true);
    try {
      if (item) await api.put(`/schedule/${item.id}`, form);
      else await api.post('/schedule', { ...form, edition_id: currentId });
      toast.success(item ? 'Atividade atualizada.' : 'Atividade adicionada.');
      onSaved();
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={item ? 'Editar atividade' : 'Nova atividade'} onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={save} disabled={saving}>Salvar</button></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className="label">Dia</label><input className="input" value={form.dia} onChange={(e) => setForm({ ...form, dia: e.target.value })} placeholder="Sexta-feira" /></div>
        <div><label className="label">Horário</label><input className="input" value={form.horario} onChange={(e) => setForm({ ...form, horario: e.target.value })} placeholder="19:00" /></div>
        <div className="sm:col-span-2"><label className="label">Nome da atividade</label><input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
        <div><label className="label">Duração</label><input className="input" value={form.duracao || ''} onChange={(e) => setForm({ ...form, duracao: e.target.value })} placeholder="30 min" /></div>
        <div><label className="label">Local</label><input className="input" value={form.local || ''} onChange={(e) => setForm({ ...form, local: e.target.value })} /></div>
        <div className="sm:col-span-2"><label className="label">Responsável</label><input className="input" value={form.responsavel || ''} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></div>
        <div className="sm:col-span-2"><label className="label">Descrição</label><textarea className="input" rows={2} value={form.descricao || ''} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
      </div>
    </Modal>
  );
}
