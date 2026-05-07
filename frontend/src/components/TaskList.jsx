import { useState } from 'react';
import Confetti from 'react-confetti';
import API from '../api';
import EditTaskModal from './EditTaskModal';
import TaskComments from './TaskComments';
import { buildApiUrl } from '../config';
import { getTaskStatus, getStatusIcon, getStatusText } from '../utils/dateUtils';
import { exportToCSV } from '../utils/exportUtils';

export default function TaskList({ tasks, onTaskDeleted, onTaskCompleted, onTaskEdited }) {
  const [editingTask, setEditingTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('dueDate');
  const [sortOrder, setSortOrder] = useState('asc');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedTaskForComments, setSelectedTaskForComments] = useState(null);
  const [commentsModalOpen, setCommentsModalOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleToggleComplete = async (task) => {
    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      await API.patch(`/tasks/${task.id}`, { status: newStatus });
      
      // ONLY call the appropriate callback - NO onTaskDeleted here
      if (newStatus === 'completed') {
        console.log('✅ Task COMPLETED - calling onTaskCompleted');
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
        if (onTaskCompleted) onTaskCompleted();
      } else {
        console.log('📝 Task marked incomplete - calling onTaskEdited');
        if (onTaskEdited) onTaskEdited();
      }
      
      // Refresh the task list through the parent
      // The parent's refreshTasksWithAction already calls fetchTasks
    } catch (error) {
      console.error('Error toggling task status:', error);
      alert('Failed to update task status: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await API.delete(`/tasks/${id}`);
        console.log('🗑️ Task DELETED - calling onTaskDeleted');
        if (onTaskDeleted) onTaskDeleted();
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleEditComplete = () => {
    console.log('✏️ EDIT COMPLETE - calling onTaskEdited');
    if (onTaskEdited) onTaskEdited();
  };

  // Download file with authentication
  const downloadFile = async (filename, originalname) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl(`/tasks/download/${filename}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = originalname;
        link.click();
        window.URL.revokeObjectURL(url);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to download file');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Error downloading file');
    }
  };

  // Preview file with authentication
  const previewFile = async (filename) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(buildApiUrl(`/tasks/download/${filename}`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        const fileType = blob.type;
        if (fileType.startsWith('image/') || fileType === 'application/pdf') {
          window.open(url, '_blank');
        } else {
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          link.click();
        }
        window.URL.revokeObjectURL(url);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to preview file');
      }
    } catch (error) {
      console.error('Preview error:', error);
      alert('Error previewing file');
    }
  };

  const getPriorityIcon = (priority) => {
    switch(priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '🟡';
    }
  };

  const getPriorityWeight = (priority) => {
    switch(priority) {
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 2;
    }
  };

  // Get unique categories from tasks
  const categories = ['all', ...new Set(tasks.map(t => t.category || 'Uncategorized').filter(Boolean))];

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (filter === 'pending' && task.status === 'completed') return false;
    if (filter === 'completed' && task.status !== 'completed') return false;
    if (searchTerm.trim() !== '') {
      return task.title.toLowerCase().includes(searchTerm.toLowerCase());
    }
    if (categoryFilter !== 'all' && task.category !== categoryFilter) return false;
    return true;
  });

  // Sort tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let comparison = 0;
    switch(sortBy) {
      case 'dueDate':
        const dateA = new Date(a.due_date || '9999-12-31');
        const dateB = new Date(b.due_date || '9999-12-31');
        comparison = dateA - dateB;
        break;
      case 'priority':
        comparison = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
        break;
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'created':
        comparison = new Date(a.created_at) - new Date(b.created_at);
        break;
      default:
        comparison = 0;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const handleSort = (sortType) => {
    if (sortBy === sortType) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(sortType);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (type) => {
    if (sortBy !== type) return '↕️';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const overdueCount = tasks.filter(t => t.status !== 'completed' && getTaskStatus(t.due_date) === 'overdue').length;
  const dueTodayCount = tasks.filter(t => t.status !== 'completed' && getTaskStatus(t.due_date) === 'due-today').length;
  const pendingCount = tasks.filter(t => t.status !== 'completed').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const searchResultsCount = sortedTasks.length;

  if (!tasks || tasks.length === 0) {
    return (
      <div className="task-list">
        <h2>My Tasks</h2>
        <div className="empty-state">
          <p>✨ No tasks yet. Add one above! ✨</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {showConfetti && (
        <Confetti 
          gravity={0.2} 
          numberOfPieces={150} 
          recycle={false} 
          colors={['#715A5A', '#D3DAD9', '#c9a87b', '#7a9e7e', '#c97b7b']}
        />
      )}
      
      <div className="task-list">
        <div className="task-list-header">
          <h2>My Tasks</h2>
          <div className="header-right">
            <button onClick={() => exportToCSV(tasks)} className="export-btn">
              📥 Export CSV
            </button>
            <div className="task-stats">
              <span className="stat-badge pending">⏳ {pendingCount} Pending</span>
              <span className="stat-badge completed">✅ {completedCount} Completed</span>
            </div>
          </div>
        </div>

        {/* Alert Banner */}
        {(overdueCount > 0 || dueTodayCount > 0) && (
          <div className="alert-banner">
            {overdueCount > 0 && (
              <div className="alert-item overdue">
                <span>🔴 {overdueCount} task(s) OVERDUE!</span>
              </div>
            )}
            {dueTodayCount > 0 && (
              <div className="alert-item due-today">
                <span>⚠️ {dueTodayCount} task(s) due TODAY!</span>
              </div>
            )}
          </div>
        )}

        {/* Search Bar */}
        <div className="search-container">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search tasks by title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button className="clear-search" onClick={() => setSearchTerm('')}>
                ✕
              </button>
            )}
          </div>
          {searchTerm && (
            <div className="search-info">
              Found {searchResultsCount} task(s) matching "{searchTerm}"
            </div>
          )}
        </div>

        {/* Sort Options */}
        <div className="sort-container">
          <label className="sort-label">Sort by:</label>
          <div className="sort-buttons">
            <button className={`sort-btn ${sortBy === 'dueDate' ? 'active' : ''}`} onClick={() => handleSort('dueDate')}>
              📅 Due Date {getSortIcon('dueDate')}
            </button>
            <button className={`sort-btn ${sortBy === 'priority' ? 'active' : ''}`} onClick={() => handleSort('priority')}>
              🎯 Priority {getSortIcon('priority')}
            </button>
            <button className={`sort-btn ${sortBy === 'title' ? 'active' : ''}`} onClick={() => handleSort('title')}>
              📝 Title {getSortIcon('title')}
            </button>
            <button className={`sort-btn ${sortBy === 'created' ? 'active' : ''}`} onClick={() => handleSort('created')}>
              🕐 Created {getSortIcon('created')}
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="category-filter">
          <label className="category-label">🏷️ Filter by Category:</label>
          <div className="category-buttons">
            {categories.map(cat => (
              <button
                key={cat}
                className={`category-btn ${categoryFilter === cat ? 'active' : ''}`}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat === 'all' ? '📋 All' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter Buttons */}
        <div className="filter-buttons">
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
            📋 All Tasks
          </button>
          <button className={`filter-btn ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>
            ⏳ Pending ({pendingCount})
          </button>
          <button className={`filter-btn ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>
            ✅ Completed ({completedCount})
          </button>
        </div>

        {/* Tasks Container */}
        <div className="tasks-container">
          {sortedTasks.length === 0 ? (
            <div className="empty-state">
              {searchTerm ? (
                <p>🔍 No tasks matching "{searchTerm}"</p>
              ) : (
                <p>No tasks in this category</p>
              )}
            </div>
          ) : (
            sortedTasks.map((task) => {
              const dateStatus = getTaskStatus(task.due_date);
              return (
                <div key={task.id} className={`task-card ${task.status === 'completed' ? 'completed' : ''} ${dateStatus}`}>
                  <div className="task-checkbox">
                    <input
                      type="checkbox"
                      checked={task.status === 'completed'}
                      onChange={() => handleToggleComplete(task)}
                      className="complete-checkbox"
                      id={`task-${task.id}`}
                    />
                    <label htmlFor={`task-${task.id}`} className="checkbox-label"></label>
                  </div>
                  
                  <div className="task-content">
                    <div className="task-title-section">
                      <strong className={`task-title ${task.status === 'completed' ? 'completed-text' : ''}`}>
                        {searchTerm ? highlightText(task.title, searchTerm) : task.title}
                      </strong>
                      <span className={`priority-badge ${task.priority || 'medium'}`}>
                        {getPriorityIcon(task.priority)} {task.priority || 'medium'}
                      </span>
                      {task.category && task.category !== 'Uncategorized' && (
                        <span className="category-badge">
                          🏷️ {task.category}
                        </span>
                      )}
                      {task.recurrence_type && task.recurrence_type !== 'none' && (
                        <span className="recurrence-badge">
                          {task.recurrence_type === 'daily' && '🔄 Daily'}
                          {task.recurrence_type === 'weekly' && '🔄 Weekly'}
                          {task.recurrence_type === 'monthly' && '🔄 Monthly'}
                        </span>
                      )}
                      {task.status === 'completed' && (
                        <span className="completed-badge">✓ Done</span>
                      )}
                      {task.due_date && task.status !== 'completed' && (
                        <span className={`date-badge ${dateStatus}`}>
                          {getStatusIcon(dateStatus)} {getStatusText(dateStatus)}
                        </span>
                      )}
                    </div>
                    <div className="task-meta">
                      <span className="due-date">
                        📅 Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date set'}
                        {task.due_time && <span className="due-time"> ⏰ {task.due_time}</span>}
                      </span>
                    </div>
                    
                    {/* Attachments Display */}
                    {task.attachments && task.attachments.length > 0 && (
                      <div className="task-attachments">
                        <div className="attachments-title">📎 Attachments ({task.attachments.length})</div>
                        <div className="attachments-list">
                          {task.attachments.map((att, idx) => (
                            <div key={idx} className="attachment-card">
                              <div className="attachment-icon">
                                {att.mimetype?.startsWith('image/') ? '🖼️' : 
                                 att.mimetype === 'application/pdf' ? '📕' : 
                                 att.mimetype?.includes('word') ? '📝' : 
                                 att.mimetype?.includes('excel') ? '📊' : '📄'}
                              </div>
                              
                              <div className="attachment-info">
                                <div className="attachment-name" title={att.originalname}>
                                  {att.originalname?.length > 30 ? att.originalname.substring(0, 27) + '...' : att.originalname}
                                </div>
                                <div className="attachment-meta">
                                  <span className="attachment-size">{(att.size / 1024).toFixed(1)} KB</span>
                                </div>
                              </div>
                              
                              <div className="attachment-actions">
                                {(att.mimetype?.startsWith('image/') || att.mimetype === 'application/pdf') && (
                                  <button 
                                    className="attachment-btn preview-btn"
                                    onClick={() => previewFile(att.filename)}
                                    title="Preview"
                                  >
                                    👁️ Preview
                                  </button>
                                )}
                                <button 
                                  className="attachment-btn download-btn"
                                  onClick={() => downloadFile(att.filename, att.originalname)}
                                  title="Download"
                                >
                                  ⬇️ Download
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="task-actions">
                    <button 
                      onClick={() => {
                        setSelectedTaskForComments(task);
                        setCommentsModalOpen(true);
                      }} 
                      className="comment-task-btn"
                      title="View Comments"
                    >
                      💬 Comments
                    </button>
                    <button onClick={() => handleEdit(task)} className="edit-task-btn" disabled={task.status === 'completed'}>
                      ✏️ Edit
                    </button>
                    <button onClick={() => handleDelete(task.id)} className="delete-task-btn">
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <EditTaskModal 
        task={editingTask} 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        onTaskUpdated={handleEditComplete}
      />

      <TaskComments 
        taskId={selectedTaskForComments?.id}
        isOpen={commentsModalOpen}
        onClose={() => setCommentsModalOpen(false)}
      />
    </>
  );
}

// Helper function to highlight search term in text
function highlightText(text, searchTerm) {
  if (!searchTerm) return text;
  const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
  return parts.map((part, index) => 
    part.toLowerCase() === searchTerm.toLowerCase() ? 
      <mark key={index} className="highlight">{part}</mark> : 
      part
  );
}
