import { useEffect, useState } from 'react';
import { Plus, Users, Pencil, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import { PageHeader, Spinner, EmptyState } from '../../components/Common';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast, apiErrorMessage } from '../../context/ToastContext';

export default function Team() {
  const toast = useToast();
  const [people, setPeople] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [addingArea, setAddingArea] = useState(false);
  const [areaName, setAreaName] = useState('');
  const [filterArea, setFilterArea] = useState('');

  async function load() {
    setLoading(true);
    const [{ data: p }, { data: a }] = await Promise.all([api.get('/team/people'), api.get('/team/areas')]);
    setPeople(p);
    setAreas(a);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function addArea() {
    if (!areaName.trim()) return;
    try {
      await api.post('/team/areas', { nome: areaName.trim() });
      toast.success('Área adicionada.');
      setAreaName(''); setAddingArea(false); load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  }

  async function handleDelete(p) {
    try { await api.delete(`/team/people/${p.id}`); toast.success('Removido da equipe.'); load(); }
    catch (e) { toast.error(apiErrorMessage(e)); }
  }

  const filtered = filterArea ? people.filter((p) => p.area_id === filterArea) : people;

  return (
    <div>
      <PageHeader title="Equipe e Responsáveis" description="Quem faz o quê dentro da Juventude." action={<button className="btn-primary" onClick={() => setEditing('new')}><Plus size={16} /> Nova pessoa</button>} />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <select className="input w-auto" value={filterArea} onChange={(e) => setFilterArea(e.target.value)}>
          <option value="">Todas as áreas</option>
          {areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
        {addingArea ? (
          <div className="flex gap-2">
            <input autoFocus className="input" placeholder="Nova área" value={areaName} onChange={(e) => setAreaName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addArea()} />
            <button className="btn-primary !px-3" onClick={addArea}>OK</button>
            <button className="btn-ghost !px-3" onClick={() => setAddingArea(false)}>Cancelar</button>
          </div>
        ) : (
          <button className="btn-secondary !py-2 !px-3 text-xs" onClick={() => setAddingArea(true)}><Plus size={13} /> Nova área</button>
        )}
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <EmptyState icon={Users} title="Nenhuma pessoa cadastrada" description="Cadastre a equipe e quem é responsável por cada frente." action={<button className="btn-primary" onClick={() => setEditing('new')}><Plus size={16}/>Nova pessoa</button>} />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Nome</th><th>Função</th><th>Área</th><th>Contato</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium text-forest-900">{p.nome}</td>
                  <td>{p.funcao || '—'}</td>
                  <td>{p.area_nome ? <span className="badge-green">{p.area_nome}</span> : '—'}</td>
                  <td className="text-forest-600 text-xs">{[p.telefone, p.email].filter(Boolean).join(' · ') || '—'}</td>
                  <td><span className={p.ativo ? 'badge-green' : 'badge-gray'}>{p.ativo ? 'ativo' : 'inativo'}</span></td>
                  <td>
                    <div className="flex gap-1 justify-end">
                      <button className="btn-ghost !px-2" onClick={() => setEditing(p)}><Pencil size={15} /></button>
                      <button className="btn-ghost !px-2 text-berry-500 hover:bg-red-50" onClick={() => setDeleting(p)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && <PersonModal person={editing === 'new' ? null : editing} areas={areas} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {deleting && <ConfirmDialog title="Remover da equipe" message={`Remover "${deleting.nome}" da equipe?`} confirmLabel="Remover" danger onClose={() => setDeleting(null)} onConfirm={() => handleDelete(deleting)} />}
    </div>
  );
}

function PersonModal({ person, areas, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(() => person || { nome: '', telefone: '', email: '', funcao: '', area_id: '', observacoes: '' });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.nome?.trim()) return toast.error('Informe o nome.');
    setSaving(true);
    try {
      if (person) await api.put(`/team/people/${person.id}`, form);
      else await api.post('/team/people', form);
      toast.success(person ? 'Cadastro atualizado.' : 'Pessoa cadastrada.');
      onSaved();
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={person ? 'Editar pessoa' : 'Nova pessoa'} onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={save} disabled={saving}>Salvar</button></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2"><label className="label">Nome</label><input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
        <div><label className="label">Telefone</label><input className="input" value={form.telefone || ''} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
        <div><label className="label">E-mail</label><input className="input" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div><label className="label">Função</label><input className="input" value={form.funcao || ''} onChange={(e) => setForm({ ...form, funcao: e.target.value })} /></div>
        <div>
          <label className="label">Área</label>
          <select className="input" value={form.area_id || ''} onChange={(e) => setForm({ ...form, area_id: e.target.value })}>
            <option value="">Sem área</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2"><label className="label">Observações</label><textarea className="input" rows={2} value={form.observacoes || ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
      </div>
    </Modal>
  );
}
