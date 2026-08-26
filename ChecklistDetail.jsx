import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2, Pencil, Square, CircleDot, CheckSquare2 } from 'lucide-react';
import api, { formatDate } from '../../lib/api';
import { Spinner } from '../../components/Common';
import Modal from '../../components/Modal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useToast, apiErrorMessage } from '../../context/ToastContext';
import { ChecklistModal } from './Checklists';

const PRIORITY_BADGE = { baixa: 'badge-gray', media: 'badge-amber', alta: 'badge-red', urgente: 'badge-red' };
const PRIORITY_LABEL = { baixa: 'Baixa', media: 'Média', alta: 'Alta', urgente: 'Urgente' };
const STATUS_CYCLE = { pendente: 'andamento', andamento: 'concluido', concluido: 'pendente' };
const STATUS_ICON = { pendente: Square, andamento: CircleDot, concluido: CheckSquare2 };
const STATUS_COLOR = { pendente: 'text-forest-300', andamento: 'text-clay-500', concluido: 'text-forest-600' };

export default function ChecklistDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [checklist, setChecklist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [addingSection, setAddingSection] = useState(false);
  const [sectionName, setSectionName] = useState('');
  const [addingItem, setAddingItem] = useState(null); // section_id or 'none'
  const [editingItem, setEditingItem] = useState(null);

  async function load() {
    setLoading(true);
    const { data } = await api.get(`/checklists/${id}`);
    setChecklist(data);
    setLoading(false);
  }
  useEffect(() => { load(); }, [id]);

  async function toggleStatus(item) {
    const next = STATUS_CYCLE[item.status];
    await api.put(`/checklists/items/${item.id}`, { status: next });
    load();
  }

  async function addSection() {
    if (!sectionName.trim()) return;
    try {
      await api.post('/checklists/sections', { checklist_id: id, nome: sectionName.trim() });
      setSectionName(''); setAddingSection(false); load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  }

  async function deleteSection(sectionId) {
    await api.delete(`/checklists/sections/${sectionId}`);
    load();
  }

  async function deleteItem(itemId) {
    await api.delete(`/checklists/items/${itemId}`);
    load();
  }

  async function handleDelete() {
    try {
      await api.delete(`/checklists/${id}`);
      toast.success('Checklist excluído.');
      navigate('/checklists');
    } catch (e) { toast.error(apiErrorMessage(e)); }
  }

  if (loading || !checklist) return <Spinner />;

  return (
    <div>
      <button onClick={() => navigate('/checklists')} className="flex items-center gap-1 text-sm text-forest-500 hover:text-forest-800 mb-4">
        <ChevronLeft size={15} /> Voltar para Checklists
      </button>

      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div>
          <h1 className="font-display text-2xl text-forest-950">{checklist.nome}</h1>
          {checklist.descricao && <p className="text-sm text-forest-500 mt-1">{checklist.descricao}</p>}
          <p className="text-xs text-forest-500 mt-1">
            {checklist.responsavel_geral && `Responsável: ${checklist.responsavel_geral} · `}
            {checklist.prazo && `Prazo: ${formatDate(checklist.prazo)}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => setEditing(true)}><Pencil size={15} /> Editar</button>
          <button className="btn-danger" onClick={() => setDeleting(true)}><Trash2 size={15} /> Excluir</button>
        </div>
      </div>

      <div className="w-full bg-forest-100 rounded-full h-2.5 mb-1.5">
        <div className="bg-forest-600 h-2.5 rounded-full transition-all" style={{ width: `${checklist.progresso}%` }} />
      </div>
      <p className="text-sm text-forest-600 mb-6">{checklist.itens_concluidos} de {checklist.total_itens} tarefas concluídas — {checklist.progresso}%</p>

      <div className="space-y-5">
        {checklist.sections.map((section) => (
          <SectionBlock key={section.id} section={section} onAddItem={() => setAddingItem(section.id)} onDeleteSection={() => deleteSection(section.id)} onToggle={toggleStatus} onEditItem={setEditingItem} onDeleteItem={deleteItem} />
        ))}

        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-display text-forest-900 text-sm uppercase tracking-wide">{checklist.sections.length ? 'Sem seção' : 'Tarefas'}</p>
            <button className="btn-secondary !py-1.5 !px-2.5 text-xs" onClick={() => setAddingItem('none')}><Plus size={13} /> Tarefa</button>
          </div>
          <ItemList items={checklist.itemsSemSecao} onToggle={toggleStatus} onEdit={setEditingItem} onDelete={deleteItem} />
        </div>

        {addingSection ? (
          <div className="flex gap-2">
            <input autoFocus className="input" placeholder="Nome da seção (ex: MONTAGEM)" value={sectionName} onChange={(e) => setSectionName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSection()} />
            <button className="btn-primary !px-4" onClick={addSection}>Adicionar</button>
            <button className="btn-ghost !px-4" onClick={() => setAddingSection(false)}>Cancelar</button>
          </div>
        ) : (
          <button className="btn-secondary" onClick={() => setAddingSection(true)}><Plus size={15} /> Nova seção</button>
        )}
      </div>

      {editing && <ChecklistModal checklist={checklist} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />}
      {deleting && <ConfirmDialog title="Excluir checklist" message={`Excluir "${checklist.nome}" e todas as suas tarefas?`} confirmLabel="Excluir" danger onClose={() => setDeleting(false)} onConfirm={handleDelete} />}
      {addingItem && <ItemModal checklistId={id} sectionId={addingItem === 'none' ? null : addingItem} onClose={() => setAddingItem(null)} onSaved={() => { setAddingItem(null); load(); }} />}
      {editingItem && <ItemModal checklistId={id} item={editingItem} onClose={() => setEditingItem(null)} onSaved={() => { setEditingItem(null); load(); }} />}
    </div>
  );
}

function SectionBlock({ section, onAddItem, onDeleteSection, onToggle, onEditItem, onDeleteItem }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-display text-forest-900 text-sm uppercase tracking-wide">{section.nome}</p>
        <div className="flex gap-1">
          <button className="btn-secondary !py-1.5 !px-2.5 text-xs" onClick={onAddItem}><Plus size={13} /> Tarefa</button>
          <button className="btn-ghost !px-2 text-berry-500 hover:bg-red-50" onClick={onDeleteSection}><Trash2 size={14} /></button>
        </div>
      </div>
      <ItemList items={section.items} onToggle={onToggle} onEdit={onEditItem} onDelete={onDeleteItem} />
    </div>
  );
}

function ItemList({ items, onToggle, onEdit, onDelete }) {
  if (!items.length) return <p className="text-sm text-forest-400 italic">Nenhuma tarefa.</p>;
  return (
    <div className="space-y-1">
      {items.map((item) => {
        const Icon = STATUS_ICON[item.status];
        return (
          <div key={item.id} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-forest-50 group">
            <button onClick={() => onToggle(item)} className={STATUS_COLOR[item.status]}><Icon size={19} /></button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${item.status === 'concluido' ? 'text-forest-400 line-through' : 'text-forest-800'}`}>{item.descricao}</p>
              <p className="text-xs text-forest-500">{item.responsavel && `${item.responsavel} · `}{item.prazo && formatDate(item.prazo)}</p>
            </div>
            <span className={PRIORITY_BADGE[item.prioridade]}>{PRIORITY_LABEL[item.prioridade]}</span>
            <div className="hidden group-hover:flex gap-1">
              <button className="btn-ghost !px-1.5 !py-1" onClick={() => onEdit(item)}><Pencil size={13} /></button>
              <button className="btn-ghost !px-1.5 !py-1 text-berry-500" onClick={() => onDelete(item.id)}><Trash2 size={13} /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ItemModal({ checklistId, sectionId, item, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(() => item || { descricao: '', responsavel: '', prazo: '', prioridade: 'media' });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.descricao?.trim()) return toast.error('Descreva a tarefa.');
    setSaving(true);
    try {
      if (item) await api.put(`/checklists/items/${item.id}`, form);
      else await api.post('/checklists/items', { ...form, checklist_id: checklistId, section_id: sectionId });
      toast.success(item ? 'Tarefa atualizada.' : 'Tarefa adicionada.');
      onSaved();
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={item ? 'Editar tarefa' : 'Nova tarefa'} onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={save} disabled={saving}>Salvar</button></>}>
      <div className="space-y-3">
        <div><label className="label">Descrição</label><input className="input" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Responsável</label><input className="input" value={form.responsavel || ''} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></div>
          <div><label className="label">Prazo</label><input type="date" className="input" value={form.prazo || ''} onChange={(e) => setForm({ ...form, prazo: e.target.value })} /></div>
        </div>
        <div>
          <label className="label">Prioridade</label>
          <select className="input" value={form.prioridade} onChange={(e) => setForm({ ...form, prioridade: e.target.value })}>
            <option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option><option value="urgente">Urgente</option>
          </select>
        </div>
        <div><label className="label">Observação</label><textarea className="input" rows={2} value={form.observacao || ''} onChange={(e) => setForm({ ...form, observacao: e.target.value })} /></div>
      </div>
    </Modal>
  );
}
