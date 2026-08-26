import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Users } from 'lucide-react';
import api, { money } from '../../lib/api';
import { useEdition } from '../../context/EditionContext';
import { PageHeader, Spinner, EmptyState } from '../../components/Common';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast, apiErrorMessage } from '../../context/ToastContext';

const ACOMODACOES = ['Individual', 'Coletivo', 'Barraca'];
const CLASSIFICACOES = ['Meia', 'Inteira', 'Não paga'];

function statusBadge(status) {
  if (status === 'Pago') return 'badge-green';
  if (status === 'Parcial') return 'badge-amber';
  return 'badge-red';
}

export default function Participants() {
  const { currentId } = useEdition();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [editing, setEditing] = useState(null); // participant being edited, or 'new'
  const [deleting, setDeleting] = useState(null);

  async function load() {
    if (!currentId) return;
    setLoading(true);
    const params = { edition_id: currentId };
    if (q) params.q = q;
    if (statusFilter) params.status = statusFilter;
    if (classFilter) params.classificacao = classFilter;
    const [{ data: list }, { data: sum }] = await Promise.all([
      api.get('/participants', { params }),
      api.get('/participants/summary', { params: { edition_id: currentId } }),
    ]);
    setRows(list);
    setSummary(sum);
    setLoading(false);
  }

  useEffect(() => { load(); }, [currentId, q, statusFilter, classFilter]);

  async function handleDelete(p) {
    try {
      await api.delete(`/participants/${p.id}`);
      toast.success(`Participante "${p.nome}" excluído.`);
      load();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  }

  return (
    <div>
      <PageHeader
        title="Participantes"
        description={summary ? `${summary.total} cadastrados · ${summary.pendentes} pendentes · ${summary.parciais} parciais · ${summary.pagos} pagos` : ''}
        action={<button className="btn-primary" onClick={() => setEditing('new')}><Plus size={16} /> Novo participante</button>}
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-400" />
          <input className="input pl-9" placeholder="Buscar por nome..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="Pago">Pago</option>
          <option value="Parcial">Parcial</option>
          <option value="Pendente">Pendente</option>
        </select>
        <select className="input w-auto" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="">Todas as classificações</option>
          {CLASSIFICACOES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? <Spinner /> : rows.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum participante encontrado" description="Cadastre o primeiro participante desta edição do retiro." action={<button className="btn-primary" onClick={() => setEditing('new')}><Plus size={16}/>Novo participante</button>} />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Acomodação</th>
                <th>Classificação</th>
                <th>Inscrição</th>
                <th>Pago</th>
                <th>Restante</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium text-forest-900">{p.nome}</td>
                  <td>{p.tipo_acomodacao}</td>
                  <td>{p.classificacao}</td>
                  <td className="money">{money(p.valor_inscricao)}</td>
                  <td className="money">{money(p.valor_pago)}</td>
                  <td className="money">{money(p.valor_restante)}</td>
                  <td><span className={statusBadge(p.status_pagamento)}>{p.status_pagamento}</span></td>
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

      {editing && (
        <ParticipantModal
          participant={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Excluir participante"
          message={`Tem certeza que deseja excluir "${deleting.nome}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          danger
          onClose={() => setDeleting(null)}
          onConfirm={() => handleDelete(deleting)}
        />
      )}
    </div>
  );
}

function ParticipantModal({ participant, onClose, onSaved }) {
  const { currentId } = useEdition();
  const toast = useToast();
  const [form, setForm] = useState(() => participant || {
    nome: '', telefone: '', responsavel: '', observacoes: '',
    tipo_acomodacao: 'Coletivo', classificacao: 'Inteira', valor_inscricao: 0, valor_pago: 0,
  });
  const [saving, setSaving] = useState(false);

  const restante = Math.max((Number(form.valor_inscricao) || 0) - (Number(form.valor_pago) || 0), 0);

  async function save() {
    if (!form.nome?.trim()) return toast.error('Informe o nome do participante.');
    setSaving(true);
    try {
      if (participant) {
        await api.put(`/participants/${participant.id}`, form);
        toast.success('Participante atualizado.');
      } else {
        await api.post('/participants', { ...form, edition_id: currentId });
        toast.success('Participante cadastrado.');
      }
      onSaved();
    } catch (e) {
      toast.error(apiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={participant ? 'Editar participante' : 'Novo participante'}
      wide
      onClose={onClose}
      footer={<>
        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn-primary" onClick={save} disabled={saving}>Salvar</button>
      </>}
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2"><label className="label">Nome completo</label><input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
        <div><label className="label">Telefone</label><input className="input" value={form.telefone || ''} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
        <div><label className="label">Responsável</label><input className="input" value={form.responsavel || ''} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></div>

        <div>
          <label className="label">Tipo de acomodação</label>
          <select className="input" value={form.tipo_acomodacao} onChange={(e) => setForm({ ...form, tipo_acomodacao: e.target.value })}>
            {ACOMODACOES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Classificação</label>
          <select className="input" value={form.classificacao} onChange={(e) => setForm({ ...form, classificacao: e.target.value })}>
            {CLASSIFICACOES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div><label className="label">Valor da inscrição (R$)</label><input type="number" step="0.01" className="input" value={form.valor_inscricao} onChange={(e) => setForm({ ...form, valor_inscricao: e.target.value })} /></div>
        <div><label className="label">Valor pago (R$)</label><input type="number" step="0.01" className="input" value={form.valor_pago} onChange={(e) => setForm({ ...form, valor_pago: e.target.value })} /></div>

        <div className="sm:col-span-2 bg-forest-50 rounded-lg px-3 py-2 text-sm text-forest-700 flex justify-between">
          <span>Valor restante calculado automaticamente</span>
          <span className="font-mono font-semibold">{money(restante)}</span>
        </div>

        <div className="sm:col-span-2"><label className="label">Observações</label><textarea className="input" rows={2} value={form.observacoes || ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
      </div>
    </Modal>
  );
}
