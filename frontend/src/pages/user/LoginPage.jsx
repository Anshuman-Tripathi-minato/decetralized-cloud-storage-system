import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Database, Upload, Shield, KeyRound, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import ThemeToggle from '../../components/shared/ThemeToggle';
import { readKeystoreFile, importPrivateKeyPEM, signMessage } from '../../utils/crypto';
import { loginNode } from '../../utils/api';
import { formatUtcTimestamp } from '../../utils/time';

export default function LoginPage() {
  const { isDark } = useTheme();
  const { login } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState('upload'); // upload | verifying | complete
  const [keystore, setKeystore] = useState(null);
  const [error, setError] = useState('');
  const [showRewardAnimation, setShowRewardAnimation] = useState(false);
  const [signupRewardAmount, setSignupRewardAmount] = useState(50);

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError('');
      const ks = await readKeystoreFile(file);

      // Validate keystore structure
      if (!ks.node_id || !ks.public_key || !ks.private_key || !ks.fingerprint) {
        throw new Error('Invalid keystore format');
      }

      setKeystore(ks);
    } catch (err) {
      setError(`Failed to read keystore: ${err.message}`);
      setKeystore(null);
    }
  };

  const handleLogin = async () => {
    if (!keystore) return;

    try {
      setStep('verifying');
      setError('');

      // Generate a challenge (timestamp)
      const challenge = `DecentraStore-Login-${Date.now()}`;

      // Sign the challenge with private key
      const privateKey = await importPrivateKeyPEM(keystore.private_key);
      const signature = await signMessage(privateKey, challenge);

      // Send to backend for verification
      const response = await loginNode(
        keystore.node_id,
        keystore.fingerprint,
        signature,
        challenge
      );

      // Save auth state
      login({
        node_id: response.node_id,
        token_balance: response.token_balance || 0.0,
      }, response.access_token);

      const hasRewardAnimation = Boolean(response.show_signup_reward_animation);
      setShowRewardAnimation(hasRewardAnimation);
      setSignupRewardAmount(response.signup_reward_amount || 50);

      setStep('complete');

      // Redirect to dashboard
      setTimeout(() => {
        navigate('/app/dashboard');
      }, hasRewardAnimation ? 2600 : 1500);

    } catch (err) {
      setError(`Authentication failed: ${err.message}`);
      setStep('upload');
    }
  };

  return (
    <div className={`min-h-screen relative overflow-hidden ${isDark ? 'bg-animated text-white' : 'bg-animated-light text-gray-900'}`}>

      {/* Background orbs */}
      <div className="orb w-96 h-96 opacity-15 top-[-100px] right-[-50px]"
        style={{ background: 'radial-gradient(circle, #8A4DFF, transparent)' }} />
      <div className="orb w-80 h-80 opacity-10 bottom-[-80px] left-[-80px]"
        style={{ background: 'radial-gradient(circle, #4A65F6, transparent)', animationDelay: '4s' }} />

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
            onClick={() => navigate('/app/register')}
            className="text-sm font-medium opacity-60 hover:opacity-100 transition-opacity">
            Don't have a keystore?
          </button>
          <ThemeToggle />
        </div>
      </nav>

      {/* Main content */}
      <div className="relative z-10 max-w-xl mx-auto px-8 py-12">

        {/* Upload Step */}
        {step === 'upload' && (
          <div className={`rounded-3xl p-10 ${isDark ? 'glass' : 'glass-light shadow-xl'}`}>
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-2xl btn-primary flex items-center justify-center mx-auto mb-6">
                <KeyRound size={36} />
              </div>
              <h1 className="text-3xl font-black mb-4">
                Connect Your <span className="gradient-text">Node</span>
              </h1>
              <p className={`text-base ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                Upload your keystore to authenticate with your RSA identity.
              </p>
            </div>

            {/* File upload area */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="hidden"
            />

            {!keystore ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`drop-zone p-12 rounded-2xl text-center cursor-pointer transition-all
                  ${isDark ? 'hover:border-indigo-500 hover:bg-indigo-500/5' : 'hover:border-indigo-400 hover:bg-indigo-50'}`}>
                <Upload size={48} className="mx-auto mb-4 opacity-40" />
                <p className="font-semibold mb-2">Click to upload keystore.json</p>
                <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                  or drag and drop your keystore file here
                </p>
              </div>
            ) : (
              <div className={`p-6 rounded-2xl border-2 mb-6
                ${isDark ? 'border-green-500/30 bg-green-500/5' : 'border-green-500/50 bg-green-50'}`}>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={24} className="text-green-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold mb-2">Keystore Loaded</h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className={`${isDark ? 'text-white/40' : 'text-gray-500'}`}>Node ID:</span>
                        <code className="ml-2 font-mono text-xs">{keystore.node_id}</code>
                      </div>
                      <div>
                        <span className={`${isDark ? 'text-white/40' : 'text-gray-500'}`}>Created:</span>
                        <span className="ml-2 text-xs">{formatUtcTimestamp(keystore.created_at)} UTC</span>
                      </div>
                      <div>
                        <span className={`${isDark ? 'text-white/40' : 'text-gray-500'}`}>Algorithm:</span>
                        <span className="ml-2 text-xs">{keystore.algorithm}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setKeystore(null);
                        fileInputRef.current.value = '';
                      }}
                      className="mt-3 text-xs text-red-400 hover:text-red-300 font-medium">
                      Remove and select different file
                    </button>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {keystore && (
              <>
                <div className={`p-4 rounded-xl mb-6 ${isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'}`}>
                  <div className="flex items-start gap-2">
                    <Shield size={16} className="text-blue-400 shrink-0 mt-0.5" />
                    <p className={`text-xs ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                      You'll be asked to sign a cryptographic challenge to prove ownership of this identity.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleLogin}
                  className="btn-primary w-full py-4 rounded-2xl text-base font-bold inline-flex items-center justify-center gap-2">
                  <Shield size={20} />
                  Authenticate with Signature
                </button>
              </>
            )}
          </div>
        )}

        {/* Verifying Step */}
        {step === 'verifying' && (
          <div className={`rounded-3xl p-10 text-center ${isDark ? 'glass' : 'glass-light shadow-xl'}`}>
            <Loader2 size={48} className="animate-spin mx-auto mb-6 text-purple-500" />
            <h2 className="text-2xl font-bold mb-3">Verifying Signature...</h2>
            <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              Signing challenge with your private key and verifying with the network.
            </p>
          </div>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <div className={`rounded-3xl p-10 text-center ${isDark ? 'glass glow-accent' : 'glass-light shadow-xl'}`}>
            <CheckCircle2 size={64} className="mx-auto mb-6 text-green-400" />
            <h2 className="text-3xl font-black mb-3 gradient-text">Authentication Successful!</h2>
            <p className={`text-base mb-6 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
              Redirecting to your dashboard...
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-semibold">
              <span className="w-2 h-2 rounded-full status-online" />
              Node Connected
            </div>

            {showRewardAnimation && (
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
                    Welcome bonus credited on first login.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
