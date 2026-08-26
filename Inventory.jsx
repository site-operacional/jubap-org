import { useEffect, useState } from 'react';
import { Plus, Package, Search, Pencil, Trash2, MapPin, ArrowRightLeft, X } from 'lucide-react';
import api from '../../lib/api';
import { PageHeader, Spinner, EmptyState } from '../../components/Common';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast, apiErrorMessage } from '../../context/ToastContext';

const ESTADOS = [
  { v: 'disponivel', l: 'Disponível', badge: 'badge-green' },
  { v: 'reservado', l: 'Reservado', badge: 'badge-amber' },
  { v: 'emprestado', l: 'Emprestado', badge: 'badge-amber' },
  { v: 'manutencao', l: 'Em manutenção', badge: 'badge-red' },
  { v: 'perdido', l: 'Perdido', badge: 'badge-red' },
  { v: 'indisponivel', l: 'Indisponível', badge: 'badge-gray' },
];
const ESTADO_MAP = Object.fromEntries(ESTADOS.map((e) => [e.v, e]));

export default function Inventory() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [movingItem, setMovingItem] = useState(null);
  const [managingLocations, setManagingLocations] = useState(false);

  async function load() {
    setLoading(true);
    const params = {};
    if (q) params.q = q;
    if (filterLocation) params.location_id = filterLocation;
    if (filterEstado) params.estado = filterEstado;
    const [{ data: i }, { data: l }] = await Promise.all([
      api.get('/inventory/items', { params }),
      api.get('/inventory/locations'),
    ]);
    setItems(i);
    setLocations(l);
    setLoading(false);
  }
  useEffect(() => { load(); }, [q, filterLocation, filterEstado]);

  async function handleDelete(item) {
    try { await api.delete(`/inventory/items/${item.id}`); toast.success('Item removido do estoque.'); load(); }
    catch (e) { toast.error(apiErrorMessage(e)); }
  }

  return (
    <div>
      <PageHeader
        title="Estoque"
        description="Materiais reutilizáveis da Juventude — o que existe e onde está guardado."
        action={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setManagingLocations(true)}><MapPin size={15} /> Locais</button>
            <button className="btn-primary" onClick={() => setEditing('new')}><Plus size={16} /> Novo item</button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-400" />
          <input className="input pl-9" placeholder="Buscar item..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input w-auto" value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}>
          <option value="">Todos os locais</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.caminho}</option>)}
        </select>
        <select className="input w-auto" value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
          <option value="">Todos os estados</option>
          {ESTADOS.map((e) => <option key={e.v} value={e.v}>{e.l}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : items.length === 0 ? (
        <EmptyState icon={Package} title="Nenhum item cadastrado" description="Cadastre mesas, cadeiras, caixas de som, e tudo que for reutilizável." action={<button className="btn-primary" onClick={() => setEditing('new')}><Plus size={16}/>Novo item</button>} />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Item</th><th>Qtd.</th><th>Local</th><th>Estado</th><th>Responsável</th><th></th></tr></thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td className="font-medium text-forest-900">{i.nome}</td>
                  <td>{i.quantidade} {i.unidade}</td>
                  <td className="text-forest-600 text-xs">{i.local_caminho || '—'}</td>
                  <td><span className={ESTADO_MAP[i.estado]?.badge || 'badge-gray'}>{ESTADO_MAP[i.estado]?.l || i.estado}</span></td>
                  <td className="text-forest-600">{i.responsavel || '—'}</td>
                  <td>
                    <div className="flex gap-1 justify-end">
                      <button className="btn-ghost !px-2" title="Movimentar" onClick={() => setMovingItem(i)}><ArrowRightLeft size={14} /></button>
                      <button className="btn-ghost !px-2" onClick={() => setEditing(i)}><Pencil size={14} /></button>
                      <button className="btn-ghost !px-2 text-berry-500 hover:bg-red-50" onClick={() => setDeleting(i)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && <ItemModal item={editing === 'new' ? null : editing} locations={locations} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {deleting && <ConfirmDialog title="Remover do estoque" message={`Remover "${deleting.nome}" do estoque? O histórico de movimentações também será apagado.`} confirmLabel="Remover" danger onClose={() => setDeleting(null)} onConfirm={() => handleDelete(deleting)} />}
      {movingItem && <MovementModal item={movingItem} locations={locations} onClose={() => setMovingItem(null)} onSaved={() => { setMovingItem(null); load(); }} />}
      {managingLocations && <LocationsModal locations={locations} onClose={() => setManagingLocations(false)} onChanged={load} />}
    </div>
  );
}

function ItemModal({ item, locations, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(() => item || { nome: '', quantidade: 1, unidade: 'un', estado: 'disponivel', location_id: '', responsavel: '', observacao: '', data_aquisicao: '' });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.nome?.trim()) return toast.error('Informe o nome do item.');
    setSaving(true);
    try {
      if (item) await api.put(`/inventory/items/${item.id}`, form);
      else await api.post('/inventory/items', form);
      toast.success(item ? 'Item atualizado.' : 'Item cadastrado.');
      onSaved();
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={item ? 'Editar item' : 'Novo item de estoque'} onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={save} disabled={saving}>Salvar</button></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2"><label className="label">Nome</label><input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Caixa de som, mesa, microfone..." /></div>
        <div><label className="label">Quantidade</label><input type="number" className="input" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} /></div>
        <div><label className="label">Unidade</label><input className="input" value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} /></div>
        <div>
          <label className="label">Estado</label>
          <select className="input" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
            {ESTADOS.map((e) => <option key={e.v} value={e.v}>{e.l}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Local</label>
          <select className="input" value={form.location_id || ''} onChange={(e) => setForm({ ...form, location_id: e.target.value })}>
            <option value="">Sem local definido</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.caminho}</option>)}
          </select>
        </div>
        <div><label className="label">Responsável</label><input className="input" value={form.responsavel || ''} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></div>
        <div><label className="label">Data de aquisição</label><input type="date" className="input" value={form.data_aquisicao || ''} onChange={(e) => setForm({ ...form, data_aquisicao: e.target.value })} /></div>
        <div className="sm:col-span-2"><label className="label">Observação</label><textarea className="input" rows={2} value={form.observacao || ''} onChange={(e) => setForm({ ...form, observacao: e.target.value })} /></div>
      </div>
    </Modal>
  );
}

const MOV_TYPES = [
  { v: 'entrada', l: 'Entrada' }, { v: 'saida', l: 'Saída' }, { v: 'emprestimo', l: 'Empréstimo' },
  { v: 'devolucao', l: 'Devolução' }, { v: 'transferencia', l: 'Transferência de local' }, { v: 'reserva', l: 'Reserva' },
];

function MovementModal({ item, locations, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ tipo: 'reserva', data: new Date().toISOString().slice(0, 10), responsavel: '', destino: '', observacao: '', novo_location_id: '' });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.post('/inventory/movements', { ...form, item_id: item.id });
      toast.success('Movimentação registrada.');
      onSaved();
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={`Movimentar — ${item.nome}`} onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={save} disabled={saving}>Registrar</button></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="label">Tipo</label>
          <select className="input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            {MOV_TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
        </div>
        {form.tipo === 'transferencia' && (
          <div className="sm:col-span-2">
            <label className="label">Novo local</label>
            <select className="input" value={form.novo_location_id} onChange={(e) => setForm({ ...form, novo_location_id: e.target.value })}>
              <option value="">Selecione...</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.caminho}</option>)}
            </select>
          </div>
        )}
        <div><label className="label">Data</label><input type="date" className="input" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
        <div><label className="label">Responsável</label><input className="input" value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></div>
        <div className="sm:col-span-2"><label className="label">Destino (evento, pessoa, etc.)</label><input className="input" value={form.destino} onChange={(e) => setForm({ ...form, destino: e.target.value })} placeholder="Ex: Luau 2026" /></div>
        <div className="sm:col-span-2"><label className="label">Observação</label><textarea className="input" rows={2} value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} /></div>
      </div>
    </Modal>
  );
}

function LocationsModal({ locations, onClose, onChanged }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post('/inventory/locations', { nome: name.trim(), parent_id: parentId || null });
      toast.success('Local criado.');
      setName(''); setParentId('');
      onChanged();
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setSaving(false); }
  }

  async function remove(id) {
    try { await api.delete(`/inventory/locations/${id}`); onChanged(); }
    catch (e) { toast.error(apiErrorMessage(e)); }
  }

  return (
    <Modal title="Locais de armazenamento" onClose={onClose}>
      <div className="space-y-3 mb-4">
        <div className="flex gap-2">
          <input className="input" placeholder="Nome do local (ex: Armário 02)" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="input w-40" value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">Local raiz</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.caminho}</option>)}
          </select>
          <button className="btn-primary !px-4" onClick={add} disabled={saving}><Plus size={15} /></button>
        </div>
        <p className="text-xs text-forest-500">Crie a hierarquia por partes: primeiro "Igreja" (raiz), depois "Sala dos Jovens" com pai "Igreja", depois "Armário 02" com pai "Sala dos Jovens", etc.</p>
      </div>
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {locations.map((l) => (
          <div key={l.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-forest-50 text-sm">
            <span className="text-forest-800">{l.caminho}</span>
            <button onClick={() => remove(l.id)} className="text-forest-400 hover:text-berry-500"><X size={14} /></button>
          </div>
        ))}
        {locations.length === 0 && <p className="text-sm text-forest-400 italic">Nenhum local cadastrado ainda.</p>}
      </div>
    </Modal>
  );
}
