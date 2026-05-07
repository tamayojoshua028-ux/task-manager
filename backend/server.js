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
