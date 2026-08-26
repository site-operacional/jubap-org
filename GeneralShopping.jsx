import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ShoppingCart, Check, ExternalLink } from 'lucide-react';
import api, { money } from '../../lib/api';
import { PageHeader, Spinner, EmptyState } from '../../components/Common';
import Modal from '../../components/Modal';
import { useToast, apiErrorMessage } from '../../context/ToastContext';

export default function GeneralShopping() {
  const navigate = useNavigate();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [purchasing, setPurchasing] = useState(null);

  async function load() {
    setLoading(true);
    const { data } = await api.get('/shopping/all');
    setItems(data);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function goToOrigin(i) {
    if (i.origem_tipo === 'retiro' && i.origem_id) navigate(`/retiros/${i.origem_id}/compras`);
  }

  const pendentes = items.filter((i) => i.status === 'Pendente').length;

  return (
    <div>
      <PageHeader
        title="Compras"
        description={`${items.length} itens no total · ${pendentes} pendentes (todas as origens)`}
        action={<button className="btn-primary" onClick={() => setCreating(true)}><Plus size={16} /> Novo item geral</button>}
      />

      {loading ? <Spinner /> : items.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="Nenhum item de compra cadastrado" />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Produto</th><th>Qtd.</th><th>Preço estimado</th><th>Origem</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id}>
                  <td className="font-medium text-forest-900">{i.produto}</td>
                  <td>{i.quantidade} {i.unidade}</td>
                  <td className="money">{money(i.preco_estimado)}</td>
                  <td>
                    {i.origem_tipo === 'retiro' && i.origem_id ? (
                      <button className="badge-amber flex items-center gap-1" onClick={() => goToOrigin(i)}>{i.origem_label} <ExternalLink size={11} /></button>
                    ) : <span className="badge-gray">Geral</span>}
                  </td>
                  <td>{i.status === 'Comprado' ? <span className="badge-green">Comprado</span> : <span className="badge-amber">Pendente</span>}</td>
                  <td>{i.status === 'Pendente' && i.origem_tipo !== 'retiro' && <button className="btn-ghost !px-2" onClick={() => setPurchasing(i)}><Check size={15} /></button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && <NewItemModal onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
      {purchasing && <PurchaseModal item={purchasing} onClose={() => setPurchasing(null)} onSaved={() => { setPurchasing(null); load(); }} />}
    </div>
  );
}

function NewItemModal({ onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ produto: '', quantidade: 1, unidade: 'un', preco_estimado: '', responsavel: '' });
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!form.produto?.trim()) return toast.error('Informe o produto.');
    setSaving(true);
    try {
      await api.post('/shopping', { ...form, origem_tipo: 'geral' });
      toast.success('Item adicionado.');
      onSaved();
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setSaving(false); }
  }
  return (
    <Modal title="Novo item de compra geral" onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={save} disabled={saving}>Salvar</button></>}>
      <p className="text-xs text-forest-500 mb-3">Compras de um retiro específico devem ser cadastradas dentro do módulo do retiro para manter a lista organizada por edição.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2"><label className="label">Produto</label><input className="input" value={form.produto} onChange={(e) => setForm({ ...form, produto: e.target.value })} /></div>
        <div><label className="label">Quantidade</label><input type="number" className="input" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} /></div>
        <div><label className="label">Unidade</label><input className="input" value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} /></div>
        <div><label className="label">Preço estimado (R$)</label><input type="number" step="0.01" className="input" value={form.preco_estimado} onChange={(e) => setForm({ ...form, preco_estimado: e.target.value })} /></div>
        <div><label className="label">Responsável</label><input className="input" value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></div>
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
      toast.success('Item marcado como comprado.');
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
          Registrar automaticamente como saída no Financeiro Geral
        </label>
      </div>
    </Modal>
  );
}
