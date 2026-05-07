// Debug: Check if environment variables are loaded
console.log('=== ENVIRONMENT VARIABLES CHECK ===');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_SSL:', process.env.DB_SSL);
console.log('==================================');

const express = require('express');
const cors = require('cors');
require('dotenv').config();
const cron = require('node-cron');

const taskRoutes = require('./routes/tasks');
const authRoutes = require('./routes/authRoutes');
const commentRoutes = require('./routes/comments');
const { startEmailScheduler, manualCheck } = require('./services/emailScheduler');
const { processRecurringTasks } = require('./services/recurringTaskService');

const app = express();
const PORT = Number(process.env.PORT || 5000);
const shouldRunScheduler = process.env.ENABLE_LOCAL_SCHEDULER !== 'false';
const hasCronSecret = Boolean(process.env.CRON_SECRET);

app.use(cors());
app.use(express.json());

const authorizeInternalJob = (req, res, next) => {
  if (!hasCronSecret) {
    return next();
  }

  const providedSecret = req.headers['x-cron-secret'] || req.query.secret;
  if (providedSecret === process.env.CRON_SECRET) {
    return next();
  }

  return res.status(401).json({ message: 'Unauthorized.' });
};

// Routes
app.use('/api/tasks', taskRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/comments', commentRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Test email route
app.post('/api/test-email', authorizeInternalJob, async (req, res) => {
  const { sendTaskReminder } = require('./services/emailService');
  const db = require('./db');

  try {
    const [users] = await db.query('SELECT id, name, email FROM users LIMIT 1');
    if (users.length > 0) {
      const [tasks] = await db.query('SELECT * FROM tasks WHERE user_id = ? LIMIT 3', [users[0].id]);
      await sendTaskReminder(users[0].email, users[0].name, tasks);
      res.json({ message: 'Test email sent! Check your inbox.' });
    } else {
      res.json({ message: 'No users found. Please register first.' });
    }
  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Manual trigger route (for testing)
app.post('/api/check-reminders', authorizeInternalJob, async (req, res) => {
  await manualCheck();
  res.json({ message: 'Reminder check completed!' });
});

app.post('/api/process-recurring-tasks', authorizeInternalJob, async (req, res) => {
  await processRecurringTasks();
  res.json({ message: 'Recurring tasks processed!' });
});

// ============================================
// TEMPORARY SETUP ROUTE - Remove after tables are created
// ============================================
app.get('/api/setup-db', async (req, res) => {
    const db = require('./db');
    
    const createTablesSQL = [
        `CREATE TABLE IF NOT EXISTS users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
        
        `CREATE TABLE IF NOT EXISTS tasks (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            due_date DATE,
            due_time TIME,
            priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
            status ENUM('pending', 'completed') DEFAULT 'pending',
            category VARCHAR(100),
            attachments JSON,
            recurrence_type ENUM('none', 'daily', 'weekly', 'monthly') DEFAULT 'none',
            recurrence_end_date DATE,
            parent_task_id INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,
        
        `CREATE TABLE IF NOT EXISTS task_comments (
            id INT PRIMARY KEY AUTO_INCREMENT,
            task_id INT NOT NULL,
            user_id INT NOT NULL,
            comment TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,
        
        `CREATE TABLE IF NOT EXISTS notification_log (
            id INT PRIMARY KEY AUTO_INCREMENT,
            notification_key VARCHAR(255) UNIQUE,
            value VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`
    ];
    
    try {
        for (const sql of createTablesSQL) {
            await db.query(sql);
            console.log('✅ Table created/verified');
        }
        res.json({ message: 'All tables created successfully!' });
    } catch (error) {
        console.error('❌ Setup error:', error);
        res.status(500).json({ error: error.message });
    }
});
// ============================================
// END OF SETUP ROUTE
// ============================================

// 404 handler (must be LAST)
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

  if (shouldRunScheduler) {
    startEmailScheduler();

    // Process recurring tasks daily at 1:00 AM
    cron.schedule('0 1 * * *', () => {
      console.log('Running recurring tasks check...');
      processRecurringTasks();
    });

    console.log('Recurring tasks scheduler started (daily at 1:00 AM)');
  } else {
    console.log('Local scheduler disabled. Use an external keep-alive or job runner.');
  }
});
