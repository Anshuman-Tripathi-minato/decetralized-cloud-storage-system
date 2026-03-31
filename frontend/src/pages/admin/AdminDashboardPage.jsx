import { useState, useEffect, useMemo } from 'react';
import { 
  Activity, Database, Users, HardDrive, TrendingUp, Server, 
  Zap, Globe, Shield, AlertCircle, CheckCircle2
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getAdminStats, getBlockchainLogs, getPeers, getNetworkMetrics, getAdminStorageDistribution } from '../../utils/api';

export default function AdminDashboardPage() {
  const { isDark } = useTheme();
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [peers, setPeers] = useState([]);
  const [performanceHistory, setPerformanceHistory] = useState([]);
  const [storageDistribution, setStorageDistribution] = useState({ summary: {}, files: [] });
  const [distributionSearch, setDistributionSearch] = useState('');
  const [distributionOwnerFilter, setDistributionOwnerFilter] = useState('all');
  const [distributionStatusFilter, setDistributionStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const distributionFiles = Array.isArray(storageDistribution?.files) ? storageDistribution.files : [];

  const ownerOptions = useMemo(() => {
    const owners = new Set(
      distributionFiles
        .map((doc) => doc.owner_node_id)
        .filter(Boolean)
    );
    return ['all', ...Array.from(owners)];
  }, [distributionFiles]);

  const filteredDistributionFiles = useMemo(() => {
    const searchNeedle = distributionSearch.trim().toLowerCase();

    return distributionFiles.filter((doc) => {
      const storageNodes = Array.isArray(doc.storage_nodes) ? doc.storage_nodes : [];
      const hasActiveNode = storageNodes.some((node) => node?.is_active);
      const hasInactiveNode = storageNodes.some((node) => node && !node.is_active);

      if (distributionOwnerFilter !== 'all' && doc.owner_node_id !== distributionOwnerFilter) {
        return false;
      }

      if (distributionStatusFilter === 'active-only' && !hasActiveNode) {
        return false;
      }

      if (distributionStatusFilter === 'inactive-only' && !hasInactiveNode) {
        return false;
      }

      if (!searchNeedle) {
        return true;
      }

      const flattenedNodeData = storageNodes
        .map((node) => `${node?.node_id || ''} ${node?.ip_address || ''}`)
        .join(' ')
        .toLowerCase();

      const searchable = `${
        doc.filename || ''
      } ${
        doc.cid || ''
      } ${
        doc.owner_node_id || ''
      } ${
        doc.owner_user_identifier || ''
      } ${flattenedNodeData}`.toLowerCase();

      return searchable.includes(searchNeedle);
    });
  }, [distributionFiles, distributionSearch, distributionOwnerFilter, distributionStatusFilter]);

  const filteredDistributionNodeCount = useMemo(() => {
    const nodeIds = new Set();
    filteredDistributionFiles.forEach((doc) => {
      (doc.storage_nodes || []).forEach((node) => {
        if (node?.node_id) {
          nodeIds.add(node.node_id);
        }
      });
    });
    return nodeIds.size;
  }, [filteredDistributionFiles]);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [adminStats, blockchainEvents, peerData, networkData, distributionData] = await Promise.all([
        getAdminStats().catch(() => ({ total_nodes: 0, total_files: 0, total_storage: 0, network_health: 'Unknown', uptime: 0, active_peers: 0, avg_latency: 0, throughput: 0, failed_requests: 0, regions: 0 })),
        getBlockchainLogs(5).catch(() => ({ logs: [] })),
        getPeers(100).catch(() => ({ peers: [] })),
        getNetworkMetrics().catch(() => ({ data: [] })),
        getAdminStorageDistribution(200).catch(() => ({ summary: {}, files: [] })),
      ]);
      
      setStats(adminStats);
      setEvents(blockchainEvents.logs || []);
      setPeers(peerData.peers || []);
      setPerformanceHistory(Array.isArray(networkData?.data) ? networkData.data : []);
      setStorageDistribution(distributionData || { summary: {}, files: [] });
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
      color: 'text-blue-400',
      bgColor: isDark ? 'bg-blue-500/10' : 'bg-blue-50',
    },
    {
      icon: Database,
      label: 'Stored Files',
      value: stats?.total_files || 0,
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
      value: stats?.network_health || 'Unknown',
      subtitle: `${stats?.uptime || 0}% uptime`,
      color: 'text-yellow-400',
      bgColor: isDark ? 'bg-yellow-500/10' : 'bg-yellow-50',
    },
  ];

  const systemMetrics = [
    { label: 'Active Peers', value: stats?.active_peers || 0, status: (stats?.active_peers || 0) > 0 ? 'healthy' : 'warning' },
    { label: 'Avg Latency', value: `${stats?.avg_latency || 0}ms`, status: (stats?.avg_latency || 0) > 0 ? 'healthy' : 'warning' },
    { label: 'Throughput', value: `${stats?.throughput || 0} chunks/day`, status: (stats?.throughput || 0) > 0 ? 'healthy' : 'warning' },
    { label: 'Failed Requests', value: stats?.failed_requests || 0, status: (stats?.failed_requests || 0) > 0 ? 'warning' : 'healthy' },
  ];

  const recentEvents = (events || []).map(event => ({
    type: event.event_type || 'event',
    description: event.description || event.details || 'Unknown event',
    time: event.timestamp ? new Date(event.timestamp).toLocaleString() : 'Unknown',
    status: event.status || 'success',
  }));

  // Show empty state if no events
  const displayEvents = recentEvents.length > 0 ? recentEvents : [
    { type: 'info', description: 'No recent network events', time: 'Waiting for activity...', status: 'info' }
  ];

  const isOperational = (stats?.network_health || '').toLowerCase() === 'healthy';

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
              <div className={`w-2 h-2 rounded-full ${isOperational ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
              <span className={`text-sm font-medium ${isOperational ? 'text-green-400' : 'text-yellow-400'}`}>
                {isOperational ? 'System Healthy' : 'Awaiting Live Metrics'}
              </span>
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
                    Distributed across {stats?.regions || 0} regions worldwide
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
                      : event.status === 'info'
                      ? isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'
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

            <div className={`p-4 rounded-xl ${
              isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'
            }`}>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className={isDark ? 'text-white/60' : 'text-gray-600'}>Active Peers</span>
                  <span className="font-mono">{stats?.active_peers || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-white/60' : 'text-gray-600'}>Avg Latency</span>
                  <span className="font-mono">{stats?.avg_latency || 0}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-white/60' : 'text-gray-600'}>Last Block</span>
                  <span className="font-mono">#{stats?.last_block || 0}</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className={`rounded-3xl p-6 ${isDark ? 'glass' : 'glass-light shadow-xl'}`}>
          <h3 className="text-lg font-bold mb-4">Performance History</h3>
          {performanceHistory.length > 0 ? (
            <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
              {performanceHistory.length} historical data points available from network metrics.
            </p>
          ) : (
            <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              No historical performance data available yet.
            </p>
          )}
        </div>

        <div className={`rounded-3xl p-6 ${isDark ? 'glass' : 'glass-light shadow-xl'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">File Storage Distribution (Node IDs + IPs)</h3>
            <span className={`text-xs ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
              {filteredDistributionFiles.length} / {storageDistribution?.summary?.total_files || 0} files shown
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-4">
            <input
              type="text"
              value={distributionSearch}
              onChange={(e) => setDistributionSearch(e.target.value)}
              placeholder="Search by CID, user, node ID, or IP"
              className={`lg:col-span-2 px-3 py-2 rounded-xl text-sm border outline-none ${
                isDark
                  ? 'bg-white/5 border-white/10 focus:border-indigo-400 text-white'
                  : 'bg-white border-gray-200 focus:border-indigo-500 text-gray-900'
              }`}
            />
            <select
              value={distributionOwnerFilter}
              onChange={(e) => setDistributionOwnerFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl text-sm border outline-none ${
                isDark
                  ? 'bg-white/5 border-white/10 focus:border-indigo-400 text-white'
                  : 'bg-white border-gray-200 focus:border-indigo-500 text-gray-900'
              }`}
            >
              {ownerOptions.map((ownerId) => (
                <option key={ownerId} value={ownerId}>
                  {ownerId === 'all' ? 'All Owner Nodes' : ownerId}
                </option>
              ))}
            </select>
            <select
              value={distributionStatusFilter}
              onChange={(e) => setDistributionStatusFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl text-sm border outline-none ${
                isDark
                  ? 'bg-white/5 border-white/10 focus:border-indigo-400 text-white'
                  : 'bg-white border-gray-200 focus:border-indigo-500 text-gray-900'
              }`}
            >
              <option value="all">All Node Status</option>
              <option value="active-only">Files On Active Nodes</option>
              <option value="inactive-only">Files With Inactive Nodes</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
            <div className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
              <p className={`text-[11px] ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Filtered Files</p>
              <p className="text-lg font-black">{filteredDistributionFiles.length}</p>
            </div>
            <div className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
              <p className={`text-[11px] ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Owner Nodes</p>
              <p className="text-lg font-black">{storageDistribution?.summary?.total_owner_nodes || 0}</p>
            </div>
            <div className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
              <p className={`text-[11px] ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Visible Storage Nodes</p>
              <p className="text-lg font-black">{filteredDistributionNodeCount}</p>
            </div>
            <div className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
              <p className={`text-[11px] ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Active Storage Nodes</p>
              <p className="text-lg font-black text-green-400">{storageDistribution?.summary?.active_storage_nodes || 0}</p>
            </div>
          </div>

          {filteredDistributionFiles.length > 0 ? (
            <div className="space-y-3 max-h-[420px] overflow-auto pr-1">
              {filteredDistributionFiles.slice(0, 50).map((fileDoc) => (
                <div
                  key={fileDoc.cid}
                  className={`p-4 rounded-xl ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'}`}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-sm font-semibold truncate">{fileDoc.filename || fileDoc.cid}</p>
                    <span className={`text-xs font-mono ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                      owner: {fileDoc.owner_node_id || 'N/A'}
                    </span>
                  </div>
                  <p className={`text-[11px] mb-2 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                    CID: {fileDoc.cid} • user: {fileDoc.owner_user_identifier || 'N/A'} • replicas: {fileDoc.replica_count || 0} • chunks: {fileDoc.chunks_uploaded || 0}/{fileDoc.total_chunks || 0}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(fileDoc.storage_nodes || []).map((node) => (
                      <div
                        key={`${fileDoc.cid}-${node.node_id}`}
                        className={`px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-2 ${
                          isDark ? 'bg-black/20' : 'bg-white'
                        }`}
                      >
                        <span className="font-mono truncate">{node.node_id || 'Unknown Node'}</span>
                        <span className={isDark ? 'text-white/70' : 'text-gray-600'}>
                          {node.ip_address || 'N/A'}
                          {typeof node.is_active === 'boolean' ? ` • ${node.is_active ? 'active' : 'inactive'}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              No files match the current filters.
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
