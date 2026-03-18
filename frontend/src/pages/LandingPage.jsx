import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Zap, Globe, Lock, ChevronRight, Database, ArrowRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/shared/ThemeToggle';
import { getPeers, getNetworkMetrics } from '../utils/api';

const features = [
  {
    icon: Lock,
    title: 'AES-256 Encryption',
    desc: 'Files are encrypted client-side before leaving your device. Your keys, your data.',
    color: '#4A65F6',
  },
  {
    icon: Globe,
    title: 'P2P Distribution',
    desc: 'Chunks of your encrypted file are distributed across hundreds of peer nodes globally.',
    color: '#8A4DFF',
  },
  {
    icon: Zap,
    title: 'Earn AST Tokens',
    desc: 'Contribute your idle storage and earn DecentraStore tokens for every byte stored.',
    color: '#06D6A0',
  },
  {
    icon: Shield,
    title: 'Zero Trust Security',
    desc: 'RSA-2048 identity keys replace passwords. No central authority holds your data.',
    color: '#FFD166',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [stats, setStats] = useState([
    { value: '0', label: 'Active Nodes' },
    { value: '0 TB', label: 'Data Stored' },
    { value: '0%', label: 'Uptime' },
    { value: '0', label: 'Files Secured' },
  ]);
  const [peersCount, setPeersCount] = useState(0);

  useEffect(() => {
    loadNetworkStats();
  }, []);

  const loadNetworkStats = async () => {
    try {
      const [peersData, metricsData] = await Promise.all([
        getPeers(1000).catch(() => ({ peers: [] })),
        getNetworkMetrics().catch(() => ({ total_storage: 0, uptime: 0, total_files: 0 }))
      ]);
      
      const activePeers = peersData.peers?.length || 0;
      setPeersCount(activePeers);
      
      setStats([
        { value: String(activePeers), label: 'Active Nodes' },
        { value: metricsData?.total_storage ? `${(metricsData.total_storage / (1024 ** 4)).toFixed(2)} TB` : '0 TB', label: 'Data Stored' },
        { value: `${metricsData?.uptime || 0}%`, label: 'Uptime' },
        { value: String(metricsData?.total_files || 0), label: 'Files Secured' },
      ]);
    } catch (err) {
      console.error('Failed to load network stats:', err);
    }
  };

  return (
    <div className={`min-h-screen relative overflow-hidden ${isDark ? 'bg-animated text-white' : 'bg-animated-light text-gray-900'}`}>

      {/* ── Background Orbs ── */}
      <div className="orb w-[500px] h-[500px] opacity-20 top-[-150px] left-[-100px]"
        style={{ background: 'radial-gradient(circle, #4A65F6, transparent)' }} />
      <div className="orb w-[400px] h-[400px] opacity-15 top-[100px] right-[-100px]"
        style={{ background: 'radial-gradient(circle, #8A4DFF, transparent)', animationDelay: '3s' }} />
      <div className="orb w-[300px] h-[300px] opacity-10 bottom-[-50px] left-[30%]"
        style={{ background: 'radial-gradient(circle, #06D6A0, transparent)', animationDelay: '6s' }} />

      {/* ── Navbar ── */}
      <nav className={`relative z-30 flex items-center justify-between px-8 py-4 max-w-[1440px] mx-auto
        border-b ${isDark ? 'border-white/8' : 'border-black/8'}`}>

        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl btn-primary flex items-center justify-center">
            <Database size={20} />
          </div>
          <div>
            <span className="font-bold text-lg gradient-text">DecentraStore</span>
            <div className={`text-[10px] ${isDark ? 'text-white/40' : 'text-gray-400'}`}>v1.0 · Mainnet</div>
          </div>
        </div>

        {/* Center links */}
        <div className={`hidden md:flex items-center gap-8 text-sm font-medium
          ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
          <a href="#features" className="hover:text-indigo-400 transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-indigo-400 transition-colors">How It Works</a>
          <a href="#network" className="hover:text-indigo-400 transition-colors">Network</a>
        </div>

        {/* Right CTA */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => navigate('/app/login')}
            className="btn-outline px-4 py-2 rounded-xl text-sm font-semibold"
          >
            Connect Node
          </button>
          <button
            onClick={() => navigate('/app/register')}
            className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative z-10 max-w-[1440px] mx-auto px-8 pt-20 pb-16 text-center">
        {/* Badge */}
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8
          border ${isDark
            ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'
            : 'border-indigo-200 bg-indigo-50 text-indigo-600'
          }`}>
          <span className="w-1.5 h-1.5 rounded-full status-online" />
          {peersCount > 0 ? `Connected Peers · ${peersCount}` : 'No peers connected yet'}
          <ChevronRight size={12} />
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-black leading-tight tracking-tight mb-6">
          The{' '}
          <span className="gradient-text">Decentralized</span>
          <br />
          Cloud Storage System
        </h1>

        <p className={`text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed
          ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
          Encrypt your files locally with AES-256, distribute chunks across a P2P network,
          and earn <strong className="text-indigo-400">AST tokens</strong> for contributing your storage — all without trusting a central server.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <button
            onClick={() => navigate('/app/register')}
            className="btn-primary px-8 py-4 rounded-2xl text-base font-bold flex items-center gap-2 glow-primary"
          >
            <Database size={20} />
            Setup Your Node
            <ArrowRight size={16} />
          </button>
          <button
            onClick={() => navigate('/app/login')}
            className="btn-outline px-8 py-4 rounded-2xl text-base font-bold"
          >
            Connect Existing Node
          </button>
        </div>

        {/* ── Network Stats Bar ── */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto`}>
          {stats.map(({ value, label }) => (
            <div key={label}
              className={`card-hover rounded-2xl p-4 text-center
                ${isDark ? 'glass glow-primary' : 'glass-light shadow-lg'}`}>
              <div className="text-2xl font-black gradient-text">{value}</div>
              <div className={`text-xs mt-1 ${isDark ? 'text-white/50' : 'text-gray-400'}`}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Grid ── */}
      <section id="features" className="relative z-10 max-w-[1440px] mx-auto px-8 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            Built for <span className="gradient-text">Zero Trust</span>
          </h2>
          <p className={`text-base max-w-xl mx-auto ${isDark ? 'text-white/50' : 'text-gray-400'}`}>
            Every design decision prioritizes your privacy and data sovereignty over convenience.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(({ icon: Icon, title, desc, color }) => (
            <div key={title}
              className={`card-hover rounded-2xl p-6
                ${isDark ? 'glass' : 'glass-light shadow-md'}`}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
                <Icon size={22} style={{ color }} />
              </div>
              <h3 className="font-bold text-base mb-2">{title}</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="relative z-10 max-w-[1440px] mx-auto px-8 py-16">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            How <span className="gradient-text">DecentraStore</span> Works
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              title: 'Generate Your Identity',
              desc: 'An RSA-2048 keypair is generated locally in your browser. Your private key never leaves your device.',
              color: '#4A65F6',
            },
            {
              step: '02',
              title: 'Encrypt & Chunk',
              desc: 'Files are encrypted with AES-256 and split into chunks. The orchestrator distributes chunks to verified peers.',
              color: '#8A4DFF',
            },
            {
              step: '03',
              title: 'Earn & Retrieve',
              desc: 'Contribute storage to earn AST tokens. Retrieve files using your CID — the network reassembles and decrypts them.',
              color: '#06D6A0',
            },
          ].map(({ step, title, desc, color }) => (
            <div key={step} className={`relative card-hover rounded-2xl p-8
              ${isDark ? 'glass' : 'glass-light shadow-md'}`}>
              <div className="text-6xl font-black opacity-10 mb-4"
                style={{ color }}>{step}</div>
              <h3 className="text-xl font-bold mb-3">{title}</h3>
              <p className={`text-sm leading-relaxed ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="relative z-10 max-w-[1440px] mx-auto px-8 py-16">
        <div className={`rounded-3xl p-12 text-center relative overflow-hidden
          ${isDark ? 'glass glow-primary' : 'shadow-xl'}`}
          style={{ background: 'linear-gradient(135deg, rgba(74,101,246,0.15) 0%, rgba(138,77,255,0.15) 100%)', border: '1px solid rgba(74,101,246,0.2)' }}>
          <div className="orb w-64 h-64 opacity-20 top-[-50px] right-[-50px]"
            style={{ background: 'radial-gradient(circle, #8A4DFF, transparent)' }} />
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            Ready to join the <span className="gradient-text">decentralized revolution?</span>
          </h2>
          <p className={`text-base mb-8 max-w-lg mx-auto ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
            Set up your node in under 2 minutes. No registration, no passwords — just your cryptographic identity.
          </p>
          <button
            onClick={() => navigate('/app/register')}
            className="btn-primary px-10 py-4 rounded-2xl text-base font-bold inline-flex items-center gap-2"
          >
            <Database size={20} />
            Initialize Node
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={`relative z-10 max-w-[1440px] mx-auto px-8 py-8
        border-t ${isDark ? 'border-white/8 text-white/30' : 'border-black/8 text-gray-400'} text-sm text-center`}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Database size={14} />
            <span>DecentraStore © 2026 · Decentralized Cloud Storage System</span>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/admin/login')}
              className={`hover:text-indigo-400 transition-colors ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
              Admin Portal →
            </button>
            <span>v1.0.0-alpha</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
