import { useState, useEffect } from 'react';
import { Settings, Save, RotateCcw, Shield, Database, Coins } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getProtocolSettings, updateProtocolSettings } from '../../utils/api';

export default function ProtocolSettingsPage() {
  const { isDark } = useTheme();
  const [settings, setSettings] = useState({
    replication_factor: 3,
    chunk_size_mb: 4,
    token_mint_rate: 0.1,
    min_storage_pledge_gb: 1,
    max_storage_pledge_gb: 500,
  });
  const [originalSettings, setOriginalSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (originalSettings) {
      const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
      setHasChanges(changed);
    }
  }, [settings, originalSettings]);

  const loadSettings = async () => {
    try {
      const data = await getProtocolSettings();
      setSettings(data);
      setOriginalSettings(data);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProtocolSettings(settings);
      setOriginalSettings(settings);
      alert('Protocol settings updated successfully');
    } catch (err) {
      alert('Failed to update settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm('Reset all changes to original values?')) return;
    setSettings(originalSettings);
  };

  const updateSetting = (key, value) => {
    setSettings({ ...settings, [key]: value });
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className={`h-32 rounded-3xl ${isDark ? 'bg-white/5' : 'bg-gray-200'}`} />
            <div className={`h-48 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-gray-200'}`} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black mb-2">
              Protocol <span className="gradient-text">Settings</span>
            </h1>
            <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
              Configure replication factors, chunk sizes, and token minting rules
            </p>
          </div>
          {hasChanges && (
            <div className={`px-4 py-2 rounded-xl ${
              isDark ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <span className="text-sm font-semibold text-yellow-400">Unsaved Changes</span>
            </div>
          )}
        </div>

        {/* Storage & Replication Settings */}
        <div className={`rounded-3xl p-8 ${
          isDark ? 'glass glow-accent' : 'glass-light shadow-xl'
        }`}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isDark ? 'bg-blue-500/20' : 'bg-blue-100'
            }`}>
              <Database size={24} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Storage & Replication</h2>
              <p className={`text-xs ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                File storage and redundancy parameters
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Replication Factor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">Replication Factor</label>
                <span className="text-2xl font-black text-indigo-400">
                  {settings.replication_factor}x
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={settings.replication_factor}
                onChange={(e) => updateSetting('replication_factor', parseInt(e.target.value))}
                className="w-full h-2 rounded-full bg-white/10 appearance-none cursor-pointer slider"
              />
              <p className={`text-xs mt-2 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                Number of copies stored across the network for redundancy
              </p>
            </div>

            {/* Chunk Size */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">Chunk Size (MB)</label>
                <span className="text-2xl font-black text-blue-400">
                  {settings.chunk_size_mb} MB
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="16"
                step="1"
                value={settings.chunk_size_mb}
                onChange={(e) => updateSetting('chunk_size_mb', parseInt(e.target.value))}
                className="w-full h-2 rounded-full bg-white/10 appearance-none cursor-pointer slider"
              />
              <p className={`text-xs mt-2 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                Size of individual file chunks for distributed storage
              </p>
            </div>

            {/* Storage Pledge Limits */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-semibold block mb-3">
                  Min Storage Pledge (GB)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.min_storage_pledge_gb}
                  onChange={(e) => updateSetting('min_storage_pledge_gb', parseInt(e.target.value))}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    isDark 
                      ? 'bg-white/5 border-white/10 text-white' 
                      : 'bg-gray-50 border-gray-200 text-gray-900'
                  } outline-none focus:border-indigo-500 transition-colors`}
                />
              </div>

              <div>
                <label className="text-sm font-semibold block mb-3">
                  Max Storage Pledge (GB)
                </label>
                <input
                  type="number"
                  min="100"
                  max="10000"
                  step="100"
                  value={settings.max_storage_pledge_gb}
                  onChange={(e) => updateSetting('max_storage_pledge_gb', parseInt(e.target.value))}
                  className={`w-full px-4 py-3 rounded-xl border ${
                    isDark 
                      ? 'bg-white/5 border-white/10 text-white' 
                      : 'bg-gray-50 border-gray-200 text-gray-900'
                  } outline-none focus:border-indigo-500 transition-colors`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tokenomics Settings */}
        <div className={`rounded-3xl p-8 ${
          isDark ? 'glass' : 'glass-light shadow-xl'
        }`}>
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isDark ? 'bg-yellow-500/20' : 'bg-yellow-100'
            }`}>
              <Coins size={24} className="text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Tokenomics</h2>
              <p className={`text-xs ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                AST token minting and reward parameters
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Token Mint Rate */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold">Token Mint Rate (AST/GB/day)</label>
                <span className="text-2xl font-black text-yellow-400">
                  {settings.token_mint_rate.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.01"
                max="2.0"
                step="0.01"
                value={settings.token_mint_rate}
                onChange={(e) => updateSetting('token_mint_rate', parseFloat(e.target.value))}
                className="w-full h-2 rounded-full bg-white/10 appearance-none cursor-pointer slider"
              />
              <p className={`text-xs mt-2 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                Tokens minted per gigabyte of storage pledged per day
              </p>
            </div>

            {/* Reward Preview */}
            <div className={`p-6 rounded-2xl ${
              isDark ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20' : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <h3 className="text-sm font-semibold mb-4">Reward Calculation Preview</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className={isDark ? 'text-white/60' : 'text-gray-600'}>
                    100 GB pledge for 1 day:
                  </span>
                  <span className="font-bold text-yellow-400">
                    {(100 * settings.token_mint_rate * 1).toFixed(2)} AST
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-white/60' : 'text-gray-600'}>
                    100 GB pledge for 30 days:
                  </span>
                  <span className="font-bold text-yellow-400">
                    {(100 * settings.token_mint_rate * 30).toFixed(2)} AST
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-white/60' : 'text-gray-600'}>
                    1000 GB pledge for 30 days:
                  </span>
                  <span className="font-bold text-yellow-400">
                    {(1000 * settings.token_mint_rate * 30).toFixed(2)} AST
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className={`rounded-2xl p-6 ${
          isDark ? 'bg-red-500/10 border border-red-500/30' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-start gap-3">
            <Shield size={20} className="text-red-400 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-red-400 mb-1">
                Warning: Protocol Parameter Changes
              </h3>
              <p className={`text-xs ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                Modifying these settings will affect all nodes in the network. Changes should be coordinated 
                with network operators and may require a consensus vote in production environments.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-4">
          <button
            onClick={handleReset}
            disabled={!hasChanges || saving}
            className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
              hasChanges && !saving
                ? isDark
                  ? 'bg-white/10 hover:bg-white/15 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                : 'opacity-50 cursor-not-allowed'
            }`}>
            <RotateCcw size={16} />
            Reset Changes
          </button>

          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className={`px-8 py-3 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 ${
              hasChanges && !saving
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg'
                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
            }`}>
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

      </div>

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
        }
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.4);
          border: none;
        }
      `}</style>
    </div>
  );
}
