import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Upload, FolderOpen, Wallet, HardDrive,
  LogOut, Database, ChevronRight, Bell, Settings
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/shared/ThemeToggle';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',    path: '/app/dashboard' },
  { icon: Upload,          label: 'Upload File',  path: '/app/upload' },
  { icon: FolderOpen,      label: 'My Files',     path: '/app/files' },
  { icon: HardDrive,       label: 'Storage Node', path: '/app/storage' },
  { icon: Wallet,          label: 'Wallet',       path: '/app/wallet' },
];

export default function PublicLayout() {
  const { isDark } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  const notifications = [
    { id: 1, title: 'Node status stable', time: '2 min ago' },
    { id: 2, title: 'New reward credited', time: '18 min ago' },
    { id: 3, title: 'Health check completed', time: '1 hr ago' },
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
    logout();
    navigate('/');
  };

  return (
    <div className={`flex h-screen w-full overflow-hidden ${isDark ? 'bg-animated text-white' : 'bg-animated-light text-gray-900'}`}>

      {/* ── Floating Orbs ── */}
      <div className="orb w-96 h-96 opacity-20 top-[-100px] left-[-100px]"
        style={{ background: 'radial-gradient(circle, #4A65F6, transparent)' }} />
      <div className="orb w-80 h-80 opacity-15 bottom-[-50px] right-[-50px]"
        style={{ background: 'radial-gradient(circle, #8A4DFF, transparent)', animationDelay: '4s' }} />

      {/* ── Sidebar ── */}
      <aside className={`relative z-20 w-64 flex flex-col shrink-0
        ${isDark ? 'glass-dark border-r border-white/8' : 'glass-light border-r border-black/10'}
      `}>
        {/* Logo */}
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl btn-primary flex items-center justify-center shrink-0">
            <Database size={18} />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight gradient-text">DecentraStore</h1>
            <p className={`text-[10px] ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
              Decentralized Storage
            </p>
          </div>
        </div>

        {/* User badge */}
        <div className={`mx-4 mt-4 p-3 rounded-xl flex items-center gap-3
          ${isDark ? 'bg-white/5 border border-white/8' : 'bg-black/5 border border-black/8'}`}>
          <div className="w-8 h-8 rounded-full btn-primary flex items-center justify-center text-sm font-bold shrink-0">
            {user?.node_id?.slice(0, 2)?.toUpperCase() || 'N/A'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{user?.node_id || 'Not logged in'}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full status-online" />
              <span className={`text-[10px] ${isDark ? 'text-white/40' : 'text-gray-400'}`}>Online · Active Node</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className={`text-[10px] uppercase tracking-widest font-semibold px-3 mb-3
            ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
            Navigation
          </p>
          {navItems.map(({ icon: Icon, label, path }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                transition-all duration-200
                ${isActive
                  ? `active ${isDark
                      ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white border border-white/10'
                      : 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-100'
                    }`
                  : `${isDark ? 'text-white/60 hover:bg-white/8 hover:text-white' : 'text-gray-500 hover:bg-black/5 hover:text-gray-900'}`
                }`
              }
            >
              <Icon size={17} className="shrink-0" />
              <span className="flex-1">{label}</span>
              <ChevronRight size={13} className="opacity-30" />
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="p-4 border-t border-white/8 space-y-1">
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
            <span>Disconnect Node</span>
          </button>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <header className={`relative z-10 flex items-center justify-between px-6 py-3 shrink-0
          ${isDark ? 'border-b border-white/8' : 'border-b border-black/8'}
          ${isDark ? 'bg-black/20' : 'bg-white/30'} backdrop-blur-lg`}>

          <div>
            <h2 className={`text-sm font-semibold ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
              P2P Network
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full status-online" />
              <span className={`text-[11px] ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                Live metrics available in dashboard
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* AST Token balance */}
            <div className="token-badge px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
              <span>◈</span>
              <span>{user?.token_balance?.toFixed(2) || '0.00'} AST</span>
            </div>

            {/* Notification bell */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications((prev) => !prev)}
                className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer
                transition-all duration-200 relative
                ${isDark ? 'bg-white/8 hover:bg-white/15 text-white/60' : 'bg-black/8 hover:bg-black/12 text-gray-500'}`}
                aria-label="Toggle notifications"
              >
                <Bell size={16} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
              </button>

              {showNotifications && (
                <div className={`absolute right-0 mt-2 w-72 rounded-xl border z-50 overflow-hidden
                  ${isDark ? 'bg-[#111426] border-white/10' : 'bg-white border-black/10 shadow-xl'}`}>
                  <div className={`px-4 py-3 text-sm font-semibold ${isDark ? 'border-b border-white/10' : 'border-b border-black/10'}`}>
                    Notifications
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
