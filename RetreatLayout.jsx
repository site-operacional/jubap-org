import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import {
  LayoutDashboard, Users, BedDouble, Wallet, PiggyBank, CalendarDays, Trophy,
  ShoppingCart, Settings, ChevronLeft, ChevronDown, Menu, TentTree,
} from 'lucide-react';
import { EditionProvider, useEdition } from '../context/EditionContext';
import { useAuth } from '../context/AuthContext';
import { Spinner } from './Common';

const NAV = [
  { to: '', label: 'Dashboard', icon: LayoutDashboard, mod: null, end: true },
  { to: 'participantes', label: 'Participantes', icon: Users, mod: 'participants' },
  { to: 'acomodacoes', label: 'Acomodações', icon: BedDouble, mod: 'rooms' },
  { to: 'financeiro', label: 'Financeiro', icon: Wallet, mod: 'financial' },
  { to: 'arrecadacoes', label: 'Arrecadações', icon: PiggyBank, mod: 'fundraisers' },
  { to: 'programacao', label: 'Programação', icon: CalendarDays, mod: 'schedule' },
  { to: 'gincana', label: 'Gincana', icon: Trophy, mod: 'gymkhana' },
  { to: 'compras', label: 'Lista de Compras', icon: ShoppingCart, mod: 'shopping' },
  { to: 'configuracoes', label: 'Configurações da edição', icon: Settings, mod: null, adminOnly: true },
];

function RetreatShell() {
  const { editionId } = useParams();
  const { current, editions, loading } = useEdition();
  const { can, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const items = NAV.filter((n) => (n.adminOnly ? isAdmin : n.mod ? can(n.mod) : true));

  const SidebarContent = (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4">
        <button onClick={() => navigate('/retiros')} className="flex items-center gap-1.5 text-forest-300 hover:text-white text-xs font-medium mb-4">
          <ChevronLeft size={14} /> Voltar à Juventude
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-forest-800 flex items-center justify-center shrink-0">
            <TentTree size={18} className="text-forest-200" />
          </div>
          <div className="leading-tight min-w-0">
            <p className="font-display text-white text-[15px] truncate">{current?.nome || 'Retiro'}</p>
            <p className="text-forest-400 text-[11px]">Módulo de Retiro</p>
          </div>
        </div>
      </div>

      <div className="px-4 mb-4 relative">
        <button onClick={() => setSwitcherOpen((s) => !s)} className="w-full flex items-center justify-between rounded-lg bg-forest-800/70 hover:bg-forest-800 px-3 py-2 text-left">
          <span className="text-xs text-forest-200 font-medium">Trocar edição</span>
          <ChevronDown size={13} className="text-forest-400" />
        </button>
        {switcherOpen && (
          <div className="absolute left-4 right-4 mt-1 bg-white rounded-lg shadow-xl border border-forest-100 py-1 z-30 max-h-56 overflow-y-auto">
            {editions.map((e) => (
              <button
                key={e.id}
                onClick={() => { setSwitcherOpen(false); navigate(`/retiros/${e.id}`); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-forest-50 ${e.id === editionId ? 'text-forest-800 font-semibold' : 'text-forest-600'}`}
              >
                {e.nome}
              </button>
            ))}
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.to || 'root'}
            to={item.to}
            end={item.end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-forest-700 text-white' : 'text-forest-300 hover:bg-forest-800/70 hover:text-white'
              }`
            }
          >
            <item.icon size={17} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-moss-50">
      <aside className="hidden lg:flex w-64 shrink-0 bg-forest-950 sticky top-0 h-screen">{SidebarContent}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-forest-950">{SidebarContent}</aside>
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden sticky top-0 z-30 bg-forest-950 flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <TentTree size={18} className="text-forest-200" />
            <span className="font-display text-white text-sm truncate">{current?.nome || 'Retiro'}</span>
          </div>
          <button onClick={() => setMobileOpen(true)} className="text-white p-1"><Menu size={22} /></button>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {loading ? <Spinner /> : current ? <Outlet /> : (
            <div className="card p-8 text-center text-forest-600">Edição não encontrada. <button className="text-forest-800 underline" onClick={() => navigate('/retiros')}>Voltar para Retiros</button></div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function RetreatLayout() {
  const { editionId } = useParams();
  return (
    <EditionProvider editionId={editionId}>
      <RetreatShell />
    </EditionProvider>
  );
}
