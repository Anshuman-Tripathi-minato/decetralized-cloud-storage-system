import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Activity, FileText, Settings2, Shield,
  LogOut, Database, ChevronRight, Bell, Users, Network
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/shared/ThemeToggle';

const adminNavItems = [
  { icon: LayoutDashboard, label: 'Global Dashboard',    path: '/admin/dashboard',    badge: null },
  { icon: Network,         label: 'Network Monitor',    path: '/admin/network',       badge: 'LIVE' },
  { icon: FileText,        label: 'Blockchain Logs',    path: '/admin/blockchain',    badge: null },
  { icon: Shield,          label: 'Protocol Settings',  path: '/admin/settings',      badge: null },
  { icon: Users,           label: 'Node Registry',      path: '/admin/nodes',         badge: null },
];

export default function AdminLayout() {
  const { isDark } = useTheme();
  const { adminUser, adminLogout } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  const notifications = [
    { id: 1, title: 'Node heartbeat alerts: 0', time: 'Just now' },
    { id: 2, title: 'Network sync completed', time: '7 min ago' },
    { id: 3, title: 'Policy update deployed', time: '34 min ago' },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    adminLogout();
    navigate('/admin/login');
  };

  return (
    <div className={`flex h-screen w-full overflow-hidden ${isDark ? 'text-white' : 'text-gray-900'}`}
      style={{
        background: isDark
          ? 'linear-gradient(-45deg,#0a0a1e,#0d0a2a,#0a1020,#0e0a1e)'
          : 'linear-gradient(-45deg,#f0f4ff,#faf5ff,#eef2ff,#f5f0ff)',
        backgroundSize: '400% 400%',
        animation: 'gradientShift 15s ease infinite',
      }}>

      {/* Orbs */}
      <div className="orb w-96 h-96 opacity-15 top-[-80px] right-[200px]"
        style={{ background: 'radial-gradient(circle, #8A4DFF, transparent)', animationDelay: '2s' }} />
      <div className="orb w-64 h-64 opacity-10 bottom-20 left-20"
        style={{ background: 'radial-gradient(circle, #4A65F6, transparent)' }} />

      {/* ── Admin Sidebar ── */}
      <aside className={`relative z-20 w-64 flex flex-col shrink-0
        ${isDark ? 'bg-[#08081a]/80 border-r border-white/8' : 'bg-white/70 border-r border-black/10'}
        backdrop-blur-xl`}>

        {/* Logo + Admin badge */}
        <div className="p-6 border-b border-white/8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #8A4DFF, #4A65F6)' }}>
              <Database size={18} />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight gradient-text">DecentraStore</h1>
              <p className={`text-[10px] ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                Admin Console
              </p>
            </div>
          </div>

          {/* Admin badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs
            ${isDark ? 'bg-purple-500/10 border border-purple-500/20 text-purple-300'
                     : 'bg-purple-50 border border-purple-200 text-purple-600'}`}>
            <Shield size={11} />
            <span className="font-semibold">ENTERPRISE ADMIN</span>
          </div>
        </div>

        {/* Admin profile */}
        <div className={`mx-4 mt-4 p-3 rounded-xl flex items-center gap-3
          ${isDark ? 'bg-white/5 border border-white/8' : 'bg-black/5 border border-black/8'}`}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: 'linear-gradient(135deg, #8A4DFF, #4A65F6)' }}>
            {adminUser?.username?.slice(0, 2)?.toUpperCase() || 'AD'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{adminUser?.username || 'admin'}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full status-online" />
              <span className={`text-[10px] ${isDark ? 'text-white/40' : 'text-gray-400'}`}>Super Admin</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className={`text-[10px] uppercase tracking-widest font-semibold px-3 mb-3
            ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
            Control Panel
          </p>
          {adminNavItems.map(({ icon: Icon, label, path, badge }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200
                ${isActive
                  ? `active ${isDark
                      ? 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-white border border-white/10'
                      : 'bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 border border-purple-100'
                    }`
                  : `${isDark ? 'text-white/60 hover:bg-white/8 hover:text-white' : 'text-gray-500 hover:bg-black/5 hover:text-gray-900'}`
                }`
              }
            >
              <Icon size={17} className="shrink-0" />
              <span className="flex-1">{label}</span>
              {badge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                  {badge}
                </span>
              )}
              {!badge && <ChevronRight size={13} className="opacity-30" />}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-white/8">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full cursor-pointer
              transition-all duration-200
              ${isDark
                ? 'text-red-400/70 hover:bg-red-500/10 hover:text-red-400'
                : 'text-red-400 hover:bg-red-50 hover:text-red-500'
              }`}
          >
            <LogOut size={17} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Admin Topbar */}
        <header className={`relative z-10 flex items-center justify-between px-6 py-3 shrink-0
          ${isDark ? 'border-b border-white/8 bg-[#08081a]/60' : 'border-b border-black/8 bg-white/40'}
          backdrop-blur-lg`}>

          <div>
            <h2 className={`text-sm font-semibold ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
              Network Operations Center
            </h2>
            <div className="flex items-center gap-4 mt-0.5">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full status-online" />
                <span className={`text-[11px] ${isDark ? 'text-white/40' : 'text-gray-400'}`}>System Healthy</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Activity size={10} className="text-purple-400" />
                <span className={`text-[11px] ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                  Live metrics available in dashboard
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={`text-xs font-semibold px-3 py-1.5 rounded-full border
              ${isDark
                ? 'border-purple-500/30 text-purple-300 bg-purple-500/10'
                : 'border-purple-200 text-purple-600 bg-purple-50'
              }`}>
              Hyperledger v2.5
            </div>
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications((prev) => !prev)}
                className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer relative
                ${isDark ? 'bg-white/8 hover:bg-white/15 text-white/60' : 'bg-black/8 hover:bg-black/12 text-gray-500'}`}
                aria-label="Toggle admin notifications"
              >
                <Bell size={16} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
              </button>

              {showNotifications && (
                <div className={`absolute right-0 mt-2 w-72 rounded-xl border z-50 overflow-hidden
                  ${isDark ? 'bg-[#111426] border-white/10' : 'bg-white border-black/10 shadow-xl'}`}>
                  <div className={`px-4 py-3 text-sm font-semibold ${isDark ? 'border-b border-white/10' : 'border-b border-black/10'}`}>
                    Admin Notifications
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.map((item) => (
                      <div key={item.id} className={`px-4 py-3 text-sm ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}>
                        <p className="font-medium">{item.title}</p>
                        <p className={`text-xs mt-1 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>{item.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <ThemeToggle />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
