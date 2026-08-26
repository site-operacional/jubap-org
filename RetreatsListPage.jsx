import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Copy, TentTree, ArrowRight } from 'lucide-react';
import api, { money } from '../../lib/api';
import { PageHeader, Spinner, EmptyState } from '../../components/Common';
import Modal from '../../components/Modal';
import { useToast, apiErrorMessage } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

export default function RetreatsListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { permissoes } = useAuth();
  const isAdmin = permissoes?.includes('*');
  const [editions, setEditions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [duplicating, setDuplicating] = useState(null);

  async function load() {
    setLoading(true);
    const { data } = await api.get('/editions');
    setEditions(data.sort((a, b) => b.ano - a.ano));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  return (
    <div>
      <PageHeader
        title="🏕️ Retiros"
        description="Cada ano do retiro é uma edição independente — os dados de uma nunca afetam as outras."
        action={isAdmin && <button className="btn-primary" onClick={() => setCreating(true)}><Plus size={16} /> Nova edição do zero</button>}
      />

      {loading ? <Spinner /> : editions.length === 0 ? (
        <EmptyState icon={TentTree} title="Nenhum retiro cadastrado ainda" description="Crie a primeira edição do retiro para começar." action={isAdmin && <button className="btn-primary" onClick={() => setCreating(true)}><Plus size={16}/>Nova edição</button>} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {editions.map((e) => (
            <div key={e.id} className="card p-5 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <div className="w-10 h-10 rounded-lg bg-forest-100 flex items-center justify-center">
                  <TentTree size={18} className="text-forest-700" />
                </div>
                {e.status === 'ativa' && <span className="badge-green">ativa</span>}
              </div>
              <p className="font-display text-lg text-forest-900">{e.nome}</p>
              <p className="text-sm text-forest-500 mb-4">{e.tema && e.tema !== 'A definir' ? e.tema : 'Tema a definir'}</p>
              <div className="flex-1" />
              <div className="flex gap-2">
                <button className="btn-primary flex-1 justify-center" onClick={() => navigate(`/retiros/${e.id}`)}>
                  Acessar <ArrowRight size={14} />
                </button>
                {isAdmin && <button className="btn-secondary !px-2.5" title="Duplicar edição" onClick={() => setDuplicating(e)}><Copy size={15} /></button>}
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && <NewEditionModal onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
      {duplicating && <DuplicateModal source={duplicating} onClose={() => setDuplicating(null)} onSaved={(id) => { setDuplicating(null); load(); navigate(`/retiros/${id}`); }} />}
    </div>
  );
}

function NewEditionModal({ onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ nome: '', ano: new Date().getFullYear() + 1, local: '' });
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!form.nome?.trim() || !form.ano) return toast.error('Informe nome e ano da edição.');
    setSaving(true);
    try {
      await api.post('/editions', form);
      toast.success('Edição criada.');
      onSaved();
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setSaving(false); }
  }
  return (
    <Modal title="Nova edição do retiro" onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={save} disabled={saving}>Criar edição</button></>}>
      <div className="space-y-3">
        <div><label className="label">Nome</label><input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Retiro 2027" /></div>
        <div><label className="label">Ano</label><input type="number" className="input" value={form.ano} onChange={(e) => setForm({ ...form, ano: Number(e.target.value) })} /></div>
      </div>
    </Modal>
  );
}

const COPY_OPTIONS = [
  { key: 'rooms', label: 'Estrutura de quartos', defaultChecked: true },
  { key: 'financialCategories', label: 'Categorias financeiras', defaultChecked: true },
  { key: 'shoppingCategories', label: 'Categorias de compras', defaultChecked: true },
  { key: 'schedule', label: 'Estrutura da programação', defaultChecked: true },
  { key: 'gymkhanaStructure', label: 'Estrutura da gincana (provas)', defaultChecked: true },
  { key: 'teams', label: 'Equipes', defaultChecked: true },
  { key: 'participants', label: 'Participantes', defaultChecked: false },
  { key: 'financial', label: 'Movimentações financeiras', defaultChecked: false },
  { key: 'fundraisers', label: 'Arrecadações', defaultChecked: false },
];

function DuplicateModal({ source, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ nome: `Retiro ${source.ano + 1}`, ano: source.ano + 1, local: source.local });
  const [copy, setCopy] = useState(Object.fromEntries(COPY_OPTIONS.map((o) => [o.key, o.defaultChecked])));
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.nome?.trim() || !form.ano) return toast.error('Informe nome e ano da nova edição.');
    setSaving(true);
    try {
      const { data } = await api.post(`/editions/${source.id}/duplicate`, { ...form, copy });
      toast.success(`Edição "${data.nome}" criada a partir de "${source.nome}".`);
      onSaved(data.id);
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={`Duplicar "${source.nome}"`} wide onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={save} disabled={saving}>Criar edição duplicada</button></>}>
      <p className="text-sm text-forest-600 mb-4">Você está criando uma nova edição baseada em "{source.nome}". A edição original nunca é alterada.</p>
      <div className="grid sm:grid-cols-3 gap-3 mb-5">
        <div><label className="label">Nome da nova edição</label><input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
        <div><label className="label">Ano</label><input type="number" className="input" value={form.ano} onChange={(e) => setForm({ ...form, ano: Number(e.target.value) })} /></div>
        <div><label className="label">Local</label><input className="input" value={form.local || ''} onChange={(e) => setForm({ ...form, local: e.target.value })} /></div>
      </div>
      <p className="label mb-2">O que deseja copiar?</p>
      <div className="grid sm:grid-cols-2 gap-2">
        {COPY_OPTIONS.map((o) => (
          <label key={o.key} className="flex items-center gap-2 text-sm text-forest-700 bg-forest-50 rounded-lg px-3 py-2 cursor-pointer">
            <input type="checkbox" className="accent-forest-700" checked={copy[o.key]} onChange={(e) => setCopy({ ...copy, [o.key]: e.target.checked })} />
            {o.label}
          </label>
        ))}
      </div>
      <p className="text-xs text-forest-500 mt-3">Dados financeiros e participantes não são copiados por padrão.</p>
    </Modal>
  );
}
