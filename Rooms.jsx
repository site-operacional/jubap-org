import { useEffect, useState } from 'react';
import { Plus, BedDouble, Pencil, Trash2, UserPlus, X } from 'lucide-react';
import api from '../../lib/api';
import { useEdition } from '../../context/EditionContext';
import { PageHeader, Spinner, EmptyState } from '../../components/Common';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast, apiErrorMessage } from '../../context/ToastContext';

export default function Rooms() {
  const { currentId } = useEdition();
  const toast = useToast();
  const [rooms, setRooms] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [assigning, setAssigning] = useState(null);

  async function load() {
    if (!currentId) return;
    setLoading(true);
    const [{ data: r }, { data: p }] = await Promise.all([
      api.get('/rooms', { params: { edition_id: currentId } }),
      api.get('/participants', { params: { edition_id: currentId } }),
    ]);
    setRooms(r);
    setParticipants(p);
    setLoading(false);
  }

  useEffect(() => { load(); }, [currentId]);

  async function handleDelete(room) {
    try {
      await api.delete(`/rooms/${room.id}`);
      toast.success(`Acomodação "${room.nome}" excluída.`);
      load();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  }

  async function unassign(participantId) {
    await api.post(`/rooms/unassign/${participantId}`);
    toast.success('Participante removido da acomodação.');
    load();
  }

  const semAcomodacao = participants.filter((p) => !p.room_id);

  return (
    <div>
      <PageHeader
        title="Acomodações"
        description={`${rooms.length} acomodação(ões) cadastrada(s) · ${semAcomodacao.length} participante(s) sem alocação`}
        action={<button className="btn-primary" onClick={() => setEditing('new')}><Plus size={16} /> Nova acomodação</button>}
      />

      {loading ? <Spinner /> : rooms.length === 0 ? (
        <EmptyState icon={BedDouble} title="Nenhuma acomodação cadastrada" description="Cadastre quartos, barracas ou outros espaços de hospedagem." action={<button className="btn-primary" onClick={() => setEditing('new')}><Plus size={16}/>Nova acomodação</button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((r) => {
            const full = r.ocupacao >= r.capacidade;
            return (
              <div key={r.id} className="card p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-display text-forest-900">{r.nome}</p>
                    <p className="text-xs text-forest-500">{r.tipo}</p>
                  </div>
                  <span className={full ? 'badge-red' : 'badge-green'}>{r.ocupacao}/{r.capacidade}</span>
                </div>
                <div className="space-y-1 mb-3 min-h-[32px]">
                  {r.ocupantes.length === 0 && <p className="text-xs text-forest-400 italic">Nenhum ocupante</p>}
                  {r.ocupantes.map((o) => (
                    <div key={o.id} className="flex items-center justify-between text-sm bg-forest-50 rounded-md px-2 py-1">
                      <span className="text-forest-800 truncate">{o.cama ? `${o.cama} — ` : ''}{o.nome}</span>
                      <button onClick={() => unassign(o.id)} className="text-forest-400 hover:text-berry-500"><X size={13} /></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <button className="btn-secondary !py-1.5 !px-2.5 text-xs flex-1" onClick={() => setAssigning(r)} disabled={full}>
                    <UserPlus size={13} /> Alocar
                  </button>
                  <button className="btn-ghost !px-2" onClick={() => setEditing(r)}><Pencil size={14} /></button>
                  <button className="btn-ghost !px-2 text-berry-500 hover:bg-red-50" onClick={() => setDeleting(r)}><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <RoomModal room={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
      {deleting && (
        <ConfirmDialog title="Excluir acomodação" message={`Excluir "${deleting.nome}"? Os ocupantes ficarão sem acomodação.`} confirmLabel="Excluir" danger onClose={() => setDeleting(null)} onConfirm={() => handleDelete(deleting)} />
      )}
      {assigning && (
        <AssignModal room={assigning} candidates={semAcomodacao} onClose={() => setAssigning(null)} onSaved={() => { setAssigning(null); load(); }} />
      )}
    </div>
  );
}

function RoomModal({ room, onClose, onSaved }) {
  const { currentId } = useEdition();
  const toast = useToast();
  const [form, setForm] = useState(() => room || { nome: '', tipo: 'Coletivo', capacidade: 4, observacoes: '' });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.nome?.trim() || !form.capacidade) return toast.error('Informe nome e capacidade.');
    setSaving(true);
    try {
      if (room) await api.put(`/rooms/${room.id}`, form);
      else await api.post('/rooms', { ...form, edition_id: currentId });
      toast.success(room ? 'Acomodação atualizada.' : 'Acomodação criada.');
      onSaved();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={room ? 'Editar acomodação' : 'Nova acomodação'} onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={save} disabled={saving}>Salvar</button></>}>
      <div className="space-y-3">
        <div><label className="label">Nome</label><input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Quarto 01, Barraca 03..." /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Tipo</label>
            <select className="input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option>Individual</option><option>Coletivo</option><option>Barraca</option>
            </select>
          </div>
          <div><label className="label">Capacidade</label><input type="number" min="1" className="input" value={form.capacidade} onChange={(e) => setForm({ ...form, capacidade: Number(e.target.value) })} /></div>
        </div>
        <div><label className="label">Observações</label><textarea className="input" rows={2} value={form.observacoes || ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
      </div>
    </Modal>
  );
}

function AssignModal({ room, candidates, onClose, onSaved }) {
  const toast = useToast();
  const [participantId, setParticipantId] = useState('');
  const [cama, setCama] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!participantId) return toast.error('Selecione um participante.');
    setSaving(true);
    try {
      await api.post(`/rooms/${room.id}/assign`, { participant_id: participantId, cama });
      toast.success('Participante alocado.');
      onSaved();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`Alocar em "${room.nome}"`} onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={save} disabled={saving}>Alocar</button></>}>
      <div className="space-y-3">
        <div>
          <label className="label">Participante</label>
          <select className="input" value={participantId} onChange={(e) => setParticipantId(e.target.value)}>
            <option value="">Selecione...</option>
            {candidates.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          {candidates.length === 0 && <p className="text-xs text-forest-500 mt-1">Todos os participantes já estão alocados.</p>}
        </div>
        <div><label className="label">Cama / identificação (opcional)</label><input className="input" value={cama} onChange={(e) => setCama(e.target.value)} placeholder="Cama 01" /></div>
      </div>
    </Modal>
  );
}
