const cron = require('node-cron');
const db = require('../db');
const { sendTaskReminder, sendDailySummary, sendTomorrowReminder } = require('./emailService');

// Check for due tasks and send reminders (ONLY ONCE per task)
const checkAndSendReminders = async () => {
  console.log(`Checking for today's due tasks... ${new Date().toLocaleString()}`);

  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];

  try {
    const [users] = await db.query('SELECT id, name, email FROM users');

    for (const user of users) {
      const [tasks] = await db.query(
        `
        SELECT * FROM tasks
        WHERE user_id = ?
        AND status = 'pending'
        AND due_date = ?
      `,
        [user.id, currentDate]
      );

      for (const task of tasks) {
        const reminderKey = `reminder_${task.id}_${currentDate}`;
        const [existing] = await db.query(
          'SELECT * FROM notification_log WHERE notification_key = ?',
          [reminderKey]
        );

        if (existing.length === 0) {
          let shouldSend = false;

          if (task.due_time) {
            const [dueHour, dueMin] = task.due_time.split(':').map(Number);
            const dueDateTime = new Date(currentDate);
            dueDateTime.setHours(dueHour, dueMin, 0, 0);

            const oneHourBefore = new Date(dueDateTime);
            oneHourBefore.setHours(oneHourBefore.getHours() - 1);

            if (now >= oneHourBefore && now <= dueDateTime) {
              shouldSend = true;
            }
          } else if (now.getHours() === 8 && now.getMinutes() <= 5) {
            shouldSend = true;
          }

          if (shouldSend) {
            console.log(`Sending reminder to ${user.email} for task: ${task.title}`);
            await sendTaskReminder(user.email, user.name, [task]);

            await db.query(
              'INSERT INTO notification_log (notification_key, value, created_at) VALUES (?, ?, NOW())',
              [reminderKey, currentDate]
            );
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking tasks:', error);
  }
};

const sendTomorrowReminders = async () => {
  console.log(`Checking for tomorrow's tasks... ${new Date().toLocaleString()}`);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  try {
    const [users] = await db.query('SELECT id, name, email FROM users');

    for (const user of users) {
      const [tasks] = await db.query(
        `
        SELECT * FROM tasks
        WHERE user_id = ?
        AND status = 'pending'
        AND due_date = ?
      `,
        [user.id, tomorrowStr]
      );

      if (tasks.length > 0) {
        const reminderKey = `tomorrow_reminder_${user.id}_${tomorrowStr}`;
        const [existing] = await db.query(
          'SELECT * FROM notification_log WHERE notification_key = ?',
          [reminderKey]
        );

        if (existing.length === 0) {
          console.log(`Sending tomorrow reminder to ${user.email} for ${tasks.length} task(s)`);
          await sendTomorrowReminder(user.email, user.name, tasks);

          await db.query(
            'INSERT INTO notification_log (notification_key, value, created_at) VALUES (?, ?, NOW())',
            [reminderKey, tomorrowStr]
          );
        }
      }
    }
  } catch (error) {
    console.error('Error checking tomorrow tasks:', error);
  }
};

const sendDailySummaries = async () => {
  console.log(`Sending daily summaries... ${new Date().toLocaleString()}`);

  const today = new Date().toISOString().split('T')[0];
  const summaryKey = `daily_summary_${today}`;

  try {
    const [existing] = await db.query(
      'SELECT * FROM notification_log WHERE notification_key = ?',
      [summaryKey]
    );

    if (existing.length > 0) {
      console.log('Daily summary already sent today');
      return;
    }

    const [users] = await db.query('SELECT id, name, email FROM users');

    for (const user of users) {
      const [tasks] = await db.query('SELECT * FROM tasks WHERE user_id = ?', [user.id]);

      if (tasks.length > 0) {
        await sendDailySummary(user.email, user.name, tasks);
        console.log(`Daily summary sent to ${user.email}`);
      }
    }

    await db.query(
      'INSERT INTO notification_log (notification_key, value, created_at) VALUES (?, ?, NOW())',
      [summaryKey, today]
    );
  } catch (error) {
    console.error('Error sending summaries:', error);
  }
};

const createNotificationTable = async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS notification_log (
        id INT PRIMARY KEY AUTO_INCREMENT,
        notification_key VARCHAR(255) UNIQUE,
        value VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Notification log table ready');
  } catch (error) {
    console.error('Error creating table:', error);
  }
};

const startEmailScheduler = () => {
  createNotificationTable();

  cron.schedule('*/15 * * * *', () => {
    checkAndSendReminders();
  });

  cron.schedule('0 20 * * *', () => {
    sendTomorrowReminders();
  });

  cron.schedule('0 8 * * *', () => {
    sendDailySummaries();
  });

  console.log('Email scheduler started');
  console.log('  - Task reminders: ONCE per task (1 hour before due)');
  console.log("  - Tomorrow's tasks reminder: ONCE at 8:00 PM");
  console.log('  - Daily summary: ONCE at 8:00 AM');
};

const manualCheck = async () => {
  await checkAndSendReminders();
};

module.exports = {
  startEmailScheduler,
  manualCheck,
  checkAndSendReminders,
  sendTomorrowReminders,
  sendDailySummaries
};
