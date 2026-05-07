import { useState } from 'react';
import API from '../api';

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

export default function AddTask({ onTaskAdded }) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('📚 Academic');
  const [attachment, setAttachment] = useState(null);
  const [recurrence, setRecurrence] = useState('none');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        e.target.value = '';
        return;
      }
      setAttachment(file);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Please enter a task title');
      return;
    }
    
    if (!dueDate) {
      setError('Please select a due date');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('due_date', dueDate);
      if (dueTime) formData.append('due_time', dueTime);
      formData.append('priority', priority);
      formData.append('category', category);
      formData.append('recurrence_type', recurrence);
      if (recurrenceEndDate) formData.append('recurrence_end_date', recurrenceEndDate);
      if (attachment) formData.append('attachment', attachment);

      await API.post('/tasks', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Reset form
      setTitle('');
      setDueDate('');
      setDueTime('');
      setPriority('medium');
      setCategory('📚 Academic');
      setAttachment(null);
      setRecurrence('none');
      setRecurrenceEndDate('');
      onTaskAdded();
      
    } catch (err) {
      console.error('Error adding task:', err);
      setError(err.response?.data?.error || 'Failed to add task');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="task-form">
      <h2>📝 Add New Task</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="form-group">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          disabled={isLoading}
        />
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            disabled={isLoading}
          />
        </div>
        
        <div className="form-group">
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
          <select 
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
            disabled={isLoading}
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label>🔄 Repeat Task</label>
          <select 
            value={recurrence} 
            onChange={(e) => setRecurrence(e.target.value)}
            disabled={isLoading}
          >
            <option value="none">No repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        
        {recurrence !== 'none' && (
          <div className="form-group">
            <label>📅 Repeat Until (Optional)</label>
            <input
              type="date"
              value={recurrenceEndDate}
              onChange={(e) => setRecurrenceEndDate(e.target.value)}
              disabled={isLoading}
            />
          </div>
        )}
      </div>
      
      <div className="form-group">
        <label className="file-label">
          📎 Attach File (Max 5MB)
          <input
            type="file"
            onChange={handleFileChange}
            disabled={isLoading}
            accept="image/*,application/pdf,.doc,.docx,.txt"
          />
        </label>
        {attachment && (
          <div className="file-info">
            <span>📄 {attachment.name}</span>
            <span className="file-size">({(attachment.size / 1024).toFixed(1)} KB)</span>
            <button type="button" onClick={() => setAttachment(null)} className="remove-file">
              ✕
            </button>
          </div>
        )}
      </div>
      
      <button onClick={handleSubmit} disabled={isLoading} className="submit-task-btn">
        {isLoading ? '⏳ Adding...' : '✨ Add Task'}
      </button>
    </div>
  );
}