import { useState, useEffect } from 'react';
import { Network, Globe, Radar, Server, Wifi, WifiOff, Activity, Zap, Clock } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getPeers, getNetworkMetrics } from '../../utils/api';

export default function NetworkMonitorPage() {
  const { isDark } = useTheme();
  const [peers, setPeers] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all'); // all, online, offline

  useEffect(() => {
    loadNetworkData();
    const interval = setInterval(loadNetworkData, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const loadNetworkData = async () => {
    try {
      const [peersData, metricsData] = await Promise.all([
        getPeers(50),
        getNetworkMetrics(),
      ]);
      setPeers(peersData.peers || []);
      setMetrics(metricsData);
    } catch (err) {
      console.error('Failed to load network data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Using only real API data - no mock data
  const filteredPeers = peers.filter(p => 
    activeFilter === 'all' || p.status === activeFilter
  );

  const regionCount = new Set(peers.map((peer) => peer.region).filter(Boolean)).size;

  const networkOverview = peers.length > 0 ? {
    total_peers: peers.length,
    online_peers: peers.filter(p => p.status === 'online').length,
    offline_peers: peers.filter(p => p.status === 'offline').length,
    avg_latency: Math.round(peers.reduce((acc, p) => acc + (p.latency_ms || 0), 0) / (peers.length || 1)),
    total_storage: peers.reduce((acc, p) => acc + (p.storage_pledged_gb || 0), 0),
    active_connections: peers.filter(p => p.status === 'online').length,
  } : {
    total_peers: 0,
    online_peers: 0,
    offline_peers: 0,
    avg_latency: 0,
    total_storage: 0,
    active_connections: 0,
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className={`h-32 rounded-3xl ${isDark ? 'bg-white/5' : 'bg-gray-200'}`} />
            <div className="grid grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className={`h-24 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-gray-200'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black mb-2">
              Network <span className="gradient-text">Monitor</span>
            </h1>
            <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
              Live P2P network topology and peer node status tracking
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm font-medium text-green-400">Network Active</span>
          </div>
        </div>

        {/* Network Overview Panel */}
        <div className={`rounded-3xl p-8 relative overflow-hidden ${
          isDark ? 'glass glow-accent' : 'glass-light shadow-xl'
        }`}>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                isDark ? 'bg-blue-500/20' : 'bg-blue-100'
              }`}>
                <Network size={28} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">P2P Network Topology</h2>
                <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                  {networkOverview.total_peers} registered peers across {regionCount} regions
                </p>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-4">
              <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Wifi size={16} className="text-green-400" />
                  <p className={`text-xs font-medium ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Online Peers
                  </p>
                </div>
                <p className="text-2xl font-black text-green-400">{networkOverview.online_peers}</p>
              </div>

              <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <WifiOff size={16} className="text-red-400" />
                  <p className={`text-xs font-medium ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Offline Peers
                  </p>
                </div>
                <p className="text-2xl font-black text-red-400">{networkOverview.offline_peers}</p>
              </div>

              <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={16} className="text-yellow-400" />
                  <p className={`text-xs font-medium ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Avg Latency
                  </p>
                </div>
                <p className="text-2xl font-black">{networkOverview.avg_latency}ms</p>
              </div>

              <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Activity size={16} className="text-blue-400" />
                  <p className={`text-xs font-medium ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Active Connections
                  </p>
                </div>
                <p className="text-2xl font-black">{networkOverview.active_connections}</p>
              </div>

              <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Server size={16} className="text-purple-400" />
                  <p className={`text-xs font-medium ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Total Storage
                  </p>
                </div>
                <p className="text-2xl font-black">{(networkOverview.total_storage / 1024).toFixed(1)}TB</p>
              </div>

              <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Globe size={16} className="text-indigo-400" />
                  <p className={`text-xs font-medium ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Regions
                  </p>
                </div>
                <p className="text-2xl font-black">{regionCount}</p>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-50" />
        </div>

        {/* Peer Status Table */}
        <div className={`rounded-3xl overflow-hidden ${
          isDark ? 'glass' : 'glass-light shadow-xl'
        }`}>
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Peer Node Status</h3>
              
              {/* Filter Tabs */}
              <div className={`flex gap-2 p-1 rounded-xl ${
                isDark ? 'bg-white/5' : 'bg-gray-100'
              }`}>
                {['all', 'online', 'offline'].map(filter => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                      activeFilter === filter
                        ? isDark
                          ? 'bg-white/10 text-white'
                          : 'bg-white text-gray-900 shadow'
                        : isDark
                          ? 'text-white/60 hover:text-white'
                          : 'text-gray-600 hover:text-gray-900'
                    }`}>
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                  <th className={`text-left p-4 text-xs font-semibold ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Node ID
                  </th>
                  <th className={`text-left p-4 text-xs font-semibold ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    IP Address
                  </th>
                  <th className={`text-left p-4 text-xs font-semibold ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Region
                  </th>
                  <th className={`text-left p-4 text-xs font-semibold ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Type
                  </th>
                  <th className={`text-left p-4 text-xs font-semibold ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Status
                  </th>
                  <th className={`text-left p-4 text-xs font-semibold ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Latency
                  </th>
                  <th className={`text-left p-4 text-xs font-semibold ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Storage
                  </th>
                  <th className={`text-left p-4 text-xs font-semibold ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Files
                  </th>
                  <th className={`text-left p-4 text-xs font-semibold ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Uptime
                  </th>
                  <th className={`text-left p-4 text-xs font-semibold ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Last Seen
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPeers.map((peer, idx) => (
                  <tr
                    key={idx}
                    className={`border-b transition-colors ${
                      isDark 
                        ? 'border-white/5 hover:bg-white/5' 
                        : 'border-gray-100 hover:bg-gray-50'
                    }`}>
                    <td className="p-4">
                      <code className={`text-xs font-mono ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                        {peer.node_id}
                      </code>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-mono">{peer.ip_address}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm">{peer.region}</span>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded ${
                        isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600'
                      }`}>
                        {peer.node_type}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          peer.status === 'online' ? 'bg-green-400' : 'bg-red-400'
                        }`} />
                        <span className={`text-xs font-semibold ${
                          peer.status === 'online' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {peer.status}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-mono">{peer.latency_ms}ms</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm">{peer.storage_pledged_gb} GB</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm">{peer.files_stored}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-semibold">{peer.uptime_pct}%</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Clock size={12} className={isDark ? 'text-white/40' : 'text-gray-400'} />
                        <span className={`text-xs ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                          {peer.last_seen}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredPeers.length === 0 && (
              <div className="text-center py-12">
                <Network size={48} className="mx-auto mb-4 opacity-20" />
                <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                  {peers.length === 0 ? 'No peers connected yet' : 'No peers match the selected filter'}
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
