import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Shield, Lock, Loader2, AlertCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../../components/shared/ThemeToggle';
import { adminLogin } from '../../utils/api';

export default function AdminLoginPage() {
  const { isDark } = useTheme();
  const { adminLogin: saveAdminAuth } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');

      const response = await adminLogin(username, password);

      saveAdminAuth({
        username: response.node_id, // node_id is username in admin login
      }, response.access_token);

      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen relative overflow-hidden ${isDark ? 'text-white' : 'text-gray-900'}`}
      style={{
        background: isDark
          ? 'linear-gradient(-45deg,#0a0a1e,#0d0a2a,#0a1020,#0e0a1e)'
          : 'linear-gradient(-45deg,#f0f4ff,#faf5ff,#eef2ff,#f5f0ff)',
        backgroundSize: '400% 400%',
        animation: 'gradientShift 15s ease infinite',
      }}>

      {/* Background orbs */}
      <div className="orb w-96 h-96 opacity-15 top-[-100px] right-[150px]"
        style={{ background: 'radial-gradient(circle, #8A4DFF, transparent)', animationDelay: '2s' }} />
      <div className="orb w-80 h-80 opacity-10 bottom-[-50px] left-[100px]"
        style={{ background: 'radial-gradient(circle, #4A65F6, transparent)' }} />

      {/* Topbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #8A4DFF, #4A65F6)' }}>
            <Database size={20} />
          </div>
          <div>
            <span className="font-bold text-base gradient-text">DecentraStore</span>
            <div className={`text-[10px] ${isDark ? 'text-white/40' : 'text-gray-400'}`}>Admin Portal</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-sm font-medium opacity-60 hover:opacity-100 transition-opacity">
            Back to Public Portal
          </button>
          <ThemeToggle />
        </div>
      </nav>

      {/* Main content */}
      <div className="relative z-10 max-w-md mx-auto px-8 py-12">
        <div className={`rounded-3xl p-10 ${isDark ? 'bg-[#08081a]/80 border border-white/8' : 'bg-white/70 border border-black/10'}
          backdrop-blur-xl shadow-2xl`}>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{ background: 'linear-gradient(135deg, #8A4DFF 0%, #4A65F6 100%)' }}>
              <Shield size={36} />
            </div>
            <h1 className="text-3xl font-black mb-2">Admin Console</h1>
            <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              Enterprise-grade network management
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className={`text-xs font-semibold uppercase tracking-wide mb-2 block ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
                className={`w-full px-4 py-3 rounded-xl text-sm font-medium ${isDark ? 'input-glass' : 'input-glass-light'}`}
              />
            </div>

            {/* Password */}
            <div>
              <label className={`text-xs font-semibold uppercase tracking-wide mb-2 block ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={`w-full px-4 py-3 rounded-xl text-sm font-medium ${isDark ? 'input-glass' : 'input-glass-light'}`}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 rounded-2xl text-base font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Lock size={20} />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Info */}
          <div className={`mt-6 p-4 rounded-xl ${isDark ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-purple-50 border border-purple-200'}`}>
            <p className={`text-xs ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
              💡 <strong>Dev Credentials:</strong> Username: <code className="font-mono">admin</code> / Password: <code className="font-mono">DecentraAdmin@2026</code>
            </p>
          </div>
        </div>

        {/* Footer note */}
        <p className={`text-center text-xs mt-6 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
          This is an enterprise authentication portal.  
          User nodes use decentralized RSA keypair login.
        </p>
      </div>
    </div>
  );
}
