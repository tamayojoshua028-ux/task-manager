import { useEffect, useState, useRef } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import API from './api';
import AddTask from './components/AddTask';
import TaskList from './components/TaskList';
import Auth from './components/Auth';
import ThemeToggle from './components/ThemeToggle';
import CalendarView from './components/CalendarView';
import WalkingCharacter from './components/WalkingCharacter';
import LoadingSpinner from './components/LoadingSpinner';
import BottomNav from './components/BottomNav';
import DailyQuote from './components/DailyQuote';
import SplashScreen from './components/SplashScreen';
import { exportToCSV } from './utils/exportUtils';
import { saveTasksOffline, getOfflineTasks, isOnline, addOfflineListener, processQueue } from './services/offlineService';
import { 
  requestNotificationPermission, 
  checkDueTasks, 
  startRealTimeChecker, 
  stopRealTimeChecker,
  testAllSounds,
  clearNotificationHistory,
  getCurrentDueTasks
} from './utils/notificationUtils';
import './App.css';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationStats, setNotificationStats] = useState({ overdue: 0, dueToday: 0, dueTomorrow: 0 });
  const [lastAction, setLastAction] = useState(null);
  const [showSplash, setShowSplash] = useState(true);
  const [isOnlineStatus, setIsOnlineStatus] = useState(navigator.onLine);
  const realTimeCheckerRef = useRef(null);

  // Splash screen completion
  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  // Offline/Online handling
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnlineStatus(true);
      await processQueue();
      fetchTasks();
    };
    const handleOffline = () => setIsOnlineStatus(false);
    
    const cleanup = addOfflineListener(handleOffline, handleOnline);
    return cleanup;
  }, []);

  // Load offline data if available and no internet
  useEffect(() => {
    const loadData = async () => {
      if (!navigator.onLine) {
        const { tasks: offlineTasks } = await getOfflineTasks();
        if (offlineTasks.length > 0) {
          setTasks(offlineTasks);
        }
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      fetchTasks();
      setLastAction('task_welcome');
      setTimeout(() => setLastAction(null), 5000);
    } else {
      setLoading(false);
    }
  }, []);

  // REAL-TIME NOTIFICATION CHECKER
  useEffect(() => {
    if (tasks.length > 0 && notificationsEnabled) {
      console.log('🎯 Starting REAL-TIME notification checker...');
      
      const stats = checkDueTasks(tasks);
      setNotificationStats(stats);
      
      if (realTimeCheckerRef.current) {
        stopRealTimeChecker();
      }
      
      realTimeCheckerRef.current = startRealTimeChecker(tasks, (event) => {
        console.log('🔔 Notification event:', event);
        fetchTasks();
        const newStats = checkDueTasks(tasks);
        setNotificationStats(newStats);
      });
    }
    
    return () => {
      if (realTimeCheckerRef.current) {
        stopRealTimeChecker();
        realTimeCheckerRef.current = null;
      }
    };
  }, [tasks, notificationsEnabled]);

  // Clear lastAction after 3 seconds
  useEffect(() => {
    if (lastAction) {
      const timer = setTimeout(() => {
        setLastAction(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [lastAction]);

  const refreshTasksWithAction = (action) => {
    console.log('🔔 REFRESH WITH ACTION CALLED:', action);
    setLastAction(action);
    fetchTasks();
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      
      const response = await API.get('/tasks');
      
      if (Array.isArray(response.data)) {
        setTasks(response.data);
        // Save offline for future use
        await saveTasksOffline(response.data);
      } else {
        setTasks([]);
        await saveTasksOffline([]);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      // Load offline data if available
      const { tasks: offlineTasks } = await getOfflineTasks();
      if (offlineTasks.length > 0) {
        setTasks(offlineTasks);
      }
      if (error.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData) => {
    console.log('👋 User logged in - setting welcome action');
    setUser(userData);
    setLastAction('task_welcome');
    fetchTasks();
    setTimeout(() => setLastAction(null), 5000);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete API.defaults.headers.common['Authorization'];
    setUser(null);
    setTasks([]);
    setNotificationsEnabled(false);
    if (realTimeCheckerRef.current) {
      stopRealTimeChecker();
      realTimeCheckerRef.current = null;
    }
  };

  const enableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotificationsEnabled(granted);
    if (granted) {
      const stats = checkDueTasks(tasks);
      setNotificationStats(stats);
      
      const currentDue = getCurrentDueTasks(tasks);
      if (currentDue.overdue.length > 0) {
        alert(`⚠️ You have ${currentDue.overdue.length} overdue task(s)!`);
      }
      if (currentDue.dueToday.length > 0) {
        alert(`📅 You have ${currentDue.dueToday.length} task(s) due today!`);
      }
      if (currentDue.dueNow.length > 0) {
        alert(`⏰ You have ${currentDue.dueNow.length} task(s) due right now!`);
      }
      
      alert('✅ Notifications enabled! Real-time alerts will play sounds for due tasks.');
    } else {
      alert('❌ Notification permission denied. You can enable it in browser settings.');
    }
  };

  const handleTestSounds = async () => {
    if (!notificationsEnabled) {
      alert('Please enable notifications first');
      return;
    }
    console.log('🔊 Testing all 3 sounds...');
    await testAllSounds();
  };

  const handleClearHistory = () => {
    clearNotificationHistory();
    alert('✅ Notification history cleared! Tasks will notify again on next due time.');
  };

  // Calculate statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const pendingTasks = tasks.filter(t => t.status !== 'completed').length;
  const highPriorityTasks = tasks.filter(t => t.priority === 'high').length;
  const mediumPriorityTasks = tasks.filter(t => t.priority === 'medium').length;
  const lowPriorityTasks = tasks.filter(t => t.priority === 'low').length;
  
  const upcomingTasks = tasks
    .filter(t => t.due_date && t.status !== 'completed')
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);

  const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (!user) {
    return (
      <ThemeProvider>
        <Auth onLogin={handleLogin} />
      </ThemeProvider>
    );
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <ThemeProvider>
      <div className="app">
        {/* Offline indicator */}
        {!isOnlineStatus && (
          <div className="offline-indicator">
            ⚡ You're offline - changes will sync when back online
          </div>
        )}
        
        <div className="header">
          <h1>Student Task & Deadline Manager</h1>
          <div className="user-info">
            <ThemeToggle />
            <button className="notification-btn" onClick={enableNotifications}>
              {notificationsEnabled ? '🔔 Notifications On' : '🔕 Enable Notifications'}
            </button>
            {notificationsEnabled && (
              <>
                <button className="test-sound-btn" onClick={handleTestSounds} title="Test all 3 sounds">
                  🔊 Test Sounds
                </button>
                <button className="clear-history-btn" onClick={handleClearHistory} title="Reset notification history">
                  🗑️ Reset Alerts
                </button>
              </>
            )}
            {(notificationStats.overdue > 0 || notificationStats.dueToday > 0) && (
              <div className="notification-badge">
                {notificationStats.overdue > 0 && <span className="badge-overdue">⚠️ {notificationStats.overdue}</span>}
                {notificationStats.dueToday > 0 && <span className="badge-today">📅 {notificationStats.dueToday}</span>}
              </div>
            )}
            <span>Welcome, {user.name}!</span>
            <button onClick={handleLogout}>Logout</button>
          </div>
        </div>

        {/* Dashboard View */}
        {activeTab === 'dashboard' && (
          <div className="dashboard">
            <div className="welcome-section">
              <h2>Welcome back, {user.name}! 👋</h2>
              <p>Here's your task overview</p>
              <button onClick={() => exportToCSV(tasks)} className="export-dashboard-btn">
                📥 Export All Tasks to CSV
              </button>
            </div>

            {/* Daily Quote Widget */}
            <DailyQuote />

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📋</div>
                <div className="stat-info">
                  <h3>Total Tasks</h3>
                  <p className="stat-number">{totalTasks}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">✅</div>
                <div className="stat-info">
                  <h3>Completed</h3>
                  <p className="stat-number">{completedTasks}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">⏳</div>
                <div className="stat-info">
                  <h3>Pending</h3>
                  <p className="stat-number">{pendingTasks}</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-info">
                  <h3>Completion Rate</h3>
                  <p className="stat-number">{completionRate}%</p>
                </div>
              </div>
            </div>

            <div className="priority-breakdown">
              <h3>Priority Breakdown</h3>
              <div className="priority-bars">
                <div className="priority-bar-item">
                  <span className="priority-label high">🔴 High Priority</span>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill high" 
                      style={{ width: `${totalTasks === 0 ? 0 : (highPriorityTasks / totalTasks) * 100}%` }}
                    ></div>
                  </div>
                  <span className="priority-count">{highPriorityTasks}</span>
                </div>
                <div className="priority-bar-item">
                  <span className="priority-label medium">🟡 Medium Priority</span>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill medium" 
                      style={{ width: `${totalTasks === 0 ? 0 : (mediumPriorityTasks / totalTasks) * 100}%` }}
                    ></div>
                  </div>
                  <span className="priority-count">{mediumPriorityTasks}</span>
                </div>
                <div className="priority-bar-item">
                  <span className="priority-label low">🟢 Low Priority</span>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill low" 
                      style={{ width: `${totalTasks === 0 ? 0 : (lowPriorityTasks / totalTasks) * 100}%` }}
                    ></div>
                  </div>
                  <span className="priority-count">{lowPriorityTasks}</span>
                </div>
              </div>
            </div>

            <div className="upcoming-tasks">
              <h3>📅 Upcoming Tasks</h3>
              {upcomingTasks.length === 0 ? (
                <p className="no-tasks">No upcoming tasks. Great job!</p>
              ) : (
                <div className="upcoming-list">
                  {upcomingTasks.map(task => (
                    <div key={task.id} className="upcoming-item">
                      <div className="upcoming-info">
                        <strong>{task.title}</strong>
                        <span className={`priority-badge ${task.priority}`}>
                          {task.priority}
                        </span>
                      </div>
                      <div className="upcoming-date">
                        Due: {new Date(task.due_date).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button 
              className="go-to-tasks-btn"
              onClick={() => setActiveTab('tasks')}
            >
              Go to My Tasks →
            </button>
          </div>
        )}

        {/* Tasks View */}
        {activeTab === 'tasks' && (
          <>
            <AddTask onTaskAdded={() => refreshTasksWithAction('task_added')} />
            <TaskList 
              tasks={tasks} 
              onTaskDeleted={() => refreshTasksWithAction('task_deleted')}
              onTaskCompleted={() => refreshTasksWithAction('task_completed')}
              onTaskEdited={() => refreshTasksWithAction('task_edited')}
            />
          </>
        )}

        {/* Calendar View */}
        {activeTab === 'calendar' && (
          <CalendarView 
            tasks={tasks} 
            onTaskClick={(task) => {
              alert(`📋 Task: ${task.title}\n📅 Due: ${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date'}\n🎯 Priority: ${task.priority}\n🏷️ Category: ${task.category || 'Uncategorized'}`);
            }} 
          />
        )}
        
        {/* Walking Character */}
        <WalkingCharacter 
          tasks={tasks}
          user={user}
          lastAction={lastAction}
        />
        
        {/* Bottom Navigation */}
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </ThemeProvider>
  );
}