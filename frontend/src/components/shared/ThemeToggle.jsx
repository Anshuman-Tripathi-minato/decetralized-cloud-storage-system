import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer
        ${theme === 'dark'
          ? 'bg-white/10 hover:bg-white/20 text-yellow-300'
          : 'bg-black/10 hover:bg-black/15 text-indigo-600'
        } ${className}`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark'
        ? <Sun size={18} className="transition-transform duration-300 rotate-0" />
        : <Moon size={18} className="transition-transform duration-300 rotate-180" />
      }
    </button>
  );
}
