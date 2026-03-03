import { useState, useEffect } from 'react';
import { 
  Activity, Database, Users, HardDrive, TrendingUp, Server, 
  Zap, Globe, Shield, AlertCircle, CheckCircle2, Loader2 
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getAdminStats, getBlockchainLogs, getPeers } from '../../utils/api';

export default function AdminDashboardPage() {
  const { isDark } = useTheme();
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [peers, setPeers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [adminStats, blockchainEvents, peerData] = await Promise.all([
        getAdminStats().catch(() => ({ total_nodes: 0, total_files: 0, total_storage: 0, network_health: 'Unknown', uptime: 0, active_peers: 0, avg_latency: 0, throughput: 0, failed_requests: 0, regions: 0 })),
        getBlockchainLogs(5).catch(() => ({ events: [] })),
        getPeers(100).catch(() => ({ peers: [] }))
      ]);
      
      setStats(adminStats);
      setEvents(blockchainEvents.events || []);
      setPeers(peerData.peers || []);
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className={`h-48 rounded-3xl ${isDark ? 'bg-white/5' : 'bg-gray-200'}`} />
            <div className="grid grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={`h-32 rounded-2xl ${isDark ? 'bg-white/5' : 'bg-gray-200'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const metrics = [
    {
      icon: Users,
      label: 'Total Nodes',
      value: stats?.total_nodes || 0,
      change: '+12',
      changeLabel: 'this week',
      color: 'text-blue-400',
      bgColor: isDark ? 'bg-blue-500/10' : 'bg-blue-50',
    },
    {
      icon: Database,
      label: 'Stored Files',
      value: stats?.total_files || 0,
      change: '+48',
      changeLabel: 'this week',
      color: 'text-purple-400',
      bgColor: isDark ? 'bg-purple-500/10' : 'bg-purple-50',
    },
    {
      icon: HardDrive,
      label: 'Total Storage',
      value: `${((stats?.total_storage || 0) / (1024 ** 4)).toFixed(2)} PB`,
      subtitle: `${stats?.storage_utilization || 0}% utilized`,
      color: 'text-green-400',
      bgColor: isDark ? 'bg-green-500/10' : 'bg-green-50',
    },
    {
      icon: Zap,
      label: 'Network Health',
      value: stats?.network_health || 'Excellent',
      subtitle: `${stats?.uptime || 99.9}% uptime`,
      color: 'text-yellow-400',
      bgColor: isDark ? 'bg-yellow-500/10' : 'bg-yellow-50',
    },
  ];

  const systemMetrics = [
    { label: 'Active Peers', value: stats?.active_peers || 0, status: 'healthy' },
    { label: 'Avg Latency', value: `${stats?.avg_latency || 0}ms`, status: 'healthy' },
    { label: 'Throughput', value: `${stats?.throughput || 0} MB/s`, status: 'healthy' },
    { label: 'Failed Requests', value: stats?.failed_requests || 0, status: (stats?.failed_requests || 0) > 10 ? 'warning' : 'healthy' },
  ];

  const recentEvents = (events || []).map(event => ({
    type: event.event_type || 'event',
    description: event.description || event.details || 'Unknown event',
    time: event.timestamp ? new Date(event.timestamp).toLocaleString() : 'Unknown',
    status: event.status || 'success',
  }));

  // Show empty state if no events
  const displayEvents = recentEvents.length > 0 ? recentEvents : [
    { type: 'info', description: 'No recent network events', time: 'Waiting for activity...', status: 'success' }
  ];

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black mb-2">
              Global <span className="gradient-text">Dashboard</span>
            </h1>
            <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
              Real-time network monitoring and system health metrics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm font-medium text-green-400">All Systems Operational</span>
            </div>
          </div>
        </div>

        {/* Network Overview */}
        <div className={`rounded-3xl p-8 relative overflow-hidden ${
          isDark ? 'glass glow-accent' : 'glass-light shadow-xl'
        }`}>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'
                }`}>
                  <Globe size={28} className="text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">DecentraStore Network</h2>
                  <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                    Distributed across {stats?.regions || 12} regions worldwide
                  </p>
                </div>
              </div>
              <div className={`px-4 py-2 rounded-xl ${
                isDark ? 'bg-green-500/20 border border-green-500/30' : 'bg-green-50 border border-green-200'
              }`}>
                <div className="flex items-center gap-2">
                  <Activity size={16} className="text-green-400" />
                  <span className="text-sm font-semibold text-green-400">LIVE</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-6">
              {systemMetrics.map((metric, idx) => (
                <div key={idx} className={`p-4 rounded-xl ${
                  isDark ? 'bg-white/5' : 'bg-white'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className={`text-xs font-medium ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                      {metric.label}
                    </p>
                    {metric.status === 'healthy' ? (
                      <CheckCircle2 size={14} className="text-green-400" />
                    ) : (
                      <AlertCircle size={14} className="text-yellow-400" />
                    )}
                  </div>
                  <p className="text-2xl font-black">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-50" />
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric, idx) => (
            <div
              key={idx}
              className={`rounded-2xl p-6 transition-all ${
                isDark ? 'glass hover:bg-white/5' : 'glass-light shadow hover:shadow-lg'
              }`}>
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${metric.bgColor} flex items-center justify-center`}>
                  <metric.icon size={24} className={metric.color} />
                </div>
                {metric.change && (
                  <div className="text-right">
                    <span className="text-xs text-green-400 font-semibold">{metric.change}</span>
                    <p className={`text-[10px] ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                      {metric.changeLabel}
                    </p>
                  </div>
                )}
              </div>
              <p className={`text-xs font-medium mb-1 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                {metric.label}
              </p>
              <p className="text-2xl font-black mb-1">{metric.value}</p>
              {metric.subtitle && (
                <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                  {metric.subtitle}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recent Events */}
          <div className={`lg:col-span-2 rounded-3xl p-6 ${
            isDark ? 'glass' : 'glass-light shadow-xl'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Recent Network Events</h3>
              <button className={`text-xs font-medium ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                View All Logs
              </button>
            </div>
            <div className="space-y-3">
              {displayEvents.map((event, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl flex items-center justify-between ${
                    isDark ? 'bg-white/5 hover:bg-white/8' : 'bg-gray-50 hover:bg-gray-100'
                  } transition-all`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      event.status === 'success' ? 'bg-green-400' : 'bg-yellow-400'
                    }`} />
                    <div>
                      <p className="text-sm font-medium">{event.description}</p>
                      <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                        {event.time}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full ${
                    event.status === 'success' 
                      ? isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'
                      : isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-600'
                  }`}>
                    {event.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* System Status */}
          <div className={`rounded-3xl p-6 ${
            isDark ? 'glass' : 'glass-light shadow-xl'
          }`}>
            <div className="flex items-center gap-2 mb-6">
              <Server size={20} className="text-indigo-400" />
              <h3 className="text-xl font-bold">System Status</h3>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-xs ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                    API Server
                  </span>
                  <span className="text-xs text-green-400 font-semibold">Healthy</span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
                  <div className="h-full bg-green-400" style={{ width: '100%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-xs ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                    Database
                  </span>
                  <span className="text-xs text-green-400 font-semibold">Healthy</span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
                  <div className="h-full bg-green-400" style={{ width: '98%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-xs ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                    P2P Network
                  </span>
                  <span className="text-xs text-green-400 font-semibold">Healthy</span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
                  <div className="h-full bg-green-400" style={{ width: '95%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-xs ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                    Blockchain Sync
                  </span>
                  <span className="text-xs text-yellow-400 font-semibold">Syncing</span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
                  <div className="h-full bg-yellow-400" style={{ width: '87%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-xs ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                    Storage Capacity
                  </span>
                  <span className="text-xs text-blue-400 font-semibold">62%</span>
                </div>
                <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
                  <div className="h-full bg-blue-400" style={{ width: '62%' }} />
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className={`mt-6 p-4 rounded-xl ${
              isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'
            }`}>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className={isDark ? 'text-white/60' : 'text-gray-600'}>CPU Usage</span>
                  <span className="font-mono">23%</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-white/60' : 'text-gray-600'}>Memory</span>
                  <span className="font-mono">4.2 / 16 GB</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-white/60' : 'text-gray-600'}>Disk I/O</span>
                  <span className="font-mono">145 MB/s</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Performance Charts Placeholder */}
        <div className="grid grid-cols-2 gap-6">
          <div className={`rounded-3xl p-6 ${isDark ? 'glass' : 'glass-light shadow-xl'}`}>
            <h3 className="text-lg font-bold mb-4">Network Traffic (24h)</h3>
            <div className={`h-48 rounded-xl flex items-end justify-center gap-2 p-4 ${
              isDark ? 'bg-white/5' : 'bg-gray-50'
            }`}>
              {[45, 62, 58, 71, 85, 78, 92, 88, 95, 87, 90, 96].map((height, idx) => (
                <div
                  key={idx}
                  className="flex-1 bg-gradient-to-t from-indigo-500 to-purple-500 rounded-t"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>

          <div className={`rounded-3xl p-6 ${isDark ? 'glass' : 'glass-light shadow-xl'}`}>
            <h3 className="text-lg font-bold mb-4">Storage Growth (30d)</h3>
            <div className={`h-48 rounded-xl flex items-end justify-center gap-2 p-4 ${
              isDark ? 'bg-white/5' : 'bg-gray-50'
            }`}>
              {[30, 35, 40, 42, 48, 52, 58, 65, 70, 75, 82, 88].map((height, idx) => (
                <div
                  key={idx}
                  className="flex-1 bg-gradient-to-t from-green-500 to-blue-500 rounded-t"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
