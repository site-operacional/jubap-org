import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Wallet, ArrowDownCircle, ArrowUpCircle, ExternalLink, CreditCard, Banknote, Check, AlertTriangle } from 'lucide-react';
import api, { money, formatDate } from '../../lib/api';
import { PageHeader, Spinner, EmptyState } from '../../components/Common';
import Modal from '../../components/Modal';
import { useToast, apiErrorMessage } from '../../context/ToastContext';

const ORIGIN_LABEL = { retiro: 'Retiro', evento: 'Evento', geral: 'Juventude Geral' };
export const FORMAS_PAGAMENTO = ['Pix', 'Dinheiro', 'Cartão de Débito', 'Cartão de Crédito', 'Outros'];

const TABS = [
  { k: 'entradas', l: 'Entradas', i: ArrowDownCircle },
  { k: 'saidas', l: 'Saídas', i: ArrowUpCircle },
  { k: 'parcelamentos', l: 'Parcelamentos', i: CreditCard },
  { k: 'caixa', l: 'Caixa em Espécie', i: Banknote },
];

export default function GeneralFinance() {
  const [tab, setTab] = useState('entradas');
  return (
    <div>
      <PageHeader title="Financeiro Geral" description="Visão consolidada de todas as origens — retiros, eventos e lançamentos gerais. Nada aqui é cadastrado duas vezes." />
      <div className="flex gap-1 mb-6 border-b border-forest-100 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${tab === t.k ? 'border-forest-700 text-forest-800' : 'border-transparent text-forest-500 hover:text-forest-700'}`}>
            <t.i size={15} /> {t.l}
          </button>
        ))}
      </div>
      {tab === 'entradas' && <MovementsTab type="income" />}
      {tab === 'saidas' && <MovementsTab type="expense" />}
      {tab === 'parcelamentos' && <InstallmentsTab />}
      {tab === 'caixa' && <CashRegisterTab />}
    </div>
  );
}

function MovementsTab({ type }) {
  const navigate = useNavigate();
  const isIncome = type === 'income';
  const collPath = isIncome ? 'incomes' : 'expenses';
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterOrigin, setFilterOrigin] = useState('');
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await api.get(`/financial/all/${collPath}`);
    setRows(data);
    setLoading(false);
  }
  useEffect(() => { load(); }, [type]);

  const filtered = filterOrigin ? rows.filter((r) => r.origem_tipo === filterOrigin) : rows;
  const total = filtered.reduce((s, r) => s + r.valor, 0);

  function goToOrigin(row) {
    if (row.origem_tipo === 'retiro' && row.origem_id) navigate(`/retiros/${row.origem_id}/financeiro`);
    else if (row.origem_tipo === 'evento' && row.origem_id) navigate(`/eventos/${row.origem_id}`);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <select className="input w-auto" value={filterOrigin} onChange={(e) => setFilterOrigin(e.target.value)}>
            <option value="">Todas as origens</option>
            <option value="retiro">Retiro</option>
            <option value="evento">Evento</option>
            <option value="geral">Juventude Geral</option>
          </select>
          <p className="text-sm text-forest-600">Total: <span className="font-mono font-semibold text-forest-900">{money(total)}</span></p>
        </div>
        <button className="btn-primary" onClick={() => setCreating(true)}><Plus size={16} /> Novo lançamento geral</button>
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <EmptyState icon={Wallet} title={`Nenhuma ${isIncome ? 'entrada' : 'saída'} registrada`} />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Forma</th><th>Origem</th><th>Valor</th></tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>{formatDate(r.data)}</td>
                  <td className="font-medium text-forest-900">{r.descricao}</td>
                  <td>{r.categoria_nome ? <span className="badge-green">{r.categoria_nome}</span> : <span className="badge-gray">Sem categoria</span>}</td>
                  <td className="text-forest-600 text-xs">{r.forma_recebimento || r.forma_pagamento || '—'}</td>
                  <td>
                    {r.origem_tipo && r.origem_tipo !== 'geral' && r.origem_id ? (
                      <button className="badge-amber flex items-center gap-1" onClick={() => goToOrigin(r)}>
                        {r.origem_label || ORIGIN_LABEL[r.origem_tipo]} <ExternalLink size={11} />
                      </button>
                    ) : (
                      <span className="badge-gray">Juventude Geral</span>
                    )}
                  </td>
                  <td className="money">{money(r.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && <GeneralMovementModal type={type} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
    </div>
  );
}

function GeneralMovementModal({ type, onClose, onSaved }) {
  const toast = useToast();
  const isIncome = type === 'income';
  const [form, setForm] = useState({ data: new Date().toISOString().slice(0, 10), descricao: '', valor: '', categoria_livre: '', responsavel: '', forma: FORMAS_PAGAMENTO[0] });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.descricao?.trim() || !form.valor) return toast.error('Informe a descrição e o valor.');
    setSaving(true);
    try {
      const body = { ...form, origem_tipo: 'geral' };
      if (isIncome) body.forma_recebimento = form.forma; else body.forma_pagamento = form.forma;
      await api.post(`/financial/${isIncome ? 'incomes' : 'expenses'}`, body);
      toast.success('Lançamento registrado.');
      onSaved();
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={`Nova ${isIncome ? 'entrada' : 'saída'} geral`} onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={save} disabled={saving}>Salvar</button></>}>
      <p className="text-xs text-forest-500 mb-3">
        Use isto para movimentações que não pertencem a um retiro nem a um evento específico.
        {!isIncome && ' Para compras parceladas no cartão de crédito, use a aba "Parcelamentos".'}
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className="label">Data</label><input type="date" className="input" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
        <div><label className="label">Valor (R$)</label><input type="number" step="0.01" className="input" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
        <div className="sm:col-span-2"><label className="label">Descrição</label><input className="input" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
        <div><label className="label">Categoria</label><input className="input" value={form.categoria_livre} onChange={(e) => setForm({ ...form, categoria_livre: e.target.value })} /></div>
        <div>
          <label className="label">{isIncome ? 'Forma de recebimento' : 'Forma de pagamento'}</label>
          <select className="input" value={form.forma} onChange={(e) => setForm({ ...form, forma: e.target.value })}>
            {FORMAS_PAGAMENTO.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div><label className="label">Responsável</label><input className="input" value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></div>
      </div>
    </Modal>
  );
}

// =====================================================================
// PARCELAMENTOS
// =====================================================================
function InstallmentsTab() {
  const toast = useToast();
  const [plans, setPlans] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: p }, { data: s }] = await Promise.all([api.get('/installments/plans'), api.get('/installments/summary')]);
    setPlans(p);
    setSummary(s);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function markPaid(installment) {
    try {
      await api.post(`/installments/${installment.id}/pay`, {});
      toast.success('Parcela marcada como paga — a saída já foi lançada no financeiro.');
      load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  }

  return (
    <div>
      {summary && (
        <div className="grid sm:grid-cols-3 gap-3 mb-5">
          <div className="card p-4"><p className="text-xs text-forest-500 font-medium">Total comprometido</p><p className="font-display text-lg text-forest-950">{money(summary.totalComprometido)}</p></div>
          <div className="card p-4"><p className="text-xs text-forest-500 font-medium">Já pago</p><p className="font-display text-lg text-forest-950">{money(summary.totalPago)}</p></div>
          <div className="card p-4"><p className="text-xs text-forest-500 font-medium">Atrasado</p><p className="font-display text-lg text-berry-600">{money(summary.totalAtrasado)}</p></div>
        </div>
      )}
      <div className="flex justify-end mb-4">
        <button className="btn-primary" onClick={() => setCreating(true)}><Plus size={16} /> Novo parcelamento</button>
      </div>

      {loading ? <Spinner /> : plans.length === 0 ? (
        <EmptyState icon={CreditCard} title="Nenhum parcelamento cadastrado" description="Registre compras feitas no cartão de crédito e acompanhe cada parcela." action={<button className="btn-primary" onClick={() => setCreating(true)}><Plus size={16}/>Novo parcelamento</button>} />
      ) : (
        <div className="space-y-4">
          {plans.map((p) => (
            <div key={p.id} className="card p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-display text-forest-900">{p.descricao}</p>
                  <p className="text-xs text-forest-500">{money(p.valor_total)} em {p.numero_parcelas}x · {p.pagas}/{p.numero_parcelas} pagas · {p.origem_label}</p>
                </div>
                <span className="font-mono text-sm text-forest-700">{money(p.totalPago)} / {money(p.totalComprometido)}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {p.parcelas.map((parc) => (
                  <div key={parc.id} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs ${
                    parc.status === 'paga' ? 'bg-forest-100 text-forest-700' : parc.status === 'atrasada' ? 'bg-red-50 text-berry-600' : 'bg-forest-50 text-forest-600'
                  }`}>
                    <span className="font-semibold">{parc.numero}/{p.numero_parcelas}</span>
                    <span>{money(parc.valor)}</span>
                    <span>· {formatDate(parc.vencimento)}</span>
                    {parc.status === 'atrasada' && <AlertTriangle size={12} />}
                    {parc.status === 'paga' ? <Check size={12} /> : (
                      <button className="underline font-medium" onClick={() => markPaid(parc)}>marcar paga</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && <PlanModal onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
    </div>
  );
}

function PlanModal({ onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ descricao: '', valor_total: '', numero_parcelas: 2, data_primeira_parcela: new Date().toISOString().slice(0, 10), responsavel: '', categoria_livre: '', observacao: '' });
  const [saving, setSaving] = useState(false);

  const valorParcela = form.valor_total && form.numero_parcelas ? (Number(form.valor_total) / Number(form.numero_parcelas)) : 0;

  async function save() {
    if (!form.descricao?.trim() || !form.valor_total || !form.numero_parcelas) return toast.error('Preencha descrição, valor total e número de parcelas.');
    setSaving(true);
    try {
      await api.post('/installments/plans', { ...form, origem_tipo: 'geral' });
      toast.success('Parcelamento registrado — as parcelas já foram geradas.');
      onSaved();
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setSaving(false); }
  }

  return (
    <Modal title="Novo parcelamento" onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={save} disabled={saving}>Gerar parcelas</button></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2"><label className="label">Descrição da compra</label><input className="input" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Caixas de som novas" /></div>
        <div><label className="label">Valor total (R$)</label><input type="number" step="0.01" className="input" value={form.valor_total} onChange={(e) => setForm({ ...form, valor_total: e.target.value })} /></div>
        <div><label className="label">Número de parcelas</label><input type="number" min="2" className="input" value={form.numero_parcelas} onChange={(e) => setForm({ ...form, numero_parcelas: e.target.value })} /></div>
        <div><label className="label">Data da 1ª parcela</label><input type="date" className="input" value={form.data_primeira_parcela} onChange={(e) => setForm({ ...form, data_primeira_parcela: e.target.value })} /></div>
        <div><label className="label">Categoria</label><input className="input" value={form.categoria_livre} onChange={(e) => setForm({ ...form, categoria_livre: e.target.value })} /></div>
        <div className="sm:col-span-2 bg-forest-50 rounded-lg px-3 py-2 text-sm text-forest-700 flex justify-between">
          <span>Valor aproximado de cada parcela</span>
          <span className="font-mono font-semibold">{money(valorParcela)}</span>
        </div>
        <div className="sm:col-span-2"><label className="label">Responsável</label><input className="input" value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></div>
      </div>
    </Modal>
  );
}

// =====================================================================
// CAIXA EM ESPÉCIE
// =====================================================================
function CashRegisterTab() {
  const toast = useToast();
  const [summary, setSummary] = useState(null);
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: s }, { data: d }] = await Promise.all([api.get('/cash/summary'), api.get('/cash/deposits')]);
    setSummary(s);
    setDeposits(d);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  return (
    <div>
      {summary && (
        <div className="grid sm:grid-cols-3 gap-3 mb-5">
          <div className="card p-4"><p className="text-xs text-forest-500 font-medium">Recebido em espécie</p><p className="font-display text-lg text-forest-950">{money(summary.totalRecebido)}</p></div>
          <div className="card p-4"><p className="text-xs text-forest-500 font-medium">Depositado</p><p className="font-display text-lg text-forest-950">{money(summary.totalDepositado)}</p></div>
          <div className="card p-4"><p className="text-xs text-forest-500 font-medium">Saldo esperado em caixa</p><p className="font-display text-lg text-forest-950">{money(summary.saldoEmEspecie)}</p></div>
        </div>
      )}
      <p className="text-xs text-forest-500 mb-4">O valor recebido soma automaticamente todas as entradas (de qualquer origem) registradas com forma de recebimento "Dinheiro".</p>
      <div className="flex justify-end mb-4">
        <button className="btn-primary" onClick={() => setCreating(true)}><Plus size={16} /> Registrar depósito</button>
      </div>

      {loading ? <Spinner /> : deposits.length === 0 ? (
        <EmptyState icon={Banknote} title="Nenhum depósito registrado" />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Data</th><th>Valor</th><th>Conta destino</th><th>Responsável</th><th>Observação</th></tr></thead>
            <tbody>
              {deposits.map((d) => (
                <tr key={d.id}>
                  <td>{formatDate(d.data)}</td>
                  <td className="money">{money(d.valor)}</td>
                  <td>{d.conta_destino || '—'}</td>
                  <td>{d.responsavel || '—'}</td>
                  <td className="text-forest-600 text-xs">{d.observacao || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && <DepositModal onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
    </div>
  );
}

function DepositModal({ onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ valor: '', data: new Date().toISOString().slice(0, 10), responsavel: '', conta_destino: '', comprovante: '', observacao: '' });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.valor) return toast.error('Informe o valor do depósito.');
    setSaving(true);
    try {
      await api.post('/cash/deposits', form);
      toast.success('Depósito registrado.');
      onSaved();
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setSaving(false); }
  }

  return (
    <Modal title="Registrar depósito" onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={save} disabled={saving}>Salvar</button></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className="label">Valor (R$)</label><input type="number" step="0.01" className="input" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
        <div><label className="label">Data</label><input type="date" className="input" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
        <div><label className="label">Conta de destino</label><input className="input" value={form.conta_destino} onChange={(e) => setForm({ ...form, conta_destino: e.target.value })} /></div>
        <div><label className="label">Responsável</label><input className="input" value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></div>
        <div className="sm:col-span-2"><label className="label">Comprovante (link ou referência)</label><input className="input" value={form.comprovante} onChange={(e) => setForm({ ...form, comprovante: e.target.value })} /></div>
        <div className="sm:col-span-2"><label className="label">Observação</label><textarea className="input" rows={2} value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} /></div>
      </div>
    </Modal>
  );
}
