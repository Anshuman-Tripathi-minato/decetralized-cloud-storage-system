import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HardDrive, Coins, Upload, Download, Activity, TrendingUp, 
  Users, Database, Zap, Award, Clock 
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getStorageStatus, getMe, getPeers, getNetworkMetrics, getMyFileDistributionSummary } from '../../utils/api';
import { formatBytes } from '../../utils/fileEncryption';

export default function DashboardPage() {
  const { isDark } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]); // Real activity from API
  const [networkStats, setNetworkStats] = useState({ activeNodes: 0, totalStorage: 0, health: 'Unknown' });
  const [distributionSummary, setDistributionSummary] = useState({
    total_files: 0,
    nodes_storing_user_data: 0,
    active_nodes_storing_user_data: 0,
    nodes: [],
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const userData = await getMe();

      const [storageData, peersData, metricsData, distributionData] = await Promise.all([
        getStorageStatus().catch(() => ({
          storage_pledged: 0,
          storage_used: 0,
          files_uploaded: 0,
          total_uploaded_size: 0,
          chunks_stored: 0,
          token_balance: 0,
          is_active: true,
        })),
        getPeers(1000).catch(() => ({ peers: [] })),
        getNetworkMetrics().catch(() => ({ total_storage: 0, active_nodes: 0 })),
        getMyFileDistributionSummary().catch(() => ({
          total_files: 0,
          nodes_storing_user_data: 0,
          active_nodes_storing_user_data: 0,
          nodes: [],
        })),
      ]);
      setStats(storageData);
      setUserInfo(userData);
      setDistributionSummary(distributionData || {});
      const activeNodes = peersData?.online_peers ?? peersData?.peers?.filter((peer) => peer.status === 'online').length ?? 0;
      const totalStorage = metricsData?.total_storage || 0;
      setNetworkStats({
        activeNodes,
        totalStorage,
        health: activeNodes > 0 ? 'Healthy' : 'No Data',
      });
    } catch (err) {
      const message = (err?.message || '').toLowerCase();
      const isAuthIssue = message.includes('not authenticated') || message.includes('invalid or expired token') || message.includes('user not found');

      if (isAuthIssue) {
        logout();
        navigate('/app/login', { replace: true });
        return;
      }

      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className={`h-32 rounded-3xl ${isDark ? 'bg-white/5' : 'bg-gray-200'}`} />
            <div className="grid grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className={`h-40 rounded-3xl ${isDark ? 'bg-white/5' : 'bg-gray-200'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      icon: Coins,
      label: 'AST Balance',
      value: `${userInfo?.token_balance?.toFixed(2) || '0.00'} AST`,
      color: 'text-yellow-400',
      bgColor: isDark ? 'bg-yellow-500/10' : 'bg-yellow-50',
    },
    {
      icon: HardDrive,
      label: 'Storage Pledged',
      value: formatBytes(stats?.storage_pledged || 0),
      subtitle: `${stats?.storage_used || 0}% used`,
      color: 'text-blue-400',
      bgColor: isDark ? 'bg-blue-500/10' : 'bg-blue-50',
    },
    {
      icon: Upload,
      label: 'Files Uploaded',
      value: stats?.files_uploaded || 0,
      subtitle: formatBytes(stats?.total_uploaded_size || 0),
      color: 'text-green-400',
      bgColor: isDark ? 'bg-green-500/10' : 'bg-green-50',
    },
    {
      icon: Database,
      label: 'Chunks Stored',
      value: stats?.chunks_stored || 0,
      subtitle: 'Distributed storage',
      color: 'text-purple-400',
      bgColor: isDark ? 'bg-purple-500/10' : 'bg-purple-50',
    },
  ];

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black mb-2">
            Node <span className="gradient-text">Dashboard</span>
          </h1>
          <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
            Monitor your storage contributions, token earnings, and network activity
          </p>
        </div>

        {/* Welcome Banner */}
        <div className={`rounded-3xl p-8 relative overflow-hidden ${
          isDark ? 'glass glow-accent' : 'glass-light shadow-xl'
        }`}>
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                Welcome back, <span className="gradient-text">{user?.node_id?.slice(0, 16) || 'Node'}</span>
              </h2>
              <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                Your node is active and contributing to the decentralized network
              </p>
              <div className="flex items-center gap-2 mt-4">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className={`text-xs font-medium ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
                  Online • Active • Earning Rewards
                </span>
              </div>
            </div>
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${
              isDark ? 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20' : 'bg-gradient-to-br from-indigo-100 to-purple-100'
            }`}>
              <Activity size={40} className="text-indigo-400" />
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-50" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, idx) => (
            <div
              key={idx}
              className={`rounded-2xl p-6 transition-all ${
                isDark ? 'glass hover:bg-white/5' : 'glass-light shadow hover:shadow-lg'
              }`}>
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon size={24} className={stat.color} />
                </div>
                {stat.change && (
                  <span className="text-xs text-green-400 flex items-center gap-1">
                    <TrendingUp size={12} />
                    {stat.change}
                  </span>
                )}
              </div>
              <p className={`text-xs font-medium mb-1 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                {stat.label}
              </p>
              <p className="text-2xl font-black mb-1">{stat.value}</p>
              {stat.subtitle && (
                <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                  {stat.subtitle}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recent Activity */}
          <div className={`lg:col-span-2 rounded-3xl p-6 ${
            isDark ? 'glass' : 'glass-light shadow-xl'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Recent Activity</h3>
              <button className={`text-xs font-medium ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                View All
              </button>
            </div>
            <div className="space-y-4">
              {recentActivity.length > 0 ? recentActivity.map((activity, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl flex items-center justify-between ${
                    isDark ? 'bg-white/5' : 'bg-gray-50'
                  }`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      activity.type === 'upload' ? 'bg-green-500/20 text-green-400' :
                      activity.type === 'storage' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-purple-500/20 text-purple-400'
                    }`}>
                      {activity.type === 'upload' && <Upload size={18} />}
                      {activity.type === 'storage' && <HardDrive size={18} />}
                      {activity.type === 'download' && <Download size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">
                        {activity.file || activity.action}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                          {activity.size || ''}
                        </span>
                        <span className={`text-xs ${isDark ? 'text-white/30' : 'text-gray-300'}`}>•</span>
                        <span className={`text-xs flex items-center gap-1 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                          <Clock size={10} />
                          {activity.time}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-green-400">{activity.earned}</span>
                </div>
              )) : (
                <div className={`p-6 rounded-xl text-sm ${isDark ? 'bg-white/5 text-white/60' : 'bg-gray-50 text-gray-500'}`}>
                  No recent activity yet.
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className={`rounded-3xl p-6 ${
            isDark ? 'glass' : 'glass-light shadow-xl'
          }`}>
            <h3 className="text-xl font-bold mb-6">Quick Actions</h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/app/upload')}
                className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all ${
                  isDark ? 'bg-indigo-500/20 hover:bg-indigo-500/30' : 'bg-indigo-50 hover:bg-indigo-100'
                } text-left`}>
                <Upload size={20} className="text-indigo-400" />
                <div>
                  <p className="font-semibold text-sm">Upload File</p>
                  <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Encrypt & distribute
                  </p>
                </div>
              </button>
              
              <button
                onClick={() => navigate('/app/storage')}
                className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all ${
                  isDark ? 'bg-blue-500/20 hover:bg-blue-500/30' : 'bg-blue-50 hover:bg-blue-100'
                } text-left`}>
                <HardDrive size={20} className="text-blue-400" />
                <div>
                  <p className="font-semibold text-sm">Pledge Storage</p>
                  <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Earn AST tokens
                  </p>
                </div>
              </button>
              
              <button
                onClick={() => navigate('/app/wallet')}
                className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all ${
                  isDark ? 'bg-yellow-500/20 hover:bg-yellow-500/30' : 'bg-yellow-50 hover:bg-yellow-100'
                } text-left`}>
                <Coins size={20} className="text-yellow-400" />
                <div>
                  <p className="font-semibold text-sm">View Wallet</p>
                  <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Token history
                  </p>
                </div>
              </button>

              <button
                onClick={() => navigate('/app/files')}
                className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all ${
                  isDark ? 'bg-purple-500/20 hover:bg-purple-500/30' : 'bg-purple-50 hover:bg-purple-100'
                } text-left`}>
                <Database size={20} className="text-purple-400" />
                <div>
                  <p className="font-semibold text-sm">My Files</p>
                  <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Manage uploads
                  </p>
                </div>
              </button>
            </div>

            {/* Network Status */}
            <div className={`mt-6 p-4 rounded-xl ${
              isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <Users size={16} className="text-indigo-400" />
                <p className="font-semibold text-sm">Network Status</p>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className={isDark ? 'text-white/60' : 'text-gray-600'}>Active Nodes</span>
                  <span className="font-mono">{networkStats.activeNodes}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-white/60' : 'text-gray-600'}>Total Storage</span>
                  <span className="font-mono">{formatBytes(networkStats.totalStorage)}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-white/60' : 'text-gray-600'}>Network Health</span>
                  <span className={`${networkStats.health === 'Healthy' ? 'text-green-400' : 'text-yellow-400'} font-semibold`}>
                    {networkStats.health}
                  </span>
                </div>
              </div>
            </div>

            <div className={`mt-4 p-4 rounded-xl ${
              isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <Database size={16} className="text-purple-400" />
                <p className="font-semibold text-sm">My Data Distribution</p>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className={isDark ? 'text-white/60' : 'text-gray-600'}>Files Tracked</span>
                  <span className="font-mono">{distributionSummary.total_files || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-white/60' : 'text-gray-600'}>Nodes Storing My Data</span>
                  <span className="font-mono">{distributionSummary.nodes_storing_user_data || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? 'text-white/60' : 'text-gray-600'}>Active Storage Nodes</span>
                  <span className="font-mono text-green-400">{distributionSummary.active_nodes_storing_user_data || 0}</span>
                </div>
              </div>
              {distributionSummary.nodes?.length > 0 && (
                <div className={`mt-3 pt-3 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                  <p className={`text-[11px] mb-2 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>Node IDs / IPs</p>
                  <div className="space-y-1 max-h-28 overflow-auto pr-1">
                    {distributionSummary.nodes.slice(0, 8).map((node) => (
                      <div key={node.node_id} className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono truncate">{node.node_id}</span>
                        <span className={`text-[11px] ${isDark ? 'text-white/60' : 'text-gray-500'}`}>{node.ip_address || 'N/A'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
