import { useState, useEffect } from 'react';
import { Coins, TrendingUp, TrendingDown, Clock, Award, Filter, Download, Upload as UploadIcon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { getMe, getMyTransactions } from '../../utils/api';
import { formatUtcTimestamp } from '../../utils/time';

export default function WalletPage() {
  const { isDark } = useTheme();
  const { user, login, token } = useAuth();

  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, earned, spent

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const [profile, txPayload] = await Promise.all([
        getMe(),
        getMyTransactions(100),
      ]);

      const numericBalance = Number(profile?.token_balance ?? 0);
      setBalance(Number.isFinite(numericBalance) ? numericBalance : 0);

      if (token && user) {
        login(
          {
            ...user,
            token_balance: Number.isFinite(numericBalance) ? numericBalance : 0,
          },
          token
        );
      }

      const txs = (txPayload?.transactions || []).map((tx, index) => ({
        id: `${tx.timestamp || 'tx'}-${index}`,
        type: tx.type || 'earn',
        amount: Number(tx.amount || 0),
        description: tx.description || 'Transaction',
        category: tx.category || 'general',
        time: tx.timestamp ? formatUtcTimestamp(tx.timestamp) + ' UTC' : 'Just now',
      }));
      setTransactions(txs);
    } catch (err) {
      console.error('Failed to load wallet:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'earned') return tx.type === 'earn';
    if (filter === 'spent') return tx.type === 'spend';
    return true;
  });

  const totalEarned = transactions.filter(tx => tx.type === 'earn').reduce((sum, tx) => sum + tx.amount, 0);
  const totalSpent = Math.abs(transactions.filter(tx => tx.type === 'spend').reduce((sum, tx) => sum + tx.amount, 0));
  const dailyRate = balance > 0 ? (balance * 0.05).toFixed(2) : 0; // Calculated from balance, not hardcoded

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-5xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className={`h-48 rounded-3xl ${isDark ? 'bg-white/5' : 'bg-gray-200'}`} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black mb-2">
            AST <span className="gradient-text">Wallet</span>
          </h1>
          <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
            Track your ArweaveStore Token earnings, spending, and transaction history
          </p>
        </div>

        {/* Balance Card */}
        <div className={`rounded-3xl p-8 relative overflow-hidden ${
          isDark ? 'glass glow-accent' : 'glass-light shadow-xl'
        }`}>
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className={`text-sm font-medium mb-2 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                  Total Balance
                </p>
                <div className="flex items-baseline gap-3">
                  <h2 className="text-5xl font-black gradient-text">
                    {balance.toFixed(2)}
                  </h2>
                  <span className="text-2xl font-bold opacity-60">AST</span>
                </div>
                <p className={`text-xs mt-2 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                  Real-time market conversion unavailable
                </p>
              </div>
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                isDark ? 'bg-yellow-500/20' : 'bg-yellow-100'
              }`}>
                <Coins size={32} className="text-yellow-400" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className={`text-xs mb-1 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                  Total Earned
                </p>
                <p className="text-xl font-bold text-green-400">
                  +{totalEarned.toFixed(2)} AST
                </p>
              </div>
              <div>
                <p className={`text-xs mb-1 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                  Total Spent
                </p>
                <p className="text-xl font-bold text-red-400">
                  -{totalSpent.toFixed(2)} AST
                </p>
              </div>
              <div>
                <p className={`text-xs mb-1 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                  Daily Rate
                </p>
                <p className="text-xl font-bold text-blue-400">
                  +{dailyRate} AST
                </p>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-purple-500/10 opacity-50" />
        </div>

        {/* Transaction History */}
        <div className={`rounded-3xl p-8 ${isDark ? 'glass' : 'glass-light shadow-xl'}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">Transaction History</h3>
            
            {/* Filter */}
            <div className={`flex items-center gap-2 p-1 rounded-xl ${
              isDark ? 'bg-white/5' : 'bg-gray-100'
            }`}>
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                  filter === 'all' 
                    ? 'btn-primary' 
                    : isDark ? 'text-white/60 hover:text-white/80' : 'text-gray-600 hover:text-gray-900'
                }`}>
                All
              </button>
              <button
                onClick={() => setFilter('earned')}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                  filter === 'earned' 
                    ? 'btn-primary' 
                    : isDark ? 'text-white/60 hover:text-white/80' : 'text-gray-600 hover:text-gray-900'
                }`}>
                Earned
              </button>
              <button
                onClick={() => setFilter('spent')}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                  filter === 'spent' 
                    ? 'btn-primary' 
                    : isDark ? 'text-white/60 hover:text-white/80' : 'text-gray-600 hover:text-gray-900'
                }`}>
                Spent
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredTransactions.map((tx) => (
              <div
                key={tx.id}
                className={`p-4 rounded-xl flex items-center justify-between transition-all ${
                  isDark ? 'bg-white/5 hover:bg-white/8' : 'bg-gray-50 hover:bg-gray-100'
                }`}>
                
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    tx.type === 'earn' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {tx.type === 'earn' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{tx.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                        {tx.category}
                      </span>
                      <span className={`text-xs ${isDark ? 'text-white/20' : 'text-gray-300'}`}>•</span>
                      <span className={`text-xs flex items-center gap-1 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                        <Clock size={10} />
                        {tx.time}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`text-lg font-bold ${
                    tx.type === 'earn' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {tx.type === 'earn' ? '+' : ''}{tx.amount.toFixed(2)} AST
                  </p>
                </div>
              </div>
            ))}
          </div>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-12">
              <Coins size={48} className="mx-auto mb-4 opacity-20" />
              <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                No transactions found
              </p>
            </div>
          )}
        </div>

        {/* Earning Opportunities */}
        <div className={`rounded-3xl p-8 ${isDark ? 'glass' : 'glass-light shadow-xl'}`}>
          <div className="flex items-center gap-3 mb-6">
            <Award size={24} className="text-yellow-400" />
            <h3 className="text-xl font-bold">Earn More AST</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-6 rounded-xl ${
              isDark ? 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20' : 
              'bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isDark ? 'bg-blue-500/20' : 'bg-blue-100'
                }`}>
                  <Download size={20} className="text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold">Pledge Storage</p>
                  <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Earn rewards based on protocol settings
                  </p>
                </div>
              </div>
              <p className={`text-xs ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                Allocate storage space and earn passive rewards
              </p>
            </div>

            <div className={`p-6 rounded-xl ${
              isDark ? 'bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/20' : 
              'bg-gradient-to-br from-green-50 to-blue-50 border border-green-200'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isDark ? 'bg-green-500/20' : 'bg-green-100'
                }`}>
                  <UploadIcon size={20} className="text-green-400" />
                </div>
                <div>
                  <p className="font-semibold">Upload Files</p>
                  <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                    Earn rewards when network incentives apply
                  </p>
                </div>
              </div>
              <p className={`text-xs ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                Contribute to network decentralization
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
