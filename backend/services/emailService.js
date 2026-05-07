const nodemailer = require('nodemailer');
require('dotenv').config();

const appUrl = (process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, '');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT || 587),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendTaskReminder = async (userEmail, userName, tasks) => {
  try {
    const taskList = tasks
      .map(
        (task) => `
      <div style="padding: 10px; margin: 10px 0; border-left: 4px solid ${
        task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#10b981'
      }; background: #f9fafb; border-radius: 8px;">
        <h3 style="margin: 0 0 5px 0;">${task.title}</h3>
        <p style="margin: 5px 0;">Due: ${new Date(task.due_date).toLocaleDateString()} ${
          task.due_time ? `at ${task.due_time}` : ''
        }</p>
        <p style="margin: 5px 0;">Priority: ${task.priority}</p>
        ${task.category ? `<p style="margin: 5px 0;">Category: ${task.category}</p>` : ''}
      </div>
    `
      )
      .join('');

    const mailOptions = {
      from: `"Student Task Manager" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `Task Reminder: ${tasks.length} task(s) due soon!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Student Task Manager</h1>
          </div>

          <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px; background: white;">
            <h2>Hello ${userName}!</h2>
            <p>You have <strong>${tasks.length}</strong> task(s) due soon:</p>

            ${taskList}

            <div style="margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 8px; text-align: center;">
              <p style="margin: 0;">Don't forget to complete your tasks on time.</p>
              <p style="margin: 10px 0 0 0;">
                <a href="${appUrl}" style="background: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  View My Tasks
                </a>
              </p>
            </div>
          </div>

          <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
            <p>This is an automated reminder from Student Task Manager.</p>
            <p>You received this because you have tasks due soon.</p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Email error:', error);
    return false;
  }
};

const sendDailySummary = async (userEmail, userName, tasks) => {
  try {
    const completedTasks = tasks.filter((t) => t.status === 'completed');
    const pendingTasks = tasks.filter((t) => t.status !== 'completed');
    const overdueTasks = pendingTasks.filter((t) => t.due_date && new Date(t.due_date) < new Date());

    const mailOptions = {
      from: `"Student Task Manager" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `Daily Task Summary - ${new Date().toLocaleDateString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Daily Summary</h1>
          </div>

          <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px; background: white;">
            <h2>Hello ${userName}!</h2>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 20px 0;">
              <div style="text-align: center; padding: 15px; background: #f3f4f6; border-radius: 8px;">
                <div style="font-size: 28px; font-weight: bold; color: #6366f1;">${pendingTasks.length}</div>
                <div style="font-size: 12px; color: #6b7280;">Pending</div>
              </div>
              <div style="text-align: center; padding: 15px; background: #f3f4f6; border-radius: 8px;">
                <div style="font-size: 28px; font-weight: bold; color: #10b981;">${completedTasks.length}</div>
                <div style="font-size: 12px; color: #6b7280;">Completed</div>
              </div>
              <div style="text-align: center; padding: 15px; background: #f3f4f6; border-radius: 8px;">
                <div style="font-size: 28px; font-weight: bold; color: #ef4444;">${overdueTasks.length}</div>
                <div style="font-size: 12px; color: #6b7280;">Overdue</div>
              </div>
            </div>

            ${
              overdueTasks.length > 0
                ? `
              <div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin: 15px 0;">
                <h3 style="color: #b91c1c; margin: 0 0 10px 0;">Overdue Tasks</h3>
                ${overdueTasks.map((t) => `<p style="margin: 5px 0;">• ${t.title}</p>`).join('')}
              </div>
            `
                : ''
            }

            <div style="margin-top: 20px; text-align: center;">
              <a href="${appUrl}" style="background: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                Manage Your Tasks
              </a>
            </div>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Daily summary sent to:', userEmail);
    return true;
  } catch (error) {
    console.error('Daily summary error:', error);
    return false;
  }
};

const sendTomorrowReminder = async (userEmail, userName, tasks) => {
  try {
    const taskList = tasks
      .map(
        (task) => `
      <div style="padding: 10px; margin: 10px 0; border-left: 4px solid ${
        task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#10b981'
      }; background: #f9fafb; border-radius: 8px;">
        <h3 style="margin: 0 0 5px 0;">${task.title}</h3>
        <p style="margin: 5px 0;">Due: ${new Date(task.due_date).toLocaleDateString()} ${
          task.due_time ? `at ${task.due_time}` : ''
        }</p>
        <p style="margin: 5px 0;">Priority: ${task.priority}</p>
        ${task.category ? `<p style="margin: 5px 0;">Category: ${task.category}</p>` : ''}
      </div>
    `
      )
      .join('');

    const mailOptions = {
      from: `"Student Task Manager" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `Reminder: ${tasks.length} task(s) due tomorrow!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">Tomorrow's Tasks</h1>
          </div>

          <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px; background: white;">
            <h2>Hello ${userName}!</h2>
            <p>You have <strong style="color: #f59e0b;">${tasks.length} task(s)</strong> due tomorrow:</p>

            ${taskList}

            <div style="margin-top: 20px; padding: 15px; background: #fffbeb; border-radius: 8px; text-align: center; border-left: 4px solid #f59e0b;">
              <p style="margin: 0;">Plan ahead and stay on track.</p>
              <p style="margin: 10px 0 0 0;">
                <a href="${appUrl}" style="background: #f59e0b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  View My Tasks
                </a>
              </p>
            </div>
          </div>

          <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
            <p>This is an automated reminder from Student Task Manager.</p>
            <p>You received this because you have tasks due tomorrow.</p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Tomorrow reminder sent to:', userEmail);
    return true;
  } catch (error) {
    console.error('Tomorrow reminder error:', error);
    return false;
  }
};

module.exports = { sendTaskReminder, sendDailySummary, sendTomorrowReminder };
