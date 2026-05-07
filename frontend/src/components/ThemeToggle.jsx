import { useTheme } from '../context/ThemeContext';
import './ThemeToggle.css';

export default function ThemeToggle() {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button className="theme-toggle" onClick={toggleTheme}>
      <div className="theme-toggle-track">
        <div className={`theme-toggle-thumb ${isDarkMode ? 'dark' : 'light'}`}>
          <span className="theme-icon">
            {isDarkMode ? '🌙' : '☀️'}
          </span>
        </div>
      </div>
    </button>
  );
}