import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, PiggyBank, ExternalLink } from 'lucide-react';
import api, { money, formatDate } from '../../lib/api';
import { PageHeader, Spinner, EmptyState } from '../../components/Common';
import Modal from '../../components/Modal';
import { useToast, apiErrorMessage } from '../../context/ToastContext';

const TIPOS = ['Bazar', 'Cantina', 'Evento', 'Doação', 'Rifa', 'Outros'];

export default function GeneralFundraisers() {
  const navigate = useNavigate();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await api.get('/fundraisers/all');
    setRows(data);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const totalLiquido = rows.reduce((s, f) => s + f.resultado_liquido, 0);

  function goToOrigin(f) {
    if (f.origem_tipo === 'retiro' && f.origem_id) navigate(`/retiros/${f.origem_id}/arrecadacoes`);
    else if (f.origem_tipo === 'evento' && f.origem_id) navigate(`/eventos/${f.origem_id}`);
  }

  return (
    <div>
      <PageHeader
        title="Arrecadações"
        description={`Resultado líquido total (todas as origens): ${money(totalLiquido)}`}
        action={<button className="btn-primary" onClick={() => setCreating(true)}><Plus size={16} /> Nova arrecadação geral</button>}
      />

      {loading ? <Spinner /> : rows.length === 0 ? (
        <EmptyState icon={PiggyBank} title="Nenhuma arrecadação cadastrada" description="As arrecadações de retiros e eventos aparecem aqui automaticamente." action={<button className="btn-primary" onClick={() => setCreating(true)}><Plus size={16}/>Nova arrecadação geral</button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((f) => (
            <div key={f.id} className="card p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-display text-forest-900">{f.nome}</p>
                  <p className="text-xs text-forest-500">{f.tipo} · {formatDate(f.data)}</p>
                </div>
                {f.origem_tipo && f.origem_tipo !== 'geral' && f.origem_id ? (
                  <button className="badge-amber flex items-center gap-1" onClick={() => goToOrigin(f)}>{f.origem_label} <ExternalLink size={11} /></button>
                ) : <span className="badge-gray">Geral</span>}
              </div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between"><span className="text-forest-500">Arrecadado</span><span className="money">{money(f.valor_arrecadado)}</span></div>
                <div className="flex justify-between"><span className="text-forest-500">Despesas</span><span className="money">{money(f.despesas)}</span></div>
                <div className="flex justify-between font-semibold border-t border-forest-100 pt-1"><span className="text-forest-700">Resultado líquido</span><span className="money">{money(f.resultado_liquido)}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && <NewFundraiserModal onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
    </div>
  );
}

function NewFundraiserModal({ onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ nome: '', tipo: 'Bazar', data: new Date().toISOString().slice(0, 10), responsavel: '', valor_arrecadado: '', despesas: '', observacoes: '' });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.nome?.trim()) return toast.error('Informe o nome da arrecadação.');
    setSaving(true);
    try {
      await api.post('/fundraisers', { ...form, origem_tipo: 'geral' });
      toast.success('Arrecadação cadastrada.');
      onSaved();
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setSaving(false); }
  }

  return (
    <Modal title="Nova arrecadação geral" onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={save} disabled={saving}>Salvar</button></>}>
      <p className="text-xs text-forest-500 mb-3">Arrecadações de um retiro específico devem ser cadastradas dentro do módulo do retiro (Retiros → edição → Arrecadações), para manter tudo organizado por edição.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2"><label className="label">Nome</label><input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
        <div>
          <label className="label">Tipo</label>
          <select className="input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div><label className="label">Data</label><input type="date" className="input" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
        <div><label className="label">Responsável</label><input className="input" value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></div>
        <div><label className="label">Valor arrecadado (R$)</label><input type="number" step="0.01" className="input" value={form.valor_arrecadado} onChange={(e) => setForm({ ...form, valor_arrecadado: e.target.value })} /></div>
        <div><label className="label">Despesas (R$)</label><input type="number" step="0.01" className="input" value={form.despesas} onChange={(e) => setForm({ ...form, despesas: e.target.value })} /></div>
      </div>
    </Modal>
  );
}
