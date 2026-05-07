import './BottomNav.css';

export default function BottomNav({ activeTab, onTabChange }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', activeIcon: '📊✨' },
    { id: 'tasks', label: 'Tasks', icon: '✅', activeIcon: '✅✨' },
    { id: 'calendar', label: 'Calendar', icon: '📅', activeIcon: '📅✨' }
  ];

  return (
    <div className="bottom-nav">
      {navItems.map((item) => (
        <button
          key={item.id}
          className={`bottom-nav-item ${activeTab === item.id ? 'active' : ''}`}
          onClick={() => onTabChange(item.id)}
        >
          <div className="nav-icon">
            {activeTab === item.id ? item.activeIcon : item.icon}
          </div>
          <span className="nav-label">{item.label}</span>
          {activeTab === item.id && <div className="nav-indicator" />}
        </button>
      ))}
    </div>
  );
}