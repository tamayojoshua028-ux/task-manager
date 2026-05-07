const db = require('../db');

// Process all recurring tasks
const processRecurringTasks = async () => {
    console.log('🔄 Processing recurring tasks...', new Date().toLocaleString());
    
    try {
        const [tasks] = await db.query(`
            SELECT * FROM tasks 
            WHERE recurrence_type != 'none' 
            AND recurrence_type IS NOT NULL
            AND status != 'completed'
            ORDER BY due_date ASC
        `);
        
        console.log(`Found ${tasks.length} recurring tasks to process`);
        
        for (const task of tasks) {
            // Check if next instance already exists
            const [existing] = await db.query(
                'SELECT id FROM tasks WHERE parent_task_id = ?',
                [task.id]
            );
            
            if (existing.length === 0) {
                // Calculate next date
                const nextDueDate = new Date(task.due_date);
                nextDueDate.setDate(nextDueDate.getDate() + 1);
                
                const year = nextDueDate.getFullYear();
                const month = String(nextDueDate.getMonth() + 1).padStart(2, '0');
                const day = String(nextDueDate.getDate()).padStart(2, '0');
                const nextDateStr = `${year}-${month}-${day}`;
                
                // Check end date
                let shouldCreate = true;
                if (task.recurrence_end_date) {
                    const endDate = new Date(task.recurrence_end_date);
                    const nextDateObj = new Date(nextDateStr);
                    if (nextDateObj > endDate) {
                        shouldCreate = false;
                    }
                }
                
                if (shouldCreate) {
                    await db.query(`
                        INSERT INTO tasks (
                            user_id, title, description, due_date, due_time, priority, 
                            status, category, attachments, parent_task_id, recurrence_type, recurrence_end_date
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [
                        task.user_id,
                        task.title,
                        task.description,
                        nextDateStr,
                        task.due_time,
                        task.priority,
                        'pending',
                        task.category,
                        task.attachments,
                        task.id,
                        'none',
                        null
                    ]);
                    console.log(`✅ Created recurring task for ${nextDateStr}`);
                }
            }
        }
        
        console.log(`✅ Processed ${tasks.length} recurring tasks`);
    } catch (error) {
        console.error('Error processing recurring tasks:', error);
    }
};

module.exports = { 
    processRecurringTasks
};