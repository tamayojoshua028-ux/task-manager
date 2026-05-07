import { useState, useEffect } from 'react';
import API from '../api';
import './TaskComments.css';

export default function TaskComments({ taskId, isOpen, onClose }) {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && taskId) {
            fetchComments();
        }
    }, [isOpen, taskId]);

    const fetchComments = async () => {
        try {
            const response = await API.get(`/comments/task/${taskId}`);
            setComments(response.data);
        } catch (error) {
            console.error('Error fetching comments:', error);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim()) {
            setError('Please enter a comment');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await API.post('/comments', {
                task_id: taskId,
                comment: newComment.trim()
            });
            
            setNewComment('');
            fetchComments();
        } catch (error) {
            console.error('Error adding comment:', error);
            setError(error.response?.data?.error || 'Failed to add comment');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (window.confirm('Are you sure you want to delete this comment?')) {
            try {
                await API.delete(`/comments/${commentId}`);
                fetchComments();
            } catch (error) {
                console.error('Error deleting comment:', error);
            }
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    if (!isOpen) return null;

    return (
        <div className="comments-modal-overlay" onClick={onClose}>
            <div className="comments-modal" onClick={(e) => e.stopPropagation()}>
                <div className="comments-header">
                    <h3>📝 Task Comments & Notes</h3>
                    <button className="comments-close" onClick={onClose}>×</button>
                </div>
                
                <div className="comments-body">
                    {error && <div className="comments-error">{error}</div>}
                    
                    {/* Add Comment */}
                    <div className="add-comment">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Write a comment or note..."
                            rows="3"
                            disabled={loading}
                        />
                        <button onClick={handleAddComment} disabled={loading}>
                            {loading ? 'Adding...' : '➕ Add Comment'}
                        </button>
                    </div>
                    
                    {/* Comments List */}
                    <div className="comments-list">
                        {comments.length === 0 ? (
                            <div className="no-comments">
                                <p>✨ No comments yet. Add one above! ✨</p>
                            </div>
                        ) : (
                            comments.map((comment) => (
                                <div key={comment.id} className="comment-item">
                                    <div className="comment-header">
                                        <strong className="comment-author">{comment.user_name}</strong>
                                        <span className="comment-date">{formatDate(comment.created_at)}</span>
                                        <button 
                                            className="comment-delete"
                                            onClick={() => handleDeleteComment(comment.id)}
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                    <div className="comment-content">
                                        {comment.comment}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}