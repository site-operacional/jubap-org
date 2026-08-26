import { useEffect, useState } from 'react';
import { Plus, PiggyBank, Pencil, Trash2, Link2 } from 'lucide-react';
import api, { money, formatDate } from '../../lib/api';
import { useEdition } from '../../context/EditionContext';
import { PageHeader, Spinner, EmptyState } from '../../components/Common';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast, apiErrorMessage } from '../../context/ToastContext';

const TIPOS = ['Bazar', 'Cantina', 'Evento', 'Doação', 'Rifa', 'Outros'];

export default function Fundraisers() {
  const { currentId } = useEdition();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  async function load() {
    if (!currentId) return;
    setLoading(true);
    const { data } = await api.get('/fundraisers', { params: { edition_id: currentId } });
    setRows(data);
    setLoading(false);
  }
  useEffect(() => { load(); }, [currentId]);

  async function handleDelete(f) {
    try { await api.delete(`/fundraisers/${f.id}`); toast.success('Arrecadação excluída.'); load(); }
    catch (e) { toast.error(apiErrorMessage(e)); }
  }

  async function integrate(f) {
    try {
      await api.post(`/fundraisers/${f.id}/integrate`);
      toast.success('Resultado líquido integrado ao financeiro.');
      load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  }

  const totalLiquido = rows.reduce((s, f) => s + f.resultado_liquido, 0);

  return (
    <div>
      <PageHeader
        title="Arrecadações"
        description={`Resultado líquido total: ${money(totalLiquido)}`}
        action={<button className="btn-primary" onClick={() => setEditing('new')}><Plus size={16} /> Nova arrecadação</button>}
      />

      {loading ? <Spinner /> : rows.length === 0 ? (
        <EmptyState icon={PiggyBank} title="Nenhuma arrecadação cadastrada" description="Registre bazares, cantinas, rifas e outras ações para arrecadar fundos." action={<button className="btn-primary" onClick={() => setEditing('new')}><Plus size={16}/>Nova arrecadação</button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((f) => (
            <div key={f.id} className="card p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-display text-forest-900">{f.nome}</p>
                  <p className="text-xs text-forest-500">{f.tipo} · {formatDate(f.data)}</p>
                </div>
                {f.integrado_financeiro ? <span className="badge-green">integrada</span> : <span className="badge-gray">não integrada</span>}
              </div>
              <div className="text-sm space-y-1 mb-3">
                <div className="flex justify-between"><span className="text-forest-500">Arrecadado</span><span className="money">{money(f.valor_arrecadado)}</span></div>
                <div className="flex justify-between"><span className="text-forest-500">Despesas</span><span className="money">{money(f.despesas)}</span></div>
                <div className="flex justify-between font-semibold border-t border-forest-100 pt-1"><span className="text-forest-700">Resultado líquido</span><span className="money">{money(f.resultado_liquido)}</span></div>
              </div>
              <div className="flex gap-1.5">
                {!f.integrado_financeiro && <button className="btn-secondary !py-1.5 !px-2.5 text-xs flex-1" onClick={() => integrate(f)}><Link2 size={13} /> Integrar ao financeiro</button>}
                <button className="btn-ghost !px-2" onClick={() => setEditing(f)}><Pencil size={14} /></button>
                <button className="btn-ghost !px-2 text-berry-500 hover:bg-red-50" onClick={() => setDeleting(f)}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <FundraiserModal fundraiser={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {deleting && <ConfirmDialog title="Excluir arrecadação" message={`Excluir "${deleting.nome}"?`} confirmLabel="Excluir" danger onClose={() => setDeleting(null)} onConfirm={() => handleDelete(deleting)} />}
    </div>
  );
}

function FundraiserModal({ fundraiser, onClose, onSaved }) {
  const { currentId } = useEdition();
  const toast = useToast();
  const [form, setForm] = useState(() => fundraiser || { nome: '', tipo: 'Bazar', data: new Date().toISOString().slice(0, 10), responsavel: '', valor_arrecadado: '', despesas: '', observacoes: '' });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.nome?.trim()) return toast.error('Informe o nome da arrecadação.');
    setSaving(true);
    try {
      if (fundraiser) await api.put(`/fundraisers/${fundraiser.id}`, form);
      else await api.post('/fundraisers', { ...form, edition_id: currentId });
      toast.success(fundraiser ? 'Arrecadação atualizada.' : 'Arrecadação cadastrada.');
      onSaved();
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={fundraiser ? 'Editar arrecadação' : 'Nova arrecadação'} onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={save} disabled={saving}>Salvar</button></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2"><label className="label">Nome</label><input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
        <div>
          <label className="label">Tipo</label>
          <select className="input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div><label className="label">Data</label><input type="date" className="input" value={form.data || ''} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
        <div><label className="label">Responsável</label><input className="input" value={form.responsavel || ''} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></div>
        <div><label className="label">Valor arrecadado (R$)</label><input type="number" step="0.01" className="input" value={form.valor_arrecadado} onChange={(e) => setForm({ ...form, valor_arrecadado: e.target.value })} /></div>
        <div><label className="label">Despesas relacionadas (R$)</label><input type="number" step="0.01" className="input" value={form.despesas} onChange={(e) => setForm({ ...form, despesas: e.target.value })} /></div>
        <div className="sm:col-span-2"><label className="label">Observações</label><textarea className="input" rows={2} value={form.observacoes || ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
      </div>
    </Modal>
  );
}
