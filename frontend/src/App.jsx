import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';
import LandingPage from './pages/LandingPage';
import PlaceholderPage from './components/shared/PlaceholderPage';
import RegisterPage from './pages/user/RegisterPage';
import LoginPage from './pages/user/LoginPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import UploadPage from './pages/user/UploadPage';
import FilesPage from './pages/user/FilesPage';
import DashboardPage from './pages/user/DashboardPage';
import StoragePage from './pages/user/StoragePage';
import WalletPage from './pages/user/WalletPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import NetworkMonitorPage from './pages/admin/NetworkMonitorPage';
import BlockchainLogsPage from './pages/admin/BlockchainLogsPage';
import NodeRegistryPage from './pages/admin/NodeRegistryPage';
import ProtocolSettingsPage from './pages/admin/ProtocolSettingsPage';

function RequireAuth({ children }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/app/login" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { adminToken } = useAuth();
  if (!adminToken) return <Navigate to="/admin/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app/login" element={<LoginPage />} />
      <Route path="/app/register" element={<RegisterPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/app" element={<RequireAuth><PublicLayout /></RequireAuth>}>
        <Route index element={<Navigate to="/app/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="upload" element={<UploadPage />} />
        <Route path="files" element={<FilesPage />} />
        <Route path="storage" element={<StoragePage />} />
        <Route path="wallet" element={<WalletPage />} />
      </Route>
      <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="network" element={<NetworkMonitorPage />} />
        <Route path="blockchain" element={<BlockchainLogsPage />} />
        <Route path="nodes" element={<NodeRegistryPage />} />
        <Route path="settings" element={<ProtocolSettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
