// Utility functions for date calculations
export const getTaskStatus = (dueDate) => {
  if (!dueDate) return 'no-date';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const taskDate = new Date(dueDate);
  taskDate.setHours(0, 0, 0, 0);
  
  const diffTime = taskDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'due-today';
  if (diffDays === 1) return 'due-tomorrow';
  if (diffDays <= 3) return 'due-soon';
  if (diffDays <= 7) return 'due-week';
  return 'future';
};

export const getStatusColor = (status) => {
  switch(status) {
    case 'overdue': return '#ef4444';
    case 'due-today': return '#f59e0b';
    case 'due-tomorrow': return '#fbbf24';
    case 'due-soon': return '#fcd34d';
    case 'due-week': return '#10b981';
    case 'future': return '#3b82f6';
    default: return '#64748b';
  }
};

export const getStatusIcon = (status) => {
  switch(status) {
    case 'overdue': return '🔴';
    case 'due-today': return '⚠️';
    case 'due-tomorrow': return '⏰';
    case 'due-soon': return '📅';
    case 'due-week': return '📆';
    case 'future': return '✅';
    default: return '📌';
  }
};

export const getStatusText = (status) => {
  switch(status) {
    case 'overdue': return 'Overdue!';
    case 'due-today': return 'Due Today!';
    case 'due-tomorrow': return 'Due Tomorrow';
    case 'due-soon': return 'Due Soon';
    case 'due-week': return 'Due This Week';
    case 'future': return 'Upcoming';
    default: return 'No date set';
  }
};