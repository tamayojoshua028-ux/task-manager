import { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './CalendarView.css';

export default function CalendarView({ tasks, onTaskClick }) {
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Get tasks for a specific date
  const getTasksForDate = (date) => {
    return tasks.filter(task => {
      if (!task.due_date) return false;
      const taskDate = new Date(task.due_date);
      return taskDate.toDateString() === date.toDateString();
    });
  };

  // Custom tile content to show task indicators
  const tileContent = ({ date, view }) => {
    if (view === 'month') {
      const dayTasks = getTasksForDate(date);
      if (dayTasks.length === 0) return null;
      
      const highCount = dayTasks.filter(t => t.priority === 'high' && t.status !== 'completed').length;
      const totalCount = dayTasks.length;
      
      return (
        <div className="calendar-tile-content">
          {highCount > 0 && <span className="task-indicator high">{highCount} 🔴</span>}
          {totalCount > 0 && <span className="task-count">{totalCount}</span>}
        </div>
      );
    }
    return null;
  };

  // Custom tile class name for styling
  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const dayTasks = getTasksForDate(date);
      if (dayTasks.length === 0) return null;
      
      const hasHigh = dayTasks.some(t => t.priority === 'high' && t.status !== 'completed');
      const hasOverdue = dayTasks.some(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed');
      
      if (hasOverdue) return 'calendar-tile overdue';
      if (hasHigh) return 'calendar-tile has-high';
      return 'calendar-tile has-tasks';
    }
    return null;
  };

  const selectedDateTasks = getTasksForDate(selectedDate);

  return (
    <div className="calendar-view">
      <div className="calendar-container">
        <Calendar
          onChange={setSelectedDate}
          value={selectedDate}
          tileContent={tileContent}
          tileClassName={tileClassName}
          locale="en-US"
        />
      </div>
      
      <div className="calendar-tasks">
        <h3>📅 Tasks for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
        {selectedDateTasks.length === 0 ? (
          <div className="no-tasks-calendar">
            <p>✨ No tasks scheduled for this day</p>
          </div>
        ) : (
          <div className="calendar-tasks-list">
            {selectedDateTasks.map(task => (
              <div 
                key={task.id} 
                className={`calendar-task-item ${task.priority} ${task.status === 'completed' ? 'completed' : ''}`}
                onClick={() => onTaskClick(task)}
              >
                <div className="calendar-task-header">
                  <strong>{task.title}</strong>
                  <span className={`priority-badge ${task.priority}`}>
                    {task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢'} {task.priority}
                  </span>
                </div>
                <div className="calendar-task-details">
  {task.due_time && <span className="time-tag">⏰ {task.due_time}</span>}
  {task.category && <span className="category-tag">🏷️ {task.category}</span>}
  {task.status === 'completed' && <span className="completed-tag">✅ Completed</span>}
</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}