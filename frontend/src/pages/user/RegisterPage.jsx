import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Download, Shield, KeyRound, Fingerprint, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../../components/shared/ThemeToggle';
import {
  generateRSAKeyPair,
  exportPublicKeyPEM,
  exportPrivateKeyPEM,
  generatePublicKeyFingerprint,
  generateNodeId,
  createKeystore,
  downloadKeystore,
} from '../../utils/crypto';
import { registerNode } from '../../utils/api';

export default function RegisterPage() {
  const { isDark } = useTheme();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState('intro'); // intro | generating | ready | registering | complete
  const [nodeId, setNodeId] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [keystore, setKeystore] = useState(null);
  const [error, setError] = useState('');
  const [signupRewardAmount, setSignupRewardAmount] = useState(50);

  const handleGenerateKeys = async () => {
    try {
      setStep('generating');
      setError('');

      // Generate RSA keypair
      const { publicKey, privateKey } = await generateRSAKeyPair();

      // Export to PEM
      const publicKeyPEM = await exportPublicKeyPEM(publicKey);
      const privateKeyPEM = await exportPrivateKeyPEM(privateKey);

      // Generate fingerprint
      const fp = await generatePublicKeyFingerprint(publicKeyPEM);
      setFingerprint(fp);

      // Generate node ID
      const nid = generateNodeId();
      setNodeId(nid);

      // Create keystore
      const ks = createKeystore(nid, publicKeyPEM, privateKeyPEM, fp);
      setKeystore(ks);

      setStep('ready');
    } catch (err) {
      setError(`Key generation failed: ${err.message}`);
      setStep('intro');
    }
  };

  const handleDownloadKeystore = () => {
    if (keystore) {
      downloadKeystore(keystore, `${nodeId}-keystore.json`);
    }
  };

  const handleRegister = async () => {
    try {
      setStep('registering');
      setError('');

      // Register with backend
      const response = await registerNode(
        keystore.node_id,
        keystore.public_key,
        keystore.fingerprint,
        JSON.stringify(keystore) // In production, encrypt this
      );

      // Save auth state
      login({
        node_id: response.node_id,
        token_balance: response.token_balance || 50.0,
      }, response.access_token);

      setSignupRewardAmount(response.token_balance || 50.0);

      setStep('complete');
      
      // Keep success view visible long enough for reward animation.
      setTimeout(() => {
        navigate('/app/dashboard');
      }, 3200);
    } catch (err) {
      setError(`Registration failed: ${err.message}`);
      setStep('ready');
    }
  };

  return (
    <div className={`min-h-screen relative overflow-hidden ${isDark ? 'bg-animated text-white' : 'bg-animated-light text-gray-900'}`}>

      {/* Background orbs */}
      <div className="orb w-96 h-96 opacity-15 top-[-100px] left-[-50px]"
        style={{ background: 'radial-gradient(circle, #4A65F6, transparent)' }} />
      <div className="orb w-80 h-80 opacity-10 bottom-[-80px] right-[-80px]"
        style={{ background: 'radial-gradient(circle, #8A4DFF, transparent)', animationDelay: '4s' }} />

      {/* Topbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 rounded-xl btn-primary flex items-center justify-center">
            <Database size={20} />
          </div>
          <span className="font-bold text-lg gradient-text">DecentraStore</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/login')}
            className="text-sm font-medium opacity-60 hover:opacity-100 transition-opacity">
            Already have a keystore?
          </button>
          <ThemeToggle />
        </div>
      </nav>

      {/* Main content */}
      <div className="relative z-10 max-w-2xl mx-auto px-8 py-12">

        {/* Intro Step */}
        {step === 'intro' && (
          <div className={`rounded-3xl p-10 text-center ${isDark ? 'glass' : 'glass-light shadow-xl'}`}>
            <div className="w-20 h-20 rounded-2xl btn-primary flex items-center justify-center mx-auto mb-6">
              <Shield size={36} />
            </div>
            <h1 className="text-3xl font-black mb-4">
              Setup Your <span className="gradient-text">Storage Node</span>
            </h1>
            <p className={`text-base mb-8 leading-relaxed ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
              We'll generate a unique RSA-2048 keypair on your device. Your private key{' '}
              <strong>never leaves your browser</strong> and is not stored on our servers.
            </p>

            <div className={`text-left space-y-4 mb-8 p-6 rounded-xl ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
              <div className="flex items-start gap-3">
                <KeyRound size={20} className="shrink-0 mt-1 text-indigo-400" />
                <div>
                  <h3 className="font-semibold text-sm mb-1">RSA-2048 Identity</h3>
                  <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                    Your identity is a cryptographic keypair — no passwords, no email.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Download size={20} className="shrink-0 mt-1 text-purple-400" />
                <div>
                  <h3 className="font-semibold text-sm mb-1">Download Keystore</h3>
                  <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                    You'll download a <code className="font-mono text-xs">keystore.json</code> file — keep it safe!
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Fingerprint size={20} className="shrink-0 mt-1 text-teal-400" />
                <div>
                  <h3 className="font-semibold text-sm mb-1">Public Key Fingerprint</h3>
                  <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                    A SHA-256 hash of your public key serves as your unique node identifier.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button
              onClick={handleGenerateKeys}
              className="btn-primary px-10 py-4 rounded-2xl text-base font-bold inline-flex items-center gap-2 glow-primary">
              <Shield size={20} />
              Generate Keypair
            </button>
          </div>
        )}

        {/* Generating Step */}
        {step === 'generating' && (
          <div className={`rounded-3xl p-10 text-center ${isDark ? 'glass' : 'glass-light shadow-xl'}`}>
            <Loader2 size={48} className="animate-spin mx-auto mb-6 text-indigo-500" />
            <h2 className="text-2xl font-bold mb-3">Generating RSA-2048 Keypair...</h2>
            <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              This may take a few seconds. Please do not close this window.
            </p>
          </div>
        )}

        {/* Ready Step */}
        {step === 'ready' && (
          <div className={`rounded-3xl p-10 ${isDark ? 'glass' : 'glass-light shadow-xl'}`}>
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle2 size={32} className="text-green-400" />
              <h2 className="text-2xl font-bold">Keypair Generated Successfully!</h2>
            </div>

            <div className="space-y-4 mb-8">
              {/* Node ID */}
              <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                <label className={`text-xs font-semibold uppercase tracking-wide mb-2 block ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                  Node ID
                </label>
                <div className="font-mono text-sm break-all">{nodeId}</div>
              </div>

              {/* Fingerprint */}
              <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
                <label className={`text-xs font-semibold uppercase tracking-wide mb-2 block ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                  Public Key Fingerprint
                </label>
                <div className="font-mono text-xs break-all opacity-70">{fingerprint}</div>
              </div>
            </div>

            <div className={`p-6 rounded-xl mb-8 ${isDark ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-yellow-50 border border-yellow-200'}`}>
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-yellow-400 shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-sm mb-1 text-yellow-400">Download Your Keystore</h3>
                  <p className={`text-xs mb-4 ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                    You must download and save your keystore file. If you lose it, you'll permanently lose access to this node.
                  </p>
                  <button
                    onClick={handleDownloadKeystore}
                    className="btn-outline px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2">
                    <Download size={16} />
                    Download Keystore.json
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button
              onClick={handleRegister}
              className="btn-primary w-full py-4 rounded-2xl text-base font-bold">
              Register Node & Continue
            </button>
          </div>
        )}

        {/* Registering Step */}
        {step === 'registering' && (
          <div className={`rounded-3xl p-10 text-center ${isDark ? 'glass' : 'glass-light shadow-xl'}`}>
            <Loader2 size={48} className="animate-spin mx-auto mb-6 text-purple-500" />
            <h2 className="text-2xl font-bold mb-3">Registering Your Node...</h2>
            <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              Submitting your public key to the network orchestrator.
            </p>
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <div className={`rounded-3xl p-10 text-center ${isDark ? 'glass glow-accent' : 'glass-light shadow-xl'}`}>
            <CheckCircle2 size={64} className="mx-auto mb-6 text-green-400" />
            <h2 className="text-3xl font-black mb-3 gradient-text">Welcome to DecentraStore!</h2>
            <p className={`text-base mb-6 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
              Your node is now registered. Redirecting to your dashboard...
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-semibold">
              <span className="w-2 h-2 rounded-full status-online" />
              Node Active
            </div>

            <div className="mt-8 mx-auto max-w-md animate-[fadeIn_0.35s_ease-out]">
              <div className={`relative overflow-hidden rounded-2xl border-2 p-5 text-left shadow-2xl animate-pulse ${
                isDark
                  ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-amber-400/40'
                  : 'bg-gradient-to-r from-amber-100 to-yellow-100 border-amber-300'
              }`}>
                <div className="absolute top-0 right-0 h-full w-12 bg-white/20" />
                <p className="text-xs uppercase tracking-[0.18em] font-bold opacity-70 mb-2">Reward Unlocked</p>
                <p className="text-2xl font-black mb-1">You Earned {signupRewardAmount.toFixed(0)} AST Coins</p>
                <p className={`text-xs ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
                  Welcome bonus added to your wallet.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
