import { useEffect, useState } from 'react';
import { Plus, ShoppingCart, Pencil, Trash2, Check } from 'lucide-react';
import api, { money } from '../../lib/api';
import { useEdition } from '../../context/EditionContext';
import { PageHeader, Spinner, EmptyState } from '../../components/Common';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast, apiErrorMessage } from '../../context/ToastContext';

export default function Shopping() {
  const { currentId } = useEdition();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [purchasing, setPurchasing] = useState(null);

  async function load() {
    if (!currentId) return;
    setLoading(true);
    const [{ data }, { data: cats }] = await Promise.all([
      api.get('/shopping', { params: { edition_id: currentId } }),
      api.get('/categories', { params: { edition_id: currentId, tipo: 'compra' } }),
    ]);
    setItems(data.items);
    setResumo(data.resumo);
    setCategories(cats.filter((c) => c.ativo));
    setLoading(false);
  }
  useEffect(() => { load(); }, [currentId]);

  async function handleDelete(item) {
    try { await api.delete(`/shopping/${item.id}`); toast.success('Item removido.'); load(); }
    catch (e) { toast.error(apiErrorMessage(e)); }
  }

  return (
    <div>
      <PageHeader
        title="Lista de Compras"
        description={resumo ? `${resumo.total} itens · ${resumo.pendentes} pendentes · ${resumo.comprados} comprados · estimado ${money(resumo.custoEstimado)} · real ${money(resumo.custoReal)}` : ''}
        action={<button className="btn-primary" onClick={() => setEditing('new')}><Plus size={16} /> Novo item</button>}
      />

      {loading ? <Spinner /> : items.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="Lista de compras vazia" description="Adicione os itens necessários para o retiro." action={<button className="btn-primary" onClick={() => setEditing('new')}><Plus size={16}/>Novo item</button>} />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Produto</th><th>Categoria</th><th>Qtd.</th><th>Preço estimado</th><th>Preço real</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td className="font-medium text-forest-900">{i.produto}</td>
                  <td>{i.categoria_nome ? <span className="badge-green">{i.categoria_nome}</span> : '—'}</td>
                  <td>{i.quantidade} {i.unidade}</td>
                  <td className="money">{money(i.preco_estimado)}</td>
                  <td className="money">{i.preco_real != null ? money(i.preco_real) : '—'}</td>
                  <td>{i.status === 'Comprado' ? <span className="badge-green">Comprado</span> : <span className="badge-amber">Pendente</span>}</td>
                  <td>
                    <div className="flex gap-1 justify-end">
                      {i.status === 'Pendente' && <button className="btn-ghost !px-2 text-forest-700" onClick={() => setPurchasing(i)}><Check size={15} /></button>}
                      <button className="btn-ghost !px-2" onClick={() => setEditing(i)}><Pencil size={15} /></button>
                      <button className="btn-ghost !px-2 text-berry-500 hover:bg-red-50" onClick={() => setDeleting(i)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && <ItemModal item={editing === 'new' ? null : editing} categories={categories} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {deleting && <ConfirmDialog title="Remover item" message={`Remover "${deleting.produto}" da lista?`} confirmLabel="Remover" danger onClose={() => setDeleting(null)} onConfirm={() => handleDelete(deleting)} />}
      {purchasing && <PurchaseModal item={purchasing} onClose={() => setPurchasing(null)} onSaved={() => { setPurchasing(null); load(); }} />}
    </div>
  );
}

function ItemModal({ item, categories, onClose, onSaved }) {
  const { currentId } = useEdition();
  const toast = useToast();
  const [form, setForm] = useState(() => item || { produto: '', category_id: '', quantidade: 1, unidade: 'un', preco_estimado: '', responsavel: '', observacao: '' });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.produto?.trim()) return toast.error('Informe o nome do produto.');
    setSaving(true);
    try {
      if (item) await api.put(`/shopping/${item.id}`, form);
      else await api.post('/shopping', { ...form, edition_id: currentId });
      toast.success(item ? 'Item atualizado.' : 'Item adicionado.');
      onSaved();
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={item ? 'Editar item' : 'Novo item'} onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={save} disabled={saving}>Salvar</button></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2"><label className="label">Produto</label><input className="input" value={form.produto} onChange={(e) => setForm({ ...form, produto: e.target.value })} /></div>
        <div>
          <label className="label">Categoria</label>
          <select className="input" value={form.category_id || ''} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
            <option value="">Sem categoria</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Quantidade</label><input type="number" className="input" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} /></div>
          <div><label className="label">Unidade</label><input className="input" value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} placeholder="kg, un, cx..." /></div>
        </div>
        <div><label className="label">Preço estimado (R$)</label><input type="number" step="0.01" className="input" value={form.preco_estimado} onChange={(e) => setForm({ ...form, preco_estimado: e.target.value })} /></div>
        <div><label className="label">Responsável</label><input className="input" value={form.responsavel || ''} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></div>
        <div className="sm:col-span-2"><label className="label">Observação</label><textarea className="input" rows={2} value={form.observacao || ''} onChange={(e) => setForm({ ...form, observacao: e.target.value })} /></div>
      </div>
    </Modal>
  );
}

function PurchaseModal({ item, onClose, onSaved }) {
  const toast = useToast();
  const [preco, setPreco] = useState(item.preco_estimado * item.quantidade);
  const [registrarSaida, setRegistrarSaida] = useState(true);
  const [saving, setSaving] = useState(false);

  async function confirm() {
    setSaving(true);
    try {
      await api.post(`/shopping/${item.id}/mark-purchased`, { preco_real: Number(preco), registrar_saida: registrarSaida });
      toast.success(registrarSaida ? 'Item marcado como comprado e saída registrada no financeiro.' : 'Item marcado como comprado.');
      onSaved();
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={`Marcar "${item.produto}" como comprado`} onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={confirm} disabled={saving}>Confirmar</button></>}>
      <div className="space-y-3">
        <div><label className="label">Preço real pago (R$)</label><input type="number" step="0.01" className="input" value={preco} onChange={(e) => setPreco(e.target.value)} /></div>
        <label className="flex items-center gap-2 text-sm text-forest-700 bg-forest-50 rounded-lg px-3 py-2.5 cursor-pointer">
          <input type="checkbox" checked={registrarSaida} onChange={(e) => setRegistrarSaida(e.target.checked)} className="accent-forest-700" />
          Registrar automaticamente como saída financeira ({item.categoria_nome || 'sem categoria'})
        </label>
      </div>
    </Modal>
  );
}
