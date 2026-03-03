import { useState, useEffect } from 'react';
import { Server, Shield, ShieldOff, Search, CheckCircle2, XCircle, AlertCircle, Ban } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getAdminNodes, banNode } from '../../utils/api';

export default function NodeRegistryPage() {
  const { isDark } = useTheme();
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // all, active, banned

  useEffect(() => {
    loadNodes();
  }, []);

  const loadNodes = async () => {
    try {
      const data = await getAdminNodes();
      setNodes(data.nodes || []);
    } catch (err) {
      console.error('Failed to load nodes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBanNode = async (nodeId) => {
    if (!confirm(`Are you sure you want to ban node ${nodeId}?`)) return;
    
    try {
      await banNode(nodeId);
      alert(`Node ${nodeId} has been banned`);
      loadNodes();
    } catch (err) {
      alert('Failed to ban node: ' + err.message);
    }
  };

  const filteredNodes = nodes.filter(node => {
    const matchesFilter = 
      filter === 'all' || 
      (filter === 'active' && node.is_active !== false) ||
      (filter === 'banned' && node.is_active === false);
    
    const matchesSearch = !searchTerm || 
      node.node_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.public_key_fingerprint?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: nodes.length,
    active: nodes.filter(n => n.is_active !== false).length,
    banned: nodes.filter(n => n.is_active === false).length,
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className={`h-32 rounded-3xl ${isDark ? 'bg-white/5' : 'bg-gray-200'}`} />
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-24 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-200'}`} />
            ))}
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
              Node <span className="gradient-text">Registry</span>
            </h1>
            <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
              View and manage all registered storage nodes in the network
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-3 gap-6">
          <div className={`rounded-2xl p-6 ${
            isDark ? 'glass glow-accent' : 'glass-light shadow-xl'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                isDark ? 'bg-blue-500/20' : 'bg-blue-100'
              }`}>
                <Server size={28} className="text-blue-400" />
              </div>
              <div>
                <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                  Total Nodes
                </p>
                <p className="text-3xl font-black">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className={`rounded-2xl p-6 ${
            isDark ? 'glass' : 'glass-light shadow-xl'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                isDark ? 'bg-green-500/20' : 'bg-green-100'
              }`}>
                <CheckCircle2 size={28} className="text-green-400" />
              </div>
              <div>
                <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                  Active Nodes
                </p>
                <p className="text-3xl font-black text-green-400">{stats.active}</p>
              </div>
            </div>
          </div>

          <div className={`rounded-2xl p-6 ${
            isDark ? 'glass' : 'glass-light shadow-xl'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                isDark ? 'bg-red-500/20' : 'bg-red-100'
              }`}>
                <Ban size={28} className="text-red-400" />
              </div>
              <div>
                <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                  Banned Nodes
                </p>
                <p className="text-3xl font-black text-red-400">{stats.banned}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className={`rounded-3xl p-6 ${
          isDark ? 'glass' : 'glass-light shadow-xl'
        }`}>
          <div className="flex items-center gap-4">
            
            {/* Search */}
            <div className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl ${
              isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'
            }`}>
              <Search size={20} className={isDark ? 'text-white/40' : 'text-gray-400'} />
              <input
                type="text"
                placeholder="Search by node ID or fingerprint..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`flex-1 bg-transparent outline-none text-sm ${
                  isDark ? 'text-white placeholder-white/40' : 'text-gray-900 placeholder-gray-400'
                }`}
              />
            </div>

            {/* Filter Tabs */}
            <div className={`flex gap-2 p-1 rounded-xl ${
              isDark ? 'bg-white/5' : 'bg-gray-100'
            }`}>
              {['all', 'active', 'banned'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    filter === f
                      ? isDark
                        ? 'bg-white/10 text-white'
                        : 'bg-white text-gray-900 shadow'
                      : isDark
                        ? 'text-white/60 hover:text-white'
                        : 'text-gray-600 hover:text-gray-900'
                  }`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Nodes Table */}
        <div className={`rounded-3xl overflow-hidden ${
          isDark ? 'glass' : 'glass-light shadow-xl'
        }`}>
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Registered Nodes</h3>
              <span className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                {filteredNodes.length} nodes
              </span>
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
                    Public Key Fingerprint
                  </th>
                  <th className={`text-left p-4 text-xs font-semibold ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Balance (AST)
                  </th>
                  <th className={`text-left p-4 text-xs font-semibold ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Storage Pledged
                  </th>
                  <th className={`text-left p-4 text-xs font-semibold ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Registered At
                  </th>
                  <th className={`text-left p-4 text-xs font-semibold ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Status
                  </th>
                  <th className={`text-left p-4 text-xs font-semibold ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredNodes.map((node, idx) => (
                  <tr
                    key={idx}
                    className={`border-b transition-colors ${
                      isDark 
                        ? 'border-white/5 hover:bg-white/5' 
                        : 'border-gray-100 hover:bg-gray-50'
                    }`}>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Server size={16} className={isDark ? 'text-white/40' : 'text-gray-400'} />
                        <code className={`text-xs font-mono ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                          {node.node_id}
                        </code>
                      </div>
                    </td>
                    <td className="p-4">
                      <code className="text-xs font-mono">
                        {node.public_key_fingerprint?.substring(0, 24)}...
                      </code>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-semibold">
                        {node.balance?.toFixed(2) || '0.00'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm">
                        {node.storage_pledged_gb || 0} GB
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                        {node.registered_at 
                          ? new Date(node.registered_at).toLocaleString() 
                          : 'N/A'
                        }
                      </span>
                    </td>
                    <td className="p-4">
                      {node.is_active === false ? (
                        <div className="flex items-center gap-2">
                          <ShieldOff size={14} className="text-red-400" />
                          <span className="text-xs font-semibold text-red-400">Banned</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Shield size={14} className="text-green-400" />
                          <span className="text-xs font-semibold text-green-400">Active</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {node.is_active !== false ? (
                        <button
                          onClick={() => handleBanNode(node.node_id)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                            isDark 
                              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                              : 'bg-red-100 text-red-600 hover:bg-red-200'
                          }`}>
                          Ban Node
                        </button>
                      ) : (
                        <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                          Banned
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredNodes.length === 0 && (
            <div className="p-12 text-center">
              <Server size={48} className={`mx-auto mb-4 ${isDark ? 'text-white/20' : 'text-gray-300'}`} />
              <p className={`text-sm ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                No nodes found matching criteria
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
