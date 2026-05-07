const express = require('express');
const router = express.Router();
const db = require('../db');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const fs = require('fs');
const path = require('path');

router.use(protect);

// Helper function to calculate next date based on recurrence type
function getNextRecurringDate(currentDate, recurrenceType) {
    const date = new Date(currentDate);
    
    switch(recurrenceType) {
        case 'daily':
            date.setDate(date.getDate() + 1);
            break;
        case 'weekly':
            date.setDate(date.getDate() + 7);
            break;
        case 'monthly':
            date.setMonth(date.getMonth() + 1);
            break;
        default:
            return null;
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// GET all tasks
router.get('/', async (req, res) => {
    try {
        const [tasks] = await db.query(
            'SELECT * FROM tasks WHERE user_id = ? ORDER BY due_date ASC',
            [req.user.id]
        );
        
        const parsedTasks = tasks.map(task => {
            let attachments = [];
            if (task.attachments) {
                try {
                    if (typeof task.attachments === 'string') {
                        attachments = JSON.parse(task.attachments);
                    } else if (Array.isArray(task.attachments)) {
                        attachments = task.attachments;
                    }
                } catch (e) {
                    console.error('Error parsing attachments for task:', task.id, e);
                    attachments = [];
                }
            }
            return {
                ...task,
                attachments: attachments
            };
        });
        
        res.json(parsedTasks);
    } catch (error) {
        console.error('GET Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST create task
router.post('/', upload.single('attachment'), async (req, res) => {
    try {
        const { title, due_date, due_time, priority, description, category, recurrence_type, recurrence_end_date } = req.body;
        
        let attachmentData = null;
        if (req.file) {
            attachmentData = {
                filename: req.file.filename,
                originalname: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype,
                path: req.file.path
            };
        }
        
        const [result] = await db.query(
            `INSERT INTO tasks (
                user_id, title, description, due_date, due_time, priority, status, category, attachments, 
                recurrence_type, recurrence_end_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.id, 
                title, 
                description || null, 
                due_date || null, 
                due_time || null, 
                priority || 'medium', 
                'pending', 
                category || 'Uncategorized', 
                attachmentData ? JSON.stringify([attachmentData]) : null,
                recurrence_type || 'none',
                recurrence_end_date || null
            ]
        );
        
        const [newTask] = await db.query('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
        
        if (newTask[0].attachments) {
            newTask[0].attachments = JSON.parse(newTask[0].attachments);
        }
        
        res.status(201).json(newTask[0]);
    } catch (error) {
        console.error('POST Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET download attachment
router.get('/download/:filename', protect, async (req, res) => {
    try {
        const filename = req.params.filename;
        const userId = req.user.id;
        
        const [tasks] = await db.query(
            'SELECT attachments FROM tasks WHERE user_id = ? AND attachments LIKE ?',
            [userId, `%${filename}%`]
        );
        
        if (tasks.length === 0) {
            return res.status(403).json({ error: 'Unauthorized access to file' });
        }
        
        const filepath = path.join(__dirname, '../uploads', filename);
        if (fs.existsSync(filepath)) {
            res.download(filepath);
        } else {
            res.status(404).json({ error: 'File not found' });
        }
    } catch (error) {
        console.error('Download Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE attachment from task
router.delete('/:taskId/attachment/:attachmentIndex', async (req, res) => {
    try {
        const { taskId, attachmentIndex } = req.params;
        
        const [tasks] = await db.query('SELECT attachments FROM tasks WHERE id = ? AND user_id = ?', [taskId, req.user.id]);
        
        if (tasks.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        let attachments = tasks[0].attachments;
        if (typeof attachments === 'string') {
            attachments = JSON.parse(attachments);
        }
        
        if (!Array.isArray(attachments)) {
            attachments = [];
        }
        
        const removed = attachments.splice(attachmentIndex, 1);
        
        if (removed[0] && removed[0].path && fs.existsSync(removed[0].path)) {
            fs.unlink(removed[0].path, (err) => console.log('File delete error:', err));
        }
        
        await db.query('UPDATE tasks SET attachments = ? WHERE id = ?', [JSON.stringify(attachments), taskId]);
        
        res.json({ message: 'Attachment deleted' });
    } catch (error) {
        console.error('DELETE Attachment Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PATCH update task status (WITH FULL RECURRING SUPPORT)
router.patch('/:id', async (req, res) => {
    try {
        const { status } = req.body;
        const taskId = req.params.id;
        
        // Get task before update
        const [oldTasks] = await db.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [taskId, req.user.id]);
        
        if (oldTasks.length === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        const oldTask = oldTasks[0];
        
        // Update status
        await db.query('UPDATE tasks SET status = ? WHERE id = ? AND user_id = ?', [status, taskId, req.user.id]);
        
        // If task was marked as completed, create next recurring instance
        if (status === 'completed') {
            // Find the parent recurring task
            let parentTaskId = oldTask.id;
            if (oldTask.parent_task_id) {
                parentTaskId = oldTask.parent_task_id;
            }
            
            // Get the parent recurring task
            const [parentTasks] = await db.query('SELECT * FROM tasks WHERE id = ?', [parentTaskId]);
            
            if (parentTasks.length > 0) {
                const parentTask = parentTasks[0];
                
                if (parentTask.recurrence_type !== 'none' && parentTask.recurrence_type !== null) {
                    // Get the last child task date
                    const [lastChild] = await db.query(`
                        SELECT due_date FROM tasks 
                        WHERE parent_task_id = ? 
                        ORDER BY due_date DESC 
                        LIMIT 1
                    `, [parentTask.id]);
                    
                    let lastDueDate;
                    if (lastChild.length > 0) {
                        lastDueDate = new Date(lastChild[0].due_date);
                    } else {
                        lastDueDate = new Date(parentTask.due_date);
                    }
                    
                    // Calculate next date based on recurrence type
                    const nextDateStr = getNextRecurringDate(lastDueDate, parentTask.recurrence_type);
                    
                    if (!nextDateStr) {
                        const [updatedTask] = await db.query('SELECT * FROM tasks WHERE id = ?', [taskId]);
                        if (updatedTask[0].attachments) {
                            updatedTask[0].attachments = JSON.parse(updatedTask[0].attachments);
                        }
                        return res.json(updatedTask[0]);
                    }
                    
                    // Check if within end date
                    let shouldCreate = true;
                    if (parentTask.recurrence_end_date) {
                        const endDate = new Date(parentTask.recurrence_end_date);
                        const nextDateObj = new Date(nextDateStr);
                        if (nextDateObj > endDate) {
                            shouldCreate = false;
                            console.log(`✅ Recurrence stopped at ${parentTask.recurrence_end_date}`);
                        }
                    }
                    
                    // Create next task if allowed
                    if (shouldCreate) {
                        const [existing] = await db.query(
                            'SELECT id FROM tasks WHERE parent_task_id = ? AND due_date = ?',
                            [parentTask.id, nextDateStr]
                        );
                        
                        if (existing.length === 0) {
                            await db.query(`
                                INSERT INTO tasks (
                                    user_id, title, description, due_date, due_time, priority, 
                                    status, category, attachments, parent_task_id, recurrence_type, recurrence_end_date
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            `, [
                                parentTask.user_id,
                                parentTask.title,
                                parentTask.description,
                                nextDateStr,
                                parentTask.due_time,
                                parentTask.priority,
                                'pending',
                                parentTask.category,
                                parentTask.attachments,
                                parentTask.id,
                                'none',
                                null
                            ]);
                            console.log(`✅ Created ${parentTask.recurrence_type} recurring task for ${nextDateStr}`);
                        }
                    }
                }
            }
        }
        
        const [updatedTask] = await db.query('SELECT * FROM tasks WHERE id = ?', [taskId]);
        
        if (updatedTask[0].attachments) {
            updatedTask[0].attachments = JSON.parse(updatedTask[0].attachments);
        }
        
        res.json(updatedTask[0]);
    } catch (error) {
        console.error('PATCH Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT update full task
router.put('/:id', upload.single('attachment'), async (req, res) => {
    try {
        const { title, due_date, due_time, priority, description, status, category, recurrence_type, recurrence_end_date } = req.body;
        const taskId = req.params.id;
        
        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }
        
        let attachments = null;
        if (req.file) {
            const [tasks] = await db.query('SELECT attachments FROM tasks WHERE id = ?', [taskId]);
            let currentAttachments = tasks[0].attachments ? JSON.parse(tasks[0].attachments) : [];
            currentAttachments.push({
                filename: req.file.filename,
                originalname: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype,
                path: req.file.path
            });
            attachments = JSON.stringify(currentAttachments);
        }
        
        const query = attachments 
            ? `UPDATE tasks SET 
                title = ?, description = ?, due_date = ?, due_time = ?, priority = ?, 
                status = ?, category = ?, recurrence_type = ?, recurrence_end_date = ?, attachments = ? 
                WHERE id = ? AND user_id = ?`
            : `UPDATE tasks SET 
                title = ?, description = ?, due_date = ?, due_time = ?, priority = ?, 
                status = ?, category = ?, recurrence_type = ?, recurrence_end_date = ? 
                WHERE id = ? AND user_id = ?`;
        
        const params = attachments 
            ? [title, description || null, due_date || null, due_time || null, priority || 'medium', 
               status || 'pending', category || 'Uncategorized', recurrence_type || 'none', 
               recurrence_end_date || null, attachments, taskId, req.user.id]
            : [title, description || null, due_date || null, due_time || null, priority || 'medium', 
               status || 'pending', category || 'Uncategorized', recurrence_type || 'none', 
               recurrence_end_date || null, taskId, req.user.id];
        
        const [result] = await db.query(query, params);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        const [updatedTask] = await db.query('SELECT * FROM tasks WHERE id = ?', [taskId]);
        
        if (updatedTask[0].attachments) {
            updatedTask[0].attachments = JSON.parse(updatedTask[0].attachments);
        }
        
        res.json(updatedTask[0]);
    } catch (error) {
        console.error('PUT Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE task
router.delete('/:id', async (req, res) => {
    try {
        const [tasks] = await db.query('SELECT attachments FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        
        if (tasks.length > 0 && tasks[0].attachments) {
            try {
                let attachments = tasks[0].attachments;
                if (typeof attachments === 'string') {
                    attachments = JSON.parse(attachments);
                }
                
                if (Array.isArray(attachments)) {
                    attachments.forEach(attachment => {
                        if (attachment.path && fs.existsSync(attachment.path)) {
                            fs.unlinkSync(attachment.path);
                        }
                    });
                }
            } catch (parseError) {
                console.error('Error parsing attachments for deletion:', parseError);
            }
        }
        
        const [result] = await db.query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        res.json({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error('DELETE Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
