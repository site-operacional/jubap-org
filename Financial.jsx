import { useEffect, useState } from 'react';
import { Plus, Wallet, Pencil, Trash2, ArrowDownCircle, ArrowUpCircle, Tag } from 'lucide-react';
import api, { money, formatDate } from '../../lib/api';
import { useEdition } from '../../context/EditionContext';
import { PageHeader, Spinner, EmptyState } from '../../components/Common';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast, apiErrorMessage } from '../../context/ToastContext';

const FORMAS_PAGAMENTO = ['Pix', 'Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'Outros'];

const TABS = [
  { key: 'entradas', label: 'Entradas', icon: ArrowDownCircle },
  { key: 'saidas', label: 'Saídas', icon: ArrowUpCircle },
  { key: 'categorias', label: 'Categorias', icon: Tag },
];

export default function Financial() {
  const [tab, setTab] = useState('entradas');
  return (
    <div>
      <PageHeader title="Financeiro" description="Controle de entradas, saídas e categorias financeiras da edição atual." />
      <div className="flex gap-1 mb-6 border-b border-forest-100">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.key ? 'border-forest-700 text-forest-800' : 'border-transparent text-forest-500 hover:text-forest-700'
            }`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'entradas' && <MovementTab type="income" />}
      {tab === 'saidas' && <MovementTab type="expense" />}
      {tab === 'categorias' && <CategoriesTab />}
    </div>
  );
}

function MovementTab({ type }) {
  const { currentId } = useEdition();
  const toast = useToast();
  const isIncome = type === 'income';
  const endpoint = isIncome ? '/financial/incomes' : '/financial/expenses';
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  async function load() {
    if (!currentId) return;
    setLoading(true);
    const [{ data: rows }, { data: cats }] = await Promise.all([
      api.get(endpoint, { params: { edition_id: currentId } }),
      api.get('/categories', { params: { edition_id: currentId, tipo: isIncome ? 'entrada' : 'saida' } }),
    ]);
    setRows(rows);
    setCategories(cats.filter((c) => c.ativo));
    setLoading(false);
  }
  useEffect(() => { load(); }, [currentId, type]);

  const total = rows.reduce((s, r) => s + r.valor, 0);

  async function handleDelete(row) {
    try {
      await api.delete(`${endpoint}/${row.id}`);
      toast.success('Registro excluído.');
      load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-forest-600">
          Total: <span className="font-mono font-semibold text-forest-900">{money(total)}</span> em {rows.length} lançamento(s)
        </p>
        <button className="btn-primary" onClick={() => setEditing('new')}><Plus size={16} /> Nova {isIncome ? 'entrada' : 'saída'}</button>
      </div>

      {loading ? <Spinner /> : rows.length === 0 ? (
        <EmptyState icon={Wallet} title={`Nenhuma ${isIncome ? 'entrada' : 'saída'} registrada`} description="Adicione o primeiro lançamento financeiro." action={<button className="btn-primary" onClick={() => setEditing('new')}><Plus size={16}/>Adicionar</button>} />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Responsável</th><th>Valor</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{formatDate(r.data)}</td>
                  <td className="font-medium text-forest-900">{r.descricao}</td>
                  <td>{r.categoria_nome ? <span className="badge-green">{r.categoria_nome}</span> : <span className="badge-gray">Sem categoria</span>}</td>
                  <td className="text-forest-600">{r.responsavel || '—'}</td>
                  <td className="money">{money(r.valor)}</td>
                  <td>
                    <div className="flex gap-1 justify-end">
                      <button className="btn-ghost !px-2" onClick={() => setEditing(r)}><Pencil size={15} /></button>
                      <button className="btn-ghost !px-2 text-berry-500 hover:bg-red-50" onClick={() => setDeleting(r)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <MovementModal type={type} row={editing === 'new' ? null : editing} categories={categories} endpoint={endpoint} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
      {deleting && (
        <ConfirmDialog title="Excluir lançamento" message={`Excluir "${deleting.descricao}" (${money(deleting.valor)})?`} confirmLabel="Excluir" danger onClose={() => setDeleting(null)} onConfirm={() => handleDelete(deleting)} />
      )}
    </div>
  );
}

function MovementModal({ type, row, categories, endpoint, onClose, onSaved }) {
  const { currentId } = useEdition();
  const toast = useToast();
  const isIncome = type === 'income';
  const [form, setForm] = useState(() => row || {
    data: new Date().toISOString().slice(0, 10), descricao: '', valor: '', category_id: '',
    responsavel: '', forma_recebimento: FORMAS_PAGAMENTO[0], forma_pagamento: FORMAS_PAGAMENTO[0], observacao: '',
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.descricao?.trim() || !form.valor) return toast.error('Informe a descrição e o valor.');
    setSaving(true);
    try {
      if (row) await api.put(`${endpoint}/${row.id}`, form);
      else await api.post(endpoint, { ...form, edition_id: currentId });
      toast.success(row ? 'Lançamento atualizado.' : 'Lançamento registrado.');
      onSaved();
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={row ? 'Editar lançamento' : `Nova ${isIncome ? 'entrada' : 'saída'}`} onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={save} disabled={saving}>Salvar</button></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className="label">Data</label><input type="date" className="input" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
        <div><label className="label">Valor (R$)</label><input type="number" step="0.01" className="input" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
        <div className="sm:col-span-2"><label className="label">Descrição</label><input className="input" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
        <div>
          <label className="label">Categoria</label>
          <select className="input" value={form.category_id || ''} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
            <option value="">Sem categoria</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div><label className="label">Responsável</label><input className="input" value={form.responsavel || ''} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></div>
        <div className="sm:col-span-2">
          <label className="label">{isIncome ? 'Forma de recebimento' : 'Forma de pagamento'}</label>
          <select className="input" value={isIncome ? (form.forma_recebimento || FORMAS_PAGAMENTO[0]) : (form.forma_pagamento || FORMAS_PAGAMENTO[0])} onChange={(e) => setForm(isIncome ? { ...form, forma_recebimento: e.target.value } : { ...form, forma_pagamento: e.target.value })}>
            {FORMAS_PAGAMENTO.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2"><label className="label">Observação</label><textarea className="input" rows={2} value={form.observacao || ''} onChange={(e) => setForm({ ...form, observacao: e.target.value })} /></div>
      </div>
    </Modal>
  );
}

function CategoriesTab() {
  const { currentId } = useEdition();
  const toast = useToast();
  const [incomeCats, setIncomeCats] = useState([]);
  const [expenseCats, setExpenseCats] = useState([]);
  const [adding, setAdding] = useState(null); // 'entrada' | 'saida'
  const [name, setName] = useState('');

  async function load() {
    if (!currentId) return;
    const [{ data: inc }, { data: exp }] = await Promise.all([
      api.get('/categories', { params: { edition_id: currentId, tipo: 'entrada' } }),
      api.get('/categories', { params: { edition_id: currentId, tipo: 'saida' } }),
    ]);
    setIncomeCats(inc);
    setExpenseCats(exp);
  }
  useEffect(() => { load(); }, [currentId]);

  async function addCategory() {
    if (!name.trim()) return;
    try {
      await api.post('/categories', { edition_id: currentId, tipo: adding, nome: name.trim() });
      toast.success('Categoria adicionada.');
      setName(''); setAdding(null); load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  }

  async function toggleActive(cat) {
    await api.put(`/categories/${cat.id}`, { ativo: !cat.ativo });
    load();
  }

  function List({ title, items, tipo }) {
    return (
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-display text-forest-900">{title}</p>
          <button className="btn-secondary !py-1.5 !px-3 text-xs" onClick={() => setAdding(tipo)}><Plus size={13} /> Categoria</button>
        </div>
        <div className="space-y-1.5">
          {items.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-forest-50">
              <span className={`text-sm ${c.ativo ? 'text-forest-800' : 'text-forest-400 line-through'}`}>{c.nome}</span>
              <button onClick={() => toggleActive(c)} className={c.ativo ? 'badge-green' : 'badge-gray'}>{c.ativo ? 'ativa' : 'inativa'}</button>
            </div>
          ))}
          {items.length === 0 && <p className="text-sm text-forest-400 italic">Nenhuma categoria cadastrada.</p>}
        </div>
        {adding === tipo && (
          <div className="mt-3 flex gap-2">
            <input autoFocus className="input" placeholder="Nome da categoria" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCategory()} />
            <button className="btn-primary !px-3" onClick={addCategory}>Adicionar</button>
            <button className="btn-ghost !px-3" onClick={() => { setAdding(null); setName(''); }}>Cancelar</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <List title="Categorias de entrada" items={incomeCats} tipo="entrada" />
      <List title="Categorias de saída" items={expenseCats} tipo="saida" />
    </div>
  );
}
