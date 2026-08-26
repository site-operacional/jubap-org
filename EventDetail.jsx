import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Pencil, Trash2, Plus, ArrowDownCircle, ArrowUpCircle, Package, Undo2, CheckCircle2, XCircle } from 'lucide-react';
import api, { money, formatDate } from '../../lib/api';
import { Spinner } from '../../components/Common';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast, apiErrorMessage } from '../../context/ToastContext';
import { EventModal } from './Events';

const STATUS_LABEL = { planejado: 'Planejado', confirmado: 'Confirmado', realizado: 'Realizado', cancelado: 'Cancelado' };
const STATUS_BADGE = { planejado: 'badge-gray', confirmado: 'badge-amber', realizado: 'badge-green', cancelado: 'badge-red' };

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [event, setEvent] = useState(null);
  const [types, setTypes] = useState([]);
  const [movements, setMovements] = useState({ incomes: [], expenses: [] });
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingMovement, setAddingMovement] = useState(null); // 'income' | 'expense'
  const [reserving, setReserving] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: e }, { data: t }, { data: incomesAll }, { data: expensesAll }, { data: res }] = await Promise.all([
      api.get(`/events/${id}`), api.get('/events/types'),
      api.get('/financial/all/incomes'), api.get('/financial/all/expenses'),
      api.get('/inventory/movements', { params: { evento_id: id } }),
    ]);
    setEvent(e);
    setTypes(t);
    setMovements({
      incomes: incomesAll.filter((i) => i.origem_tipo === 'evento' && i.origem_id === id),
      expenses: expensesAll.filter((x) => x.origem_tipo === 'evento' && x.origem_id === id),
    });
    setReservations(res);
    setLoading(false);
  }
  useEffect(() => { load(); }, [id]);

  async function handleReturn(itemId) {
    try {
      await api.post('/inventory/movements', { item_id: itemId, tipo: 'devolucao', evento_id: id, destino: event.nome });
      toast.success('Item devolvido ao estoque.');
      load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  }

  async function handleDelete() {
    try {
      await api.delete(`/events/${id}`);
      toast.success('Evento excluído.');
      navigate('/eventos');
    } catch (e) { toast.error(apiErrorMessage(e)); }
  }

  if (loading || !event) return <Spinner />;

  const entradas = movements.incomes.reduce((s, i) => s + i.valor, 0);
  const saidas = movements.expenses.reduce((s, e) => s + e.valor, 0);

  return (
    <div>
      <button onClick={() => navigate('/eventos')} className="flex items-center gap-1 text-sm text-forest-500 hover:text-forest-800 mb-4">
        <ChevronLeft size={15} /> Voltar para Eventos
      </button>

      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {event.tipo_nome && <span className="badge-green">{event.tipo_nome}</span>}
            <span className={STATUS_BADGE[event.status] || 'badge-gray'}>{STATUS_LABEL[event.status] || event.status}</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl text-forest-950">{event.nome}</h1>
          <p className="text-sm text-forest-500 mt-1">
            {formatDate(event.data)} {event.hora_inicio && `· ${event.hora_inicio}${event.hora_fim ? ` — ${event.hora_fim}` : ''}`} {event.local && `· ${event.local}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setEditing(true)}><Pencil size={15} /> Editar</button>
          <button className="btn-danger" onClick={() => setDeleting(true)}><Trash2 size={15} /> Excluir</button>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <div className="card p-4"><p className="text-xs text-forest-500 font-medium">Entradas</p><p className="font-display text-lg text-forest-950">{money(entradas)}</p></div>
        <div className="card p-4"><p className="text-xs text-forest-500 font-medium">Saídas</p><p className="font-display text-lg text-forest-950">{money(saidas)}</p></div>
        <div className="card p-4"><p className="text-xs text-forest-500 font-medium">Resultado</p><p className="font-display text-lg text-forest-950">{money(entradas - saidas)}</p></div>
      </div>

      {(event.responsavel || event.pregador || event.ministrante || event.louvor || event.convidados || event.equipe) && (
        <div className="card p-4 mb-6">
          <p className="font-display text-forest-900 mb-3">Pessoas envolvidas</p>
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            {event.responsavel && <div><p className="text-forest-500 text-xs">Responsável</p><p className="text-forest-900">{event.responsavel}</p></div>}
            {event.pregador && <div><p className="text-forest-500 text-xs">Pregador</p><p className="text-forest-900">{event.pregador}</p></div>}
            {event.ministrante && <div><p className="text-forest-500 text-xs">Ministrante</p><p className="text-forest-900">{event.ministrante}</p></div>}
            {event.louvor && <div><p className="text-forest-500 text-xs">Louvor</p><p className="text-forest-900">{event.louvor}</p></div>}
            {event.convidados && <div><p className="text-forest-500 text-xs">Convidados</p><p className="text-forest-900">{event.convidados}</p></div>}
            {event.equipe && <div><p className="text-forest-500 text-xs">Equipe</p><p className="text-forest-900">{event.equipe}</p></div>}
          </div>
        </div>
      )}

      {event.observacoes && (
        <div className="card p-4 mb-6">
          <p className="font-display text-forest-900 mb-2">Observações</p>
          <p className="text-sm text-forest-700 whitespace-pre-wrap">{event.observacoes}</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5 mb-5">
        <MovementCard title="Entradas" icon={ArrowDownCircle} items={movements.incomes} onAdd={() => setAddingMovement('income')} />
        <MovementCard title="Saídas" icon={ArrowUpCircle} items={movements.expenses} onAdd={() => setAddingMovement('expense')} />
      </div>

      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="flex items-center gap-1.5 font-display text-forest-900"><Package size={16} /> Itens reservados do estoque</p>
          <button className="btn-secondary !py-1.5 !px-2.5 text-xs" onClick={() => setReserving(true)}><Plus size={13} /> Reservar item</button>
        </div>
        {reservations.length === 0 ? <p className="text-sm text-forest-400 italic">Nenhum item reservado para este evento.</p> : (
          <div className="space-y-1.5">
            {reservations.map((r) => (
              <div key={r.item.id} className="flex items-center justify-between text-sm bg-forest-50 rounded-lg px-3 py-2">
                <div className="min-w-0 flex items-center gap-2">
                  {r.devolvido ? <CheckCircle2 size={14} className="text-forest-500 shrink-0" /> : <XCircle size={14} className="text-clay-600 shrink-0" />}
                  <span className="text-forest-800 truncate">{r.item.nome}</span>
                  <span className="text-xs text-forest-500">{r.item.quantidade} {r.item.unidade}</span>
                </div>
                {r.devolvido ? (
                  <span className="badge-green shrink-0">Devolvido</span>
                ) : (
                  <button className="btn-ghost !py-1 !px-2 text-xs shrink-0" onClick={() => handleReturn(r.item.id)}><Undo2 size={12} /> Devolver</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && <EventModal event={event} types={types} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />}
      {deleting && <ConfirmDialog title="Excluir evento" message={`Excluir "${event.nome}"? As movimentações financeiras já vinculadas permanecerão no histórico financeiro geral.`} confirmLabel="Excluir" danger onClose={() => setDeleting(false)} onConfirm={handleDelete} />}
      {addingMovement && (
        <EventMovementModal
          type={addingMovement}
          event={event}
          onClose={() => setAddingMovement(null)}
          onSaved={() => { setAddingMovement(null); load(); }}
        />
      )}
      {reserving && <ReserveItemModal event={event} onClose={() => setReserving(false)} onSaved={() => { setReserving(false); load(); }} />}
    </div>
  );
}

function MovementCard({ title, icon: Icon, items, onAdd }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="flex items-center gap-1.5 font-display text-forest-900"><Icon size={16} /> {title}</p>
        <button className="btn-secondary !py-1.5 !px-2.5 text-xs" onClick={onAdd}><Plus size={13} /> Adicionar</button>
      </div>
      {items.length === 0 ? <p className="text-sm text-forest-400 italic">Nenhum lançamento.</p> : (
        <div className="space-y-1.5">
          {items.map((i) => (
            <div key={i.id} className="flex items-center justify-between text-sm bg-forest-50 rounded-lg px-3 py-2">
              <div className="min-w-0">
                <p className="text-forest-800 truncate">{i.descricao}</p>
                <p className="text-xs text-forest-500">{formatDate(i.data)}</p>
              </div>
              <span className="money font-semibold shrink-0 ml-2">{money(i.valor)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EventMovementModal({ type, event, onClose, onSaved }) {
  const toast = useToast();
  const isIncome = type === 'income';
  const [form, setForm] = useState({ data: new Date().toISOString().slice(0, 10), descricao: '', valor: '', categoria_livre: '', responsavel: '' });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.descricao?.trim() || !form.valor) return toast.error('Informe a descrição e o valor.');
    setSaving(true);
    try {
      await api.post(`/financial/${isIncome ? 'incomes' : 'expenses'}`, {
        ...form, origem_tipo: 'evento', origem_id: event.id, origem_label: event.nome,
      });
      toast.success('Lançamento registrado.');
      onSaved();
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={`Nova ${isIncome ? 'entrada' : 'saída'} — ${event.nome}`} onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={save} disabled={saving}>Salvar</button></>}>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className="label">Data</label><input type="date" className="input" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
        <div><label className="label">Valor (R$)</label><input type="number" step="0.01" className="input" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
        <div className="sm:col-span-2"><label className="label">Descrição</label><input className="input" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
        <div><label className="label">Categoria</label><input className="input" value={form.categoria_livre} onChange={(e) => setForm({ ...form, categoria_livre: e.target.value })} placeholder="Ex: Som, Decoração..." /></div>
        <div><label className="label">Responsável</label><input className="input" value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></div>
      </div>
    </Modal>
  );
}

function ReserveItemModal({ event, onClose, onSaved }) {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [itemId, setItemId] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [observacao, setObservacao] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/inventory/items', { params: { estado: 'disponivel' } }).then(({ data }) => setItems(data));
  }, []);

  async function save() {
    if (!itemId) return toast.error('Selecione um item disponível.');
    setSaving(true);
    try {
      await api.post('/inventory/movements', {
        item_id: itemId, tipo: 'reserva', evento_id: event.id, destino: event.nome, responsavel, observacao,
      });
      toast.success('Item reservado para este evento.');
      onSaved();
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={`Reservar item do estoque — ${event.nome}`} onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={save} disabled={saving || !items}>Reservar</button></>}>
      {!items ? <Spinner /> : items.length === 0 ? (
        <p className="text-sm text-forest-500">Nenhum item disponível no estoque no momento — todos já estão reservados, emprestados ou em manutenção.</p>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="label">Item</label>
            <select className="input" value={itemId} onChange={(e) => setItemId(e.target.value)}>
              <option value="">Selecione um item disponível...</option>
              {items.map((i) => <option key={i.id} value={i.id}>{i.nome} ({i.quantidade} {i.unidade}){i.local_caminho ? ` — ${i.local_caminho}` : ''}</option>)}
            </select>
          </div>
          <div><label className="label">Responsável pela reserva</label><input className="input" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} /></div>
          <div><label className="label">Observação</label><textarea className="input" rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} /></div>
        </div>
      )}
    </Modal>
  );
}
