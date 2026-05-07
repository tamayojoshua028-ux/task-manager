import { useState, useRef } from 'react';
import { useSwipeable } from 'react-swipeable';
import './SwipeableTaskCard.css';

export default function SwipeableTaskCard({ task, onComplete, onDelete, onEdit, onComment }) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const swipeRef = useRef(null);

  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      const deltaX = eventData.deltaX;
      if (deltaX < 0 && deltaX > -100) {
        setSwipeOffset(deltaX);
        setIsSwiping(true);
      } else if (deltaX > 0 && deltaX < 100) {
        setSwipeOffset(deltaX);
        setIsSwiping(true);
      }
    },
    onSwipedLeft: () => {
      setSwipeOffset(-80);
      setTimeout(() => {
        onDelete(task.id);
        setSwipeOffset(0);
      }, 200);
      setIsSwiping(false);
    },
    onSwipedRight: () => {
      setSwipeOffset(80);
      setTimeout(() => {
        onComplete(task);
        setSwipeOffset(0);
      }, 200);
      setIsSwiping(false);
    },
    onSwiped: () => {
      setTimeout(() => setSwipeOffset(0), 300);
      setIsSwiping(false);
    },
    trackMouse: true,
    preventScrollOnSwipe: true,
  });

  const getSwipeStyle = () => ({
    transform: `translateX(${swipeOffset}px)`,
    transition: isSwiping ? 'none' : 'transform 0.3s ease',
  });

  const getPriorityIcon = (priority) => {
    switch(priority) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '🟡';
    }
  };

  const dateStatus = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed' ? 'overdue' : '';

  return (
    <div className="swipeable-container" ref={swipeRef}>
      {/* Action hints */}
      <div className="swipe-hints">
        <div className="swipe-hint complete">✓ Complete</div>
        <div className="swipe-hint delete">🗑 Delete</div>
      </div>
      
      {/* Swipeable card */}
      <div
        {...handlers}
        className={`swipeable-card ${task.status === 'completed' ? 'completed' : ''} ${dateStatus}`}
        style={getSwipeStyle()}
      >
        <div className="task-checkbox">
          <input
            type="checkbox"
            checked={task.status === 'completed'}
            onChange={() => onComplete(task)}
            className="complete-checkbox"
            id={`task-${task.id}`}
          />
          <label htmlFor={`task-${task.id}`} className="checkbox-label"></label>
        </div>
        
        <div className="task-content">
          <div className="task-title-section">
            <strong className={`task-title ${task.status === 'completed' ? 'completed-text' : ''}`}>
              {task.title}
            </strong>
            <span className={`priority-badge ${task.priority || 'medium'}`}>
              {getPriorityIcon(task.priority)} {task.priority || 'medium'}
            </span>
          </div>
          <div className="task-meta">
            <span className="due-date">
              📅 Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date set'}
              {task.due_time && <span className="due-time"> ⏰ {task.due_time}</span>}
            </span>
          </div>
        </div>
        
        <div className="task-actions">
          <button onClick={() => onComment(task)} className="comment-btn" title="Comments">
            💬
          </button>
          <button onClick={() => onEdit(task)} className="edit-btn" title="Edit">
            ✏️
          </button>
          <button onClick={() => onDelete(task.id)} className="delete-btn" title="Delete">
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}