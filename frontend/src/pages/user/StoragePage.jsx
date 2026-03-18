import { useState, useEffect } from 'react';
import { HardDrive, Zap, CheckCircle2, AlertCircle, Loader2, Award, Server, Activity } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getStorageStatus, pledgeStorage, getContainerStatus } from '../../utils/api';

export default function StoragePage() {
  const { isDark } = useTheme();

  const [storageGB, setStorageGB] = useState(10);
  const [currentPledge, setCurrentPledge] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pledging, setPledging] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [containerStatus, setContainerStatus] = useState(null);
  const [containerLoading, setContainerLoading] = useState(false);

  useEffect(() => {
    loadStorageStatus();
  }, []);

  const loadStorageStatus = async () => {
    try {
      setLoading(true);
      const data = await getStorageStatus();
      setCurrentPledge(data.storage_pledged / (1024 * 1024 * 1024)); // Convert to GB
      
      // Load container status if pledge exists
      if (data.storage_pledged > 0) {
        loadContainerStatus();
      }
    } catch (err) {
      console.error('Failed to load storage:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadContainerStatus = async () => {
    try {
      setContainerLoading(true);
      const status = await getContainerStatus();
      setContainerStatus(status);
    } catch (err) {
      console.error('Failed to load container status:', err);
    } finally {
      setContainerLoading(false);
    }
  };

  const handlePledge = async () => {
    if (storageGB < 1) {
      setError('Minimum pledge is 1 GB');
      return;
    }

    try {
      setPledging(true);
      setError('');
      setSuccess('');

      const result = await pledgeStorage(storageGB);

      setSuccess(`Successfully pledged ${storageGB} GB! You'll earn ${(storageGB * 0.5).toFixed(1)} AST/day. 🚀 Your storage container is now running!`);
      setCurrentPledge(currentPledge + storageGB);

      // Reload status and container info
      setTimeout(() => {
        loadStorageStatus();
      }, 1000);

    } catch (err) {
      setError(`Pledge failed: ${err.message}`);
    } finally {
      setPledging(false);
    }
  };

  const estimatedDaily = storageGB * 0.5;
  const estimatedMonthly = estimatedDaily * 30;

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className={`h-64 rounded-3xl ${isDark ? 'bg-white/5' : 'bg-gray-200'}`} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black mb-2">
            Storage <span className="gradient-text">Node</span>
          </h1>
          <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
            Pledge storage space to the network and earn AST tokens
          </p>
        </div>

        {/* Container Status - if container exists */}
        {containerStatus?.has_container && (
          <div className={`rounded-3xl p-8 ${
            isDark ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20' : 
            'bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isDark ? 'bg-green-500/20' : 'bg-green-100'
                }`}>
                  <Server size={24} className="text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Storage Container</h2>
                  <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Docker container running on your node
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${containerStatus?.docker_running ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                <span className={`text-sm font-medium ${containerStatus?.docker_running ? 'text-green-400' : 'text-gray-400'}`}>
                  {containerStatus?.docker_running ? 'Running' : 'Offline'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white/50'}`}>
                <p className={`text-xs mb-1 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Container ID</p>
                <p className="text-sm font-mono font-bold">{containerStatus?.container_id || 'N/A'}</p>
              </div>
              <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white/50'}`}>
                <p className={`text-xs mb-1 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Allocated Storage</p>
                <p className="text-sm font-bold">{containerStatus?.storage_gb || 0} GB</p>
              </div>
              <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white/50'}`}>
                <p className={`text-xs mb-1 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Volume Name</p>
                <p className="text-sm font-mono text-xs font-bold">{containerStatus?.volume_name?.substring(0, 20) || 'N/A'}...</p>
              </div>
              <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white/50'}`}>
                <p className={`text-xs mb-1 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Status</p>
                <div className="flex items-center gap-2">
                  <Activity size={14} className={containerStatus?.docker_running ? 'text-green-400' : 'text-gray-400'} />
                  <p className="text-sm font-bold">{containerStatus?.docker_status || 'Unknown'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Current Status */}
        <div className={`rounded-3xl p-8 ${isDark ? 'glass' : 'glass-light shadow-xl'}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Current Pledge</h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-green-400 font-medium">Active</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className={`text-xs font-medium mb-2 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                Total Pledged
              </p>
              <p className="text-3xl font-black gradient-text">
                {currentPledge.toFixed(1)} GB
              </p>
            </div>
            <div>
              <p className={`text-xs font-medium mb-2 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                Daily Earnings
              </p>
              <p className="text-3xl font-black text-yellow-400">
                {(currentPledge * 0.5).toFixed(1)} AST
              </p>
            </div>
            <div>
              <p className={`text-xs font-medium mb-2 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                Monthly Est.
              </p>
              <p className="text-3xl font-black text-green-400">
                {(currentPledge * 0.5 * 30).toFixed(0)} AST
              </p>
            </div>
          </div>
        </div>

        {/* Pledge New Storage */}
        <div className={`rounded-3xl p-8 ${isDark ? 'glass' : 'glass-light shadow-xl'}`}>
          <h2 className="text-xl font-bold mb-6">Pledge Additional Storage</h2>

          {/* Storage Slider */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <label className={`text-sm font-medium ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                Storage Amount
              </label>
              <span className="text-3xl font-black gradient-text">
                {storageGB} GB
              </span>
            </div>

            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={storageGB}
              onChange={(e) => setStorageGB(parseInt(e.target.value))}
              className="w-full h-3 rounded-full appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, rgb(99, 102, 241) 0%, rgb(99, 102, 241) ${storageGB}%, ${isDark ? 'rgba(255,255,255,0.1)' : 'rgb(229, 231, 235)'} ${storageGB}%, ${isDark ? 'rgba(255,255,255,0.1)' : 'rgb(229, 231, 235)'} 100%)`
              }}
            />

            <div className="flex justify-between mt-2 text-xs">
              <span className={isDark ? 'text-white/40' : 'text-gray-400'}>1 GB</span>
              <span className={isDark ? 'text-white/40' : 'text-gray-400'}>100 GB</span>
            </div>
          </div>

          {/* Earnings Estimate */}
          <div className={`p-6 rounded-2xl mb-6 ${
            isDark ? 'bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20' : 
            'bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isDark ? 'bg-yellow-500/20' : 'bg-yellow-100'
              }`}>
                <Award size={24} className="text-yellow-400" />
              </div>
              <div>
                <p className="font-semibold">Estimated Earnings</p>
                <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                  Based on current network rewards
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'}`}>
                <p className={`text-xs mb-1 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Daily</p>
                <p className="text-2xl font-black text-yellow-400">
                  +{estimatedDaily.toFixed(1)} AST
                </p>
              </div>
              <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'}`}>
                <p className={`text-xs mb-1 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Monthly</p>
                <p className="text-2xl font-black text-green-400">
                  +{estimatedMonthly.toFixed(0)} AST
                </p>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className={`p-4 rounded-xl mb-6 flex items-start gap-3 ${
            isDark ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-200'
          }`}>
            <HardDrive size={20} className="text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className={isDark ? 'text-white/60' : 'text-gray-600'}>
                <strong>How it works:</strong> Pledge storage space to store encrypted chunks from other nodes.
              </p>
              <p className={isDark ? 'text-white/60' : 'text-gray-600'}>
                <strong>Docker Container:</strong> When you pledge, a persistent Docker container is automatically created on your node to safely store encrypted files.
              </p>
              <p className={isDark ? 'text-white/60' : 'text-gray-600'}>
                <strong>Rewards:</strong> Earn 0.5 AST per GB per day. Withdraw anytime to your wallet.
              </p>
              <p className={isDark ? 'text-white/60' : 'text-gray-600'}>
                <strong>Requirements:</strong> Node must stay online. Automatic penalties for downtime.
              </p>
              <p className={isDark ? 'text-white/60' : 'text-gray-600'}>
                <strong>Data Safety:</strong> Container data is persistent and cannot be deleted. Only you control access to your node.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm flex items-center gap-2">
              <CheckCircle2 size={16} />
              {success}
            </div>
          )}

          {/* Pledge Button */}
          <button
            onClick={handlePledge}
            disabled={pledging}
            className="btn-primary w-full py-4 rounded-2xl text-base font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {pledging ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Pledging Storage...
              </>
            ) : (
              <>
                <Zap size={20} />
                Pledge {storageGB} GB & Start Earning
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
