const express = require('express');
const router = express.Router();
const db = require('../db');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// GET all comments for a task
router.get('/task/:taskId', async (req, res) => {
    try {
        const { taskId } = req.params;
        
        // Verify task belongs to user
        const [tasks] = await db.query('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [taskId, req.user.id]);
        if (tasks.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        const [comments] = await db.query(`
            SELECT c.*, u.name as user_name 
            FROM task_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.task_id = ?
            ORDER BY c.created_at DESC
        `, [taskId]);
        
        res.json(comments);
    } catch (error) {
        console.error('GET Comments Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST create a comment
router.post('/', async (req, res) => {
    try {
        const { task_id, comment } = req.body;
        
        if (!comment || comment.trim() === '') {
            return res.status(400).json({ error: 'Comment cannot be empty' });
        }
        
        // Verify task belongs to user
        const [tasks] = await db.query('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [task_id, req.user.id]);
        if (tasks.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        const [result] = await db.query(
            'INSERT INTO task_comments (task_id, user_id, comment) VALUES (?, ?, ?)',
            [task_id, req.user.id, comment.trim()]
        );
        
        const [newComment] = await db.query(`
            SELECT c.*, u.name as user_name 
            FROM task_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
        `, [result.insertId]);
        
        res.status(201).json(newComment[0]);
    } catch (error) {
        console.error('POST Comment Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE a comment
router.delete('/:commentId', async (req, res) => {
    try {
        const { commentId } = req.params;
        
        // Verify comment belongs to user
        const [comments] = await db.query(
            'SELECT c.* FROM task_comments c JOIN tasks t ON c.task_id = t.id WHERE c.id = ? AND t.user_id = ?',
            [commentId, req.user.id]
        );
        
        if (comments.length === 0) {
            return res.status(404).json({ error: 'Comment not found' });
        }
        
        await db.query('DELETE FROM task_comments WHERE id = ?', [commentId]);
        
        res.json({ message: 'Comment deleted successfully' });
    } catch (error) {
        console.error('DELETE Comment Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;