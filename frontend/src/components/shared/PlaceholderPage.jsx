import { Database } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function PlaceholderPage({ title, description, comingSprint }) {
  const { isDark } = useTheme();
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className={`text-center max-w-sm rounded-2xl p-10
        ${isDark ? 'glass' : 'glass-light shadow-xl'}`}>
        <div className="w-16 h-16 rounded-2xl btn-primary flex items-center justify-center mx-auto mb-6">
          <Database size={28} />
        </div>
        <h2 className="text-xl font-bold mb-2 gradient-text">{title}</h2>
        <p className={`text-sm mb-4 ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{description}</p>
        <span className={`text-xs px-3 py-1.5 rounded-full font-semibold
          ${isDark
            ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20'
            : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
          }`}>
          {comingSprint}
        </span>
      </div>
    </div>
  );
}
