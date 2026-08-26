import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarDays, TentTree, Wallet, PiggyBank, ShoppingCart,
  CheckSquare, Users, Package, BarChart3, Upload, History, Settings, Menu, LogOut, Eye,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import Logo from './Logo';

const NAV = [
  { to: '/', label: 'Dashboard Geral', icon: LayoutDashboard, mod: null, end: true },
  { to: '/eventos', label: 'Eventos', icon: CalendarDays, mod: 'events' },
  { to: '/retiros', label: 'Retiros', icon: TentTree, mod: null },
  { to: '/financeiro', label: 'Financeiro', icon: Wallet, mod: 'financial' },
  { to: '/arrecadacoes', label: 'Arrecadações', icon: PiggyBank, mod: 'fundraisers' },
  { to: '/compras', label: 'Compras', icon: ShoppingCart, mod: 'shopping' },
  { to: '/checklists', label: 'Checklists', icon: CheckSquare, mod: null },
  { to: '/equipe', label: 'Equipe e Responsáveis', icon: Users, mod: null },
  { to: '/estoque', label: 'Estoque', icon: Package, mod: null },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3, mod: null },
  { to: '/importar-exportar', label: 'Importar / Exportar', icon: Upload, mod: null },
  { to: '/historico', label: 'Histórico', icon: History, mod: null },
  { to: '/configuracoes', label: 'Configurações', icon: Settings, mod: null, adminOnly: true },
];

export default function Layout() {
  const { user, logout, can, isAdmin, isReadOnly } = useAuth();
  const branding = useBranding();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const items = NAV.filter((n) => (n.adminOnly ? isAdmin : n.mod ? can(n.mod) : true));

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const SidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <Logo size={36} iconSize={17} />
        <div className="leading-tight min-w-0">
          <p className="font-display text-white text-[15px] truncate">{branding?.siteName || 'Juventude'}</p>
          <p className="text-forest-400 text-[11px]">Plataforma de gestão</p>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.to}
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

      <div className="px-4 py-4 border-t border-forest-800/60">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-full bg-forest-700 flex items-center justify-center text-white text-xs font-semibold">
            {user?.nome?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="leading-tight min-w-0">
            <p className="text-sm text-white truncate">{user?.nome}</p>
            <p className="text-[11px] text-forest-400">{user?.role}</p>
          </div>
        </div>
        {isReadOnly && (
          <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5">
            <Eye size={13} className="text-amber-400 shrink-0" />
            <span className="text-[11px] text-amber-300 font-medium">Modo somente visualização</span>
          </div>
        )}
        <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-forest-300 hover:text-white">
          <LogOut size={15} /> Sair
        </button>
      </div>
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
            <Logo size={22} iconSize={13} />
            <span className="font-display text-white text-sm">{branding?.siteName || 'Juventude'}</span>
          </div>
          <button onClick={() => setMobileOpen(true)} className="text-white p-1"><Menu size={22} /></button>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
