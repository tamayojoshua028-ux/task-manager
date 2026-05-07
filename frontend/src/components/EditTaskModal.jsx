import { useState, useEffect } from 'react';
import API from '../api';
import './EditTaskModal.css';

const CATEGORIES = [
  '📚 Academic',
  '💼 Work',
  '🏠 Personal',
  '💪 Health',
  '💰 Finance',
  '🎨 Creative',
  '🛒 Shopping',
  '🧹 Chores',
  '📧 Email',
  '🎓 Learning',
  '🤝 Social',
  '✨ Other'
];

export default function EditTaskModal({ task, isOpen, onClose, onTaskUpdated }) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('📚 Academic');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDueDate(task.due_date ? task.due_date.split('T')[0] : '');
      setDueTime(task.due_time || '');
      setPriority(task.priority || 'medium');
      setCategory(task.category || '📚 Academic');
    }
  }, [task]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Please enter a task title');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await API.put(`/tasks/${task.id}`, {
        title: title.trim(),
        due_date: dueDate,
        due_time: dueTime || null,
        priority: priority,
        category: category
      });
      
      onTaskUpdated();
      onClose();
      
    } catch (err) {
      console.error('Error updating task:', err);
      setError(err.response?.data?.message || 'Failed to update task');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✏️ Edit Task</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="modal-body">
          <div className="form-group">
            <label>Task Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
              disabled={isLoading}
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={isLoading}
              />
            </div>
            
            <div className="form-group">
              <label>Due Time (optional)</label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Priority</label>
              <select 
                value={priority} 
                onChange={(e) => setPriority(e.target.value)}
                disabled={isLoading}
              >
                <option value="low">🟢 Low Priority</option>
                <option value="medium">🟡 Medium Priority</option>
                <option value="high">🔴 High Priority</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Category</label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                disabled={isLoading}
                className="category-select"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          <button className="save-btn" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Saving...' : '💾 Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}