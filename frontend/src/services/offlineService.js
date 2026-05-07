import localforage from 'localforage';

// Configure local database
localforage.config({
  name: 'TaskManager',
  storeName: 'tasks',
  description: 'Offline task storage'
});

// Save tasks offline
export const saveTasksOffline = async (tasks) => {
  try {
    await localforage.setItem('offlineTasks', tasks);
    await localforage.setItem('lastSync', new Date().toISOString());
    console.log('Tasks saved offline');
    return true;
  } catch (error) {
    console.error('Error saving tasks offline:', error);
    return false;
  }
};

// Get tasks from offline storage
export const getOfflineTasks = async () => {
  try {
    const tasks = await localforage.getItem('offlineTasks');
    const lastSync = await localforage.getItem('lastSync');
    return { tasks: tasks || [], lastSync };
  } catch (error) {
    console.error('Error getting offline tasks:', error);
    return { tasks: [], lastSync: null };
  }
};

// Check if online
export const isOnline = () => {
  return navigator.onLine;
};

// Add offline listener
export const addOfflineListener = (onOffline, onOnline) => {
  window.addEventListener('offline', onOffline);
  window.addEventListener('online', onOnline);
  
  return () => {
    window.removeEventListener('offline', onOffline);
    window.removeEventListener('online', onOnline);
  };
};

// Queue actions for when online
let actionQueue = [];

export const queueAction = (action) => {
  actionQueue.push(action);
  localStorage.setItem('actionQueue', JSON.stringify(actionQueue));
};

export const processQueue = async () => {
  if (!isOnline()) return;
  
  const queue = JSON.parse(localStorage.getItem('actionQueue') || '[]');
  if (queue.length === 0) return;
  
  console.log(`Processing ${queue.length} queued actions`);
  
  for (const action of queue) {
    try {
      // Process action based on type
      console.log('Processing action:', action);
      // Action will be processed when back online
    } catch (error) {
      console.error('Error processing action:', error);
    }
  }
  
  localStorage.setItem('actionQueue', '[]');
};