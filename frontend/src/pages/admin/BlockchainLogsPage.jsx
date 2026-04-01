import { useState, useEffect } from 'react';
import { FileText, Filter, Search, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { getBlockchainLogs, getBlockchainLog } from '../../utils/api';
import { formatUtcTimestamp } from '../../utils/time';

const EVENT_CATEGORY_LABELS = {
  upload: 'Upload',
  download: 'Download',
  pledge: 'Pledge',
  reward: 'Reward',
  delete: 'Delete',
  register: 'Register',
};

function getLogCategory(log) {
  return (log?.event_category || log?.event_type || 'unknown').toString().toLowerCase();
}

export default function BlockchainLogsPage() {
  const { isDark } = useTheme();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [filter, setFilter] = useState('all'); // all, upload, download, pledge, reward, delete, register
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [filter]);

  const loadLogs = async () => {
    try {
      const data = await getBlockchainLogs(100, filter === 'all' ? null : filter);
      setLogs((data.logs || []).map((log) => ({
        ...log,
        event_category: getLogCategory(log),
      })));
    } catch (err) {
      console.error('Failed to load blockchain logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const viewLogDetails = async (txHash) => {
    try {
      const details = await getBlockchainLog(txHash);
      setSelectedLog(details);
    } catch (err) {
      console.error('Failed to load log details:', err);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (searchTerm) {
      return (
        log.tx_hash.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.node_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getLogCategory(log).includes(searchTerm.toLowerCase())
      );
    }
    return true;
  });

  const eventTypeColors = {
    upload: { bg: isDark ? 'bg-blue-500/20' : 'bg-blue-100', text: 'text-blue-400', icon: '📤' },
    download: { bg: isDark ? 'bg-green-500/20' : 'bg-green-100', text: 'text-green-400', icon: '📥' },
    pledge: { bg: isDark ? 'bg-purple-500/20' : 'bg-purple-100', text: 'text-purple-400', icon: '🔐' },
    reward: { bg: isDark ? 'bg-yellow-500/20' : 'bg-yellow-100', text: 'text-yellow-400', icon: '💰' },
    delete: { bg: isDark ? 'bg-red-500/20' : 'bg-red-100', text: 'text-red-400', icon: '🗑️' },
    register: { bg: isDark ? 'bg-indigo-500/20' : 'bg-indigo-100', text: 'text-indigo-400', icon: '✨' },
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className={`h-48 rounded-3xl ${isDark ? 'bg-white/5' : 'bg-gray-200'}`} />
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={`h-20 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-200'}`} />
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
              Blockchain <span className="gradient-text">Logs</span>
            </h1>
            <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
              Immutable transaction audit trail
            </p>
          </div>
          <div className={`px-4 py-2 rounded-xl ${
            logs.length > 0
              ? isDark ? 'bg-green-500/20 border border-green-500/30' : 'bg-green-50 border border-green-200'
              : isDark ? 'bg-yellow-500/20 border border-yellow-500/30' : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className={logs.length > 0 ? 'text-green-400' : 'text-yellow-400'} />
              <span className={`text-sm font-semibold ${logs.length > 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                {logs.length > 0 ? 'Ledger Active' : 'No Transactions Yet'}
              </span>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className={`rounded-3xl p-6 ${
          isDark ? 'glass' : 'glass-light shadow-xl'
        }`}>
          <div className="flex items-center justify-between gap-4">
            
            {/* Search Bar */}
            <div className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl ${
              isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'
            }`}>
              <Search size={20} className={isDark ? 'text-white/40' : 'text-gray-400'} />
              <input
                type="text"
                placeholder="Search by TX hash, node ID, or event type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`flex-1 bg-transparent outline-none text-sm ${
                  isDark ? 'text-white placeholder-white/40' : 'text-gray-900 placeholder-gray-400'
                }`}
              />
            </div>

            {/* Event Type Filters */}
            <div className={`flex gap-2 p-1 rounded-xl ${
              isDark ? 'bg-white/5' : 'bg-gray-100'
            }`}>
              {['all', 'upload', 'download', 'pledge', 'reward', 'delete', 'register'].map(type => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    filter === type
                      ? isDark
                        ? 'bg-white/10 text-white'
                        : 'bg-white text-gray-900 shadow'
                      : isDark
                        ? 'text-white/60 hover:text-white'
                        : 'text-gray-600 hover:text-gray-900'
                  }`}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-5 gap-4 mt-6">
            {Object.entries(eventTypeColors).map(([type, colors]) => {
              const count = logs.filter(l => getLogCategory(l) === type).length;
              return (
                <div key={type} className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{colors.icon}</span>
                    <span className="text-xl font-black">{count}</span>
                  </div>
                  <p className={`text-xs mt-1 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    {EVENT_CATEGORY_LABELS[type] || type.charAt(0).toUpperCase() + type.slice(1)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Logs Table */}
        <div className={`rounded-3xl overflow-hidden ${
          isDark ? 'glass' : 'glass-light shadow-xl'
        }`}>
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Transaction History</h3>
              <span className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                {filteredLogs.length} transactions
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                  <th className={`text-left p-4 text-xs font-semibold ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    TX Hash
                  </th>
                  <th className={`text-left p-4 text-xs font-semibold ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Event Type
                  </th>
                  <th className={`text-left p-4 text-xs font-semibold ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Node ID
                  </th>
                  <th className={`text-left p-4 text-xs font-semibold ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Data
                  </th>
                  <th className={`text-left p-4 text-xs font-semibold ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Block Height
                  </th>
                  <th className={`text-left p-4 text-xs font-semibold ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Status
                  </th>
                  <th className={`text-left p-4 text-xs font-semibold ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Timestamp
                  </th>
                  <th className={`text-left p-4 text-xs font-semibold ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log, idx) => {
                  const colors = eventTypeColors[getLogCategory(log)] || eventTypeColors.upload;
                  return (
                    <tr
                      key={idx}
                      className={`border-b transition-colors ${
                        isDark 
                          ? 'border-white/5 hover:bg-white/5' 
                          : 'border-gray-100 hover:bg-gray-50'
                      }`}>
                      <td className="p-4">
                        <code className={`text-xs font-mono ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                          {log.tx_hash?.substring(0, 16)}...
                        </code>
                      </td>
                      <td className="p-4">
                        <span className={`text-xs px-3 py-1 rounded-full ${colors.bg} ${colors.text} font-semibold`}>
                          {colors.icon} {log.event_type}
                        </span>
                      </td>
                      <td className="p-4">
                        <code className="text-xs font-mono">{log.node_id?.substring(0, 12)}</code>
                      </td>
                      <td className="p-4">
                        <div className="text-xs max-w-xs truncate">
                          {typeof log.data === 'object' 
                            ? `${Object.keys(log.data).length} fields`
                            : log.data?.toString().substring(0, 30) || 'N/A'
                          }
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm font-mono">#{log.block_height || 0}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={14} className={(log.status || 'unknown').toLowerCase() === 'valid' ? 'text-green-400' : 'text-yellow-400'} />
                          <span className={`text-xs font-semibold ${(log.status || 'unknown').toLowerCase() === 'valid' ? 'text-green-400' : 'text-yellow-400'}`}>
                            {log.status || 'Unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Clock size={12} className={isDark ? 'text-white/40' : 'text-gray-400'} />
                          <span className={`text-xs ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                            {formatUtcTimestamp(log.timestamp)} UTC
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => viewLogDetails(log.tx_hash)}
                          className={`text-xs font-medium ${
                            isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
                          }`}>
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="p-12 text-center">
              <FileText size={48} className={`mx-auto mb-4 ${isDark ? 'text-white/20' : 'text-gray-300'}`} />
              <p className={`text-sm ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                No blockchain transactions found
              </p>
            </div>
          )}
        </div>

        {/* Log Details Modal */}
        {selectedLog && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-8"
            onClick={() => setSelectedLog(null)}>
            <div
              className={`max-w-2xl w-full rounded-3xl p-8 ${
                isDark ? 'glass glow-accent' : 'glass-light shadow-2xl'
              }`}
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold">Transaction Details</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'
                  }`}>
                  <XCircle size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <p className={`text-xs mb-1 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Transaction Hash
                  </p>
                  <code className="text-sm font-mono break-all">{selectedLog.tx_hash}</code>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <p className={`text-xs mb-1 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                      Block Height
                    </p>
                    <p className="text-lg font-bold">#{selectedLog.block_height}</p>
                  </div>
                  <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <p className={`text-xs mb-1 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                      Event Type
                    </p>
                    <p className="text-lg font-bold capitalize">{selectedLog.event_type}</p>
                  </div>
                </div>

                <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <p className={`text-xs mb-2 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Transaction Data
                  </p>
                  <pre className={`text-xs font-mono overflow-auto max-h-64 ${
                    isDark ? 'text-white/80' : 'text-gray-700'
                  }`}>
                    {JSON.stringify(selectedLog.data, null, 2)}
                  </pre>
                </div>

                <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <p className={`text-xs mb-1 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Timestamp
                  </p>
                  <p className="text-sm">{formatUtcTimestamp(selectedLog.timestamp)} UTC</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
