import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Settings as SettingsIcon, Users as UsersIcon, ShieldCheck, CalendarDays, Tag, Palette, Upload, RotateCcw } from 'lucide-react';
import api from '../lib/api';
import { PageHeader, Spinner, EmptyState } from '../components/Common';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast, apiErrorMessage } from '../context/ToastContext';
import { useBranding } from '../context/BrandingContext';
import { DEFAULT_BRANDING } from '../lib/apiBranding';
import Logo from '../components/Logo';

const SUBTABS = [
  { key: 'usuarios', label: 'Usuários', icon: UsersIcon },
  { key: 'permissoes', label: 'Perfis de acesso', icon: ShieldCheck },
  { key: 'aparencia', label: 'Aparência', icon: Palette },
  { key: 'eventos', label: 'Tipos de evento', icon: CalendarDays },
  { key: 'financeirogeral', label: 'Categorias gerais', icon: Tag },
];

export default function SettingsPage() {
  const [tab, setTab] = useState('usuarios');
  return (
    <div>
      <PageHeader title="Configurações" description="Usuários, permissões e estruturas globais da plataforma." />
      <div className="flex gap-1 mb-6 border-b border-forest-100 overflow-x-auto">
        {SUBTABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap ${tab === t.key ? 'border-forest-700 text-forest-800' : 'border-transparent text-forest-500 hover:text-forest-700'}`}>
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'usuarios' && <UsersTab />}
      {tab === 'permissoes' && <RolesTab />}
      {tab === 'aparencia' && <AppearanceTab />}
      {tab === 'eventos' && <EventTypesTab />}
      {tab === 'financeirogeral' && <GeneralCategoriesTab />}
    </div>
  );
}

function AppearanceTab() {
  const branding = useBranding();
  const toast = useToast();
  const [siteName, setSiteName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_BRANDING.primaryColor);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (branding && !branding.loading) {
      setSiteName(branding.siteName || DEFAULT_BRANDING.siteName);
      setLogoUrl(branding.logoUrl || '');
      setPrimaryColor(branding.primaryColor || DEFAULT_BRANDING.primaryColor);
    }
  }, [branding?.loading]);

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 250 * 1024) {
      toast.error('A imagem é muito grande. Use um arquivo de até 250 KB (ideal: um ícone quadrado simples).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(reader.result);
    reader.readAsDataURL(file);
  }

  async function save() {
    setSaving(true);
    try {
      await branding.updateBranding({ siteName, logoUrl: logoUrl || null, primaryColor });
      toast.success('Identidade visual atualizada.');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Não foi possível salvar as alterações.'));
    } finally {
      setSaving(false);
    }
  }

  function resetDefaults() {
    setSiteName(DEFAULT_BRANDING.siteName);
    setLogoUrl('');
    setPrimaryColor(DEFAULT_BRANDING.primaryColor);
  }

  if (branding?.loading) return <Spinner />;

  return (
    <div className="grid md:grid-cols-2 gap-5">
      <div className="card p-5 space-y-4">
        <div>
          <label className="label">Nome do sistema</label>
          <input className="input" value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="Juventude" />
        </div>

        <div>
          <label className="label">Logo</label>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-14 h-14 rounded-lg overflow-hidden border border-forest-100 flex items-center justify-center bg-forest-950">
              {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" /> : <span className="text-forest-400 text-xs">padrão</span>}
            </div>
            <div className="flex-1 space-y-2">
              <label className="btn-secondary !py-1.5 !px-3 text-xs cursor-pointer inline-flex">
                <Upload size={13} /> Enviar imagem
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
              {logoUrl && <button className="btn-ghost !py-1.5 !px-3 text-xs" onClick={() => setLogoUrl('')}>Remover logo</button>}
            </div>
          </div>
          <input className="input" value={logoUrl?.startsWith('data:') ? '' : logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="ou cole a URL de uma imagem" disabled={logoUrl?.startsWith('data:')} />
          <p className="text-xs text-forest-500 mt-1">Ideal: imagem quadrada, até 250 KB. Se nenhuma logo for definida, usamos o ícone padrão.</p>
        </div>

        <div>
          <label className="label">Cor-tema</label>
          <div className="flex items-center gap-3">
            <input type="color" className="input h-11 w-16 p-1 cursor-pointer" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
            <input className="input flex-1" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} placeholder="#2f6a3d" />
          </div>
          <p className="text-xs text-forest-500 mt-1">Essa cor substitui o verde em toda a interface — botões, menu lateral, destaques.</p>
        </div>

        <div className="flex gap-2 pt-2">
          <button className="btn-primary flex-1 justify-center" onClick={save} disabled={saving}>Salvar alterações</button>
          <button className="btn-ghost" onClick={resetDefaults} title="Restaurar padrão"><RotateCcw size={15} /></button>
        </div>
      </div>

      <div className="card p-5">
        <p className="label mb-3">Pré-visualização</p>
        <div className="rounded-xl overflow-hidden border border-forest-100">
          <div className="bg-forest-950 px-4 py-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-forest-800 flex items-center justify-center overflow-hidden">
              {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-forest-200 text-xs">🏕️</span>}
            </div>
            <span className="font-display text-white text-sm">{siteName || 'Juventude'}</span>
          </div>
          <div className="bg-moss-50 p-4 space-y-2">
            <div className="bg-forest-700 text-white text-xs rounded-lg px-3 py-2 w-fit">Item de menu ativo</div>
            <div className="bg-white border border-forest-100 rounded-lg px-3 py-2 text-xs text-forest-700 shadow-card">Card comum</div>
            <button type="button" className="btn-primary !py-1.5 !px-3 text-xs" style={{ pointerEvents: 'none' }}>Botão primário</button>
          </div>
        </div>
        <p className="text-xs text-forest-500 mt-3">A pré-visualização usa a cor selecionada acima em tempo real (mesmo antes de salvar) — dá uma olhada no menu lateral do sistema pra ver o efeito completo.</p>
      </div>
    </div>
  );
}

function UsersTab() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const [{ data: u }, { data: r }] = await Promise.all([api.get('/users'), api.get('/users/roles/list')]);
    setUsers(u); setRoles(r);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function toggleActive(u) {
    await api.put(`/users/${u.id}`, { ativo: !u.ativo });
    toast.success(u.ativo ? 'Usuário desativado.' : 'Usuário reativado.');
    load();
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn-primary" onClick={() => setCreating(true)}><Plus size={16} /> Novo usuário</button>
      </div>
      {loading ? <Spinner /> : users.length === 0 ? (
        <EmptyState icon={UsersIcon} title="Nenhum usuário cadastrado" />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Nome</th><th>E-mail</th><th>Função</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium text-forest-900">{u.nome}</td>
                  <td>{u.email}</td>
                  <td><span className="badge-green">{u.role_nome}</span></td>
                  <td><span className={u.ativo ? 'badge-green' : 'badge-gray'}>{u.ativo ? 'ativo' : 'inativo'}</span></td>
                  <td><button className="btn-ghost !py-1 !px-2 text-xs" onClick={() => toggleActive(u)}>{u.ativo ? 'Desativar' : 'Reativar'}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {creating && <UserModal roles={roles} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
    </div>
  );
}

function UserModal({ roles, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ nome: '', email: '', senha: '', role_id: roles[0]?.id || '' });
  const [saving, setSaving] = useState(false);
  async function save() {
    if (!form.nome || !form.email || !form.senha || !form.role_id) return toast.error('Preencha todos os campos.');
    setSaving(true);
    try {
      await api.post('/users', form);
      toast.success('Usuário criado.');
      onSaved();
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setSaving(false); }
  }
  return (
    <Modal title="Novo usuário" onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={save} disabled={saving}>Criar</button></>}>
      <div className="space-y-3">
        <div><label className="label">Nome</label><input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
        <div><label className="label">E-mail</label><input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div><label className="label">Senha provisória</label><input type="password" className="input" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} /></div>
        <div>
          <label className="label">Função</label>
          <select className="input" value={form.role_id} onChange={(e) => setForm({ ...form, role_id: e.target.value })}>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  );
}

const MODULE_OPTIONS = [
  { key: 'participants', label: 'Participantes (Retiro)' },
  { key: 'rooms', label: 'Acomodações (Retiro)' },
  { key: 'financial', label: 'Financeiro' },
  { key: 'fundraisers', label: 'Arrecadações' },
  { key: 'schedule', label: 'Programação (Retiro)' },
  { key: 'gymkhana', label: 'Gincana (Retiro)' },
  { key: 'shopping', label: 'Compras' },
  { key: 'events', label: 'Eventos' },
  { key: 'checklists', label: 'Checklists' },
  { key: 'team', label: 'Equipe e Responsáveis' },
  { key: 'inventory', label: 'Estoque' },
];

function RolesTab() {
  const toast = useToast();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // 'new' | role object
  const [deleting, setDeleting] = useState(null);

  async function load() {
    setLoading(true);
    const { data } = await api.get('/users/roles/list');
    setRoles(data);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function handleDelete(role) {
    try {
      await api.delete(`/users/roles/${role.id}`);
      toast.success('Perfil excluído.');
      load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn-primary" onClick={() => setEditing('new')}><Plus size={16} /> Novo perfil</button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {roles.map((r) => (
          <div key={r.id} className="card p-4">
            <div className="flex items-start justify-between mb-1">
              <p className="font-display text-forest-900">{r.nome}</p>
              <div className="flex items-center gap-1.5">
                {r.readOnly && <span className="badge-amber">Somente visualização</span>}
                {r.sistema && <span className="badge-gray">Padrão do sistema</span>}
              </div>
            </div>
            <p className="text-sm text-forest-500 mb-3">{r.descricao}</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {r.permissoes.includes('*')
                ? <span className="badge-green">Acesso total</span>
                : r.permissoes.length
                  ? r.permissoes.map((p) => <span key={p} className="badge-gray">{MODULE_OPTIONS.find((m) => m.key === p)?.label || p}</span>)
                  : <span className="text-xs text-forest-400 italic">Nenhum módulo liberado para edição</span>}
            </div>
            {!r.sistema && (
              <div className="flex gap-2">
                <button className="btn-secondary !py-1.5 !px-3 text-xs" onClick={() => setEditing(r)}><Pencil size={13} /> Editar</button>
                <button className="btn-ghost !py-1.5 !px-3 text-xs text-berry-500 hover:bg-red-50" onClick={() => setDeleting(r)}><Trash2 size={13} /> Excluir</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {editing && <RoleModal role={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {deleting && <ConfirmDialog title="Excluir perfil de acesso" message={`Excluir o perfil "${deleting.nome}"? Certifique-se de que nenhum usuário está usando esse perfil.`} confirmLabel="Excluir" danger onClose={() => setDeleting(null)} onConfirm={() => handleDelete(deleting)} />}
    </div>
  );
}

function RoleModal({ role, onClose, onSaved }) {
  const toast = useToast();
  const [nome, setNome] = useState(role?.nome || '');
  const [descricao, setDescricao] = useState(role?.descricao || '');
  const [readOnly, setReadOnly] = useState(role?.readOnly || false);
  const [selected, setSelected] = useState(new Set(role?.permissoes?.includes('*') ? [] : (role?.permissoes || [])));
  const [saving, setSaving] = useState(false);

  function toggleModule(key) {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSelected(next);
  }

  async function save() {
    if (!nome.trim()) return toast.error('Informe o nome do perfil.');
    setSaving(true);
    try {
      const body = { nome, descricao, readOnly, permissoes: Array.from(selected) };
      if (role) await api.put(`/users/roles/${role.id}`, body);
      else await api.post('/users/roles', body);
      toast.success(role ? 'Perfil atualizado.' : 'Perfil criado.');
      onSaved();
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setSaving(false); }
  }

  return (
    <Modal title={role ? 'Editar perfil de acesso' : 'Novo perfil de acesso'} wide onClose={onClose} footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" onClick={save} disabled={saving}>Salvar</button></>}>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div><label className="label">Nome do perfil</label><input className="input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Recepção, Liderança de Louvor..." /></div>
          <div><label className="label">Descrição (opcional)</label><input className="input" value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
        </div>

        <label className="flex items-start gap-2.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 cursor-pointer">
          <input type="checkbox" className="accent-forest-700 mt-0.5" checked={readOnly} onChange={(e) => setReadOnly(e.target.checked)} />
          <span className="text-sm text-clay-600">
            <strong>Somente visualização.</strong> Pessoas com este perfil podem navegar e ver todos os módulos, mas nunca criar, editar ou excluir nada — em lugar nenhum do sistema.
          </span>
        </label>

        {!readOnly && (
          <div>
            <p className="label mb-2">Em quais módulos esta pessoa pode criar, editar e excluir dados?</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {MODULE_OPTIONS.map((m) => (
                <label key={m.key} className="flex items-center gap-2 text-sm text-forest-700 bg-forest-50 rounded-lg px-3 py-2 cursor-pointer">
                  <input type="checkbox" className="accent-forest-700" checked={selected.has(m.key)} onChange={() => toggleModule(m.key)} />
                  {m.label}
                </label>
              ))}
            </div>
            <p className="text-xs text-forest-500 mt-2">Dashboard, Relatórios e Histórico ficam sempre visíveis para leitura — não precisam ser marcados aqui.</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

function EventTypesTab() {
  const toast = useToast();
  const [types, setTypes] = useState([]);
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);

  async function load() {
    const { data } = await api.get('/events/types');
    setTypes(data);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!name.trim()) return;
    try {
      await api.post('/events/types', { nome: name.trim() });
      toast.success('Tipo de evento adicionado.');
      setName(''); setAdding(false); load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  }

  async function toggleActive(t) {
    await api.put(`/events/types/${t.id}`, { ativo: !t.ativo });
    load();
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="font-display text-forest-900">Tipos de evento</p>
        <button className="btn-secondary !py-1.5 !px-3 text-xs" onClick={() => setAdding(true)}><Plus size={13} /> Adicionar</button>
      </div>
      <div className="space-y-1.5">
        {types.map((t) => (
          <div key={t.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-forest-50">
            <span className={`text-sm ${t.ativo ? 'text-forest-800' : 'text-forest-400 line-through'}`}>{t.nome}</span>
            <button onClick={() => toggleActive(t)} className={t.ativo ? 'badge-green' : 'badge-gray'}>{t.ativo ? 'ativo' : 'inativo'}</button>
          </div>
        ))}
        {types.length === 0 && <p className="text-sm text-forest-400 italic">Nenhum tipo cadastrado. Culto, Evangelismo, Luau, Congresso, Bazar, Cantina...</p>}
      </div>
      {adding && (
        <div className="mt-3 flex gap-2">
          <input autoFocus className="input" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <button className="btn-primary !px-3" onClick={add}>OK</button>
          <button className="btn-ghost !px-3" onClick={() => setAdding(false)}>Cancelar</button>
        </div>
      )}
    </div>
  );
}

function GeneralCategoriesTab() {
  const toast = useToast();
  const [incomeCats, setIncomeCats] = useState([]);
  const [expenseCats, setExpenseCats] = useState([]);
  const [adding, setAdding] = useState(null);
  const [name, setName] = useState('');
  const GERAL = '__GERAL__';

  async function load() {
    const [{ data: inc }, { data: exp }] = await Promise.all([
      api.get('/categories', { params: { edition_id: GERAL, tipo: 'entrada' } }),
      api.get('/categories', { params: { edition_id: GERAL, tipo: 'saida' } }),
    ]);
    setIncomeCats(inc); setExpenseCats(exp);
  }
  useEffect(() => { load(); }, []);

  async function addCategory() {
    if (!name.trim()) return;
    try {
      await api.post('/categories', { edition_id: GERAL, tipo: adding, nome: name.trim() });
      toast.success('Categoria adicionada.');
      setName(''); setAdding(null); load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  }

  function List({ title, items, tipo }) {
    return (
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-display text-forest-900">{title}</p>
          <button className="btn-secondary !py-1.5 !px-3 text-xs" onClick={() => setAdding(tipo)}><Plus size={13} /> Categoria</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {items.map((c) => <span key={c.id} className="badge-green">{c.nome}</span>)}
          {items.length === 0 && <p className="text-sm text-forest-400 italic">Nenhuma categoria cadastrada.</p>}
        </div>
        {adding === tipo && (
          <div className="mt-3 flex gap-2">
            <input autoFocus className="input" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addCategory()} />
            <button className="btn-primary !px-3" onClick={addCategory}>Adicionar</button>
            <button className="btn-ghost !px-3" onClick={() => { setAdding(null); setName(''); }}>Cancelar</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-forest-500 mb-4">Categorias usadas nos lançamentos gerais e de eventos (fora do módulo de Retiro, que tem categorias próprias por edição).</p>
      <div className="grid md:grid-cols-2 gap-4">
        <List title="Categorias de entrada" items={incomeCats} tipo="entrada" />
        <List title="Categorias de saída" items={expenseCats} tipo="saida" />
      </div>
    </div>
  );
}
