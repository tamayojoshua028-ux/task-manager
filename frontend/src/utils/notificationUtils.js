// Audio elements cache
const audioCache = {};

// Preload your 3 sounds
const preloadSounds = () => {
  const sounds = [
    { name: 'notification', file: '/sounds/notification.mp3' },
    { name: 'urgent', file: '/sounds/urgent.mp3' },
    { name: 'pleasant', file: '/sounds/pleasant.mp3' }
  ];
  
  sounds.forEach(sound => {
    const audio = new Audio(sound.file);
    audio.preload = 'auto';
    audio.load();
    audioCache[sound.name] = audio;
    console.log(`✅ Preloaded: ${sound.name}.mp3`);
  });
};

// Play specific sound
const playSound = (soundName) => {
  console.log(`🔊 Playing sound: ${soundName}.mp3`);
  
  const audio = audioCache[soundName];
  if (audio) {
    audio.currentTime = 0;
    audio.volume = 0.7;
    audio.play().then(() => {
      console.log(`✅ Sound played: ${soundName}.mp3`);
    }).catch(e => {
      console.log(`❌ Audio play failed:`, e);
    });
  } else {
    console.log(`❌ Sound not found: ${soundName}.mp3`);
  }
};

// Preload sounds immediately
preloadSounds();

// Request permission for notifications
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    console.log('✅ Notification permission already granted');
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    return permission === 'granted';
  }

  return false;
};

// Send notification with custom sound
const sendNotification = (title, options, soundName) => {
  if (Notification.permission !== 'granted') {
    console.log('Notification permission not granted');
    return;
  }
  
  playSound(soundName);
  
  const notification = new Notification(title, options);
  
  setTimeout(() => notification.close(), 10000);
  
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
};

// Check for due tasks (exported for App.jsx)
export const checkDueTasks = (tasks) => {
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const overdueTasks = tasks.filter(task => {
    if (!task.due_date || task.status === 'completed') return false;
    const dueDate = new Date(task.due_date);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  });
  
  const dueTodayTasks = tasks.filter(task => {
    if (!task.due_date || task.status === 'completed') return false;
    const dueDate = new Date(task.due_date);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() === today.getTime();
  });
  
  const dueTomorrowTasks = tasks.filter(task => {
    if (!task.due_date || task.status === 'completed') return false;
    const dueDate = new Date(task.due_date);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() === tomorrow.getTime();
  });
  
  return {
    overdue: overdueTasks.length,
    dueToday: dueTodayTasks.length,
    dueTomorrow: dueTomorrowTasks.length
  };
};

// Store notified tasks to prevent duplicate notifications
let notifiedTasks = new Set();

// REAL-TIME CHECKER - Only for TODAY's tasks (not tomorrow)
let realTimeInterval = null;

export const startRealTimeChecker = (tasks, onUpdate) => {
  if (realTimeInterval) {
    clearInterval(realTimeInterval);
  }
  
  console.log('🚀 REAL-TIME NOTIFICATION CHECKER STARTED - Checking for TODAY\'s tasks only');
  
  // Check every 30 seconds
  realTimeInterval = setInterval(() => {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    tasks.forEach(task => {
      if (task.status === 'completed') return;
      if (!task.due_date) return;
      
      const taskDate = task.due_date.split('T')[0];
      
      // ONLY CHECK FOR TASKS DUE TODAY (NOT TOMORROW, NOT OVERDUE FOR ALARMS)
      if (taskDate !== currentDate) return;
      
      // Check for tasks due at specific time (TODAY only)
      if (task.due_time) {
        const [dueHour, dueMinute] = task.due_time.split(':').map(Number);
        
        // Check if current time matches due time (within this minute)
        if (dueHour === currentHour && dueMinute === currentMinute) {
          const notificationKey = `due_${task.id}_${taskDate}_${task.due_time}`;
          
          if (!notifiedTasks.has(notificationKey)) {
            notifiedTasks.add(notificationKey);
            console.log(`🔔 TASK DUE NOW: ${task.title} at ${task.due_time}`);
            
            let soundToUse = 'pleasant';
            if (task.priority === 'high') {
              soundToUse = 'urgent';
            } else if (task.priority === 'medium') {
              soundToUse = 'pleasant';
            } else {
              soundToUse = 'notification';
            }
            
            sendNotification('⏰ TASK DUE NOW!', {
              body: `"${task.title}" is due at ${task.due_time}\nPriority: ${task.priority}`,
              icon: '/favicon.ico',
              tag: `due_${task.id}`,
              requireInteraction: true
            }, soundToUse);
            
            if (onUpdate) onUpdate({ type: 'due-now', task });
          }
        }
      } else {
        // Tasks due TODAY without specific time - notify once per day
        const notificationKey = `due_today_${task.id}_${currentDate}`;
        
        if (!notifiedTasks.has(notificationKey)) {
          notifiedTasks.add(notificationKey);
          console.log(`📅 TASK DUE TODAY: ${task.title}`);
          sendNotification('📅 TASK DUE TODAY!', {
            body: `"${task.title}" is due today!\nPriority: ${task.priority}`,
            icon: '/favicon.ico',
            tag: `due_today_${task.id}`
          }, 'notification');
          if (onUpdate) onUpdate({ type: 'due-today', task });
        }
      }
    });
    
  }, 30000); // Check every 30 seconds
  
  return realTimeInterval;
};

export const stopRealTimeChecker = () => {
  if (realTimeInterval) {
    clearInterval(realTimeInterval);
    realTimeInterval = null;
    console.log('🛑 Real-time checker stopped');
  }
};

export const clearNotificationHistory = () => {
  notifiedTasks.clear();
  console.log('🗑️ Notification history cleared');
};

export const testAllSounds = () => {
  console.log('🔊 Testing all 3 sounds...');
  
  setTimeout(() => playSound('notification'), 0);
  setTimeout(() => playSound('pleasant'), 1500);
  setTimeout(() => playSound('urgent'), 3000);
  
  setTimeout(() => {
    console.log('✅ Sound test complete!');
  }, 4500);
};

export const testNotificationSound = () => {
  console.log('🔔 Testing notification with pleasant sound...');
  playSound('pleasant');
  
  setTimeout(() => {
    if (Notification.permission === 'granted') {
      new Notification('🔔 Test Notification', {
        body: 'Your notification system is working!',
        icon: '/favicon.ico'
      });
    } else {
      console.log('Please enable notifications first');
      alert('Please click "Enable Notifications" button first');
    }
  }, 500);
};

export const unlockAudioOnInteraction = async () => {
  console.log('Audio unlocked on interaction');
  return true;
};

export const getCurrentDueTasks = (tasks) => {
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  const dueNow = tasks.filter(task => {
    if (task.status === 'completed') return false;
    if (!task.due_date) return false;
    const taskDate = task.due_date.split('T')[0];
    if (taskDate !== currentDate) return false;
    if (!task.due_time) return false;
    const [dueHour, dueMin] = task.due_time.split(':').map(Number);
    return dueHour === currentHour && dueMin === currentMinute;
  });
  
  const overdue = tasks.filter(task => {
    if (task.status === 'completed') return false;
    if (!task.due_date) return false;
    const taskDate = new Date(task.due_date);
    taskDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return taskDate < today;
  });
  
  const dueToday = tasks.filter(task => {
    if (task.status === 'completed') return false;
    if (!task.due_date) return false;
    const taskDate = new Date(task.due_date);
    taskDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return taskDate.getTime() === today.getTime() && !task.due_time;
  });
  
  return { dueNow, overdue, dueToday };
};

// Legacy exports for compatibility
export const startNotificationScheduler = startRealTimeChecker;