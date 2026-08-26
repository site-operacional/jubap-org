import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { BrandingProvider } from './context/BrandingContext';
import Layout from './components/Layout';
import RetreatLayout from './components/RetreatLayout';
import Login from './pages/Login';
import SettingsPage from './pages/SettingsPage';

// Plataforma
import GeneralDashboard from './pages/platform/GeneralDashboard';
import Events from './pages/platform/Events';
import EventDetail from './pages/platform/EventDetail';
import RetreatsListPage from './pages/platform/RetreatsListPage';
import GeneralFinance from './pages/platform/GeneralFinance';
import GeneralFundraisers from './pages/platform/GeneralFundraisers';
import GeneralShopping from './pages/platform/GeneralShopping';
import Team from './pages/platform/Team';
import Reports from './pages/platform/Reports';
import GlobalHistory from './pages/platform/GlobalHistory';
import Checklists from './pages/platform/Checklists';
import ChecklistDetail from './pages/platform/ChecklistDetail';
import Inventory from './pages/platform/Inventory';
import ImportExport from './pages/platform/ImportExport';

// Módulo de Retiro (independente, aninhado)
import RetreatDashboard from './pages/retiro/Dashboard';
import Participants from './pages/retiro/Participants';
import Rooms from './pages/retiro/Rooms';
import Financial from './pages/retiro/Financial';
import Fundraisers from './pages/retiro/Fundraisers';
import Schedule from './pages/retiro/Schedule';
import Gymkhana from './pages/retiro/Gymkhana';
import Shopping from './pages/retiro/Shopping';
import RetreatSettings from './pages/retiro/RetreatSettings';

function Protected({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<Protected><Layout /></Protected>}>
        <Route index element={<GeneralDashboard />} />
        <Route path="eventos" element={<Events />} />
        <Route path="eventos/:id" element={<EventDetail />} />
        <Route path="retiros" element={<RetreatsListPage />} />
        <Route path="financeiro" element={<GeneralFinance />} />
        <Route path="arrecadacoes" element={<GeneralFundraisers />} />
        <Route path="compras" element={<GeneralShopping />} />
        <Route path="checklists" element={<Checklists />} />
        <Route path="checklists/:id" element={<ChecklistDetail />} />
        <Route path="equipe" element={<Team />} />
        <Route path="estoque" element={<Inventory />} />
        <Route path="relatorios" element={<Reports />} />
        <Route path="importar-exportar" element={<ImportExport />} />
        <Route path="historico" element={<GlobalHistory />} />
        <Route path="configuracoes" element={<SettingsPage />} />
      </Route>

      <Route path="/retiros/:editionId" element={<Protected><RetreatLayout /></Protected>}>
        <Route index element={<RetreatDashboard />} />
        <Route path="participantes" element={<Participants />} />
        <Route path="acomodacoes" element={<Rooms />} />
        <Route path="financeiro" element={<Financial />} />
        <Route path="arrecadacoes" element={<Fundraisers />} />
        <Route path="programacao" element={<Schedule />} />
        <Route path="gincana" element={<Gymkhana />} />
        <Route path="compras" element={<Shopping />} />
        <Route path="configuracoes" element={<RetreatSettings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <BrandingProvider>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </BrandingProvider>
    </HashRouter>
  );
}
