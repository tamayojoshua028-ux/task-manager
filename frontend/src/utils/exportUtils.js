export const exportToCSV = (tasks) => {
  // Define CSV headers
  const headers = [
    'ID',
    'Title',
    'Description',
    'Due Date',
    'Priority',
    'Status',
    'Category',
    'Created At'
  ];

  // Format tasks for CSV
  const rows = tasks.map(task => [
    task.id,
    `"${task.title.replace(/"/g, '""')}"`, // Escape quotes
    `"${(task.description || '').replace(/"/g, '""')}"`,
    task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date',
    task.priority || 'medium',
    task.status === 'completed' ? 'Completed' : 'Pending',
    task.category || 'Uncategorized',
    new Date(task.created_at).toLocaleString()
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Add BOM for UTF-8 encoding (handles special characters)
  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `tasks_export_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const getTaskStatistics = (tasks) => {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const pending = total - completed;
  const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);
  
  const byPriority = {
    high: tasks.filter(t => t.priority === 'high').length,
    medium: tasks.filter(t => t.priority === 'medium').length,
    low: tasks.filter(t => t.priority === 'low').length
  };
  
  const byCategory = {};
  tasks.forEach(task => {
    const cat = task.category || 'Uncategorized';
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  });
  
  const overdue = tasks.filter(t => 
    t.status !== 'completed' && 
    t.due_date && 
    new Date(t.due_date) < new Date()
  ).length;
  
  return { total, completed, pending, completionRate, byPriority, byCategory, overdue };
};