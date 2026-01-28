// Vercel Serverless Function - Check Reminders and Send WhatsApp Notifications
// This runs every minute via Vercel Cron

import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req, res) {
  // Only allow GET requests (from cron) and POST for manual triggers
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cron secret for security (optional but recommended)
  const cronSecret = req.headers['x-vercel-cron-secret'];
  const expectedSecret = process.env.CRON_SECRET;

  // If CRON_SECRET is set, verify it (allows manual testing without secret)
  if (expectedSecret && cronSecret !== expectedSecret) {
    // Allow requests from Vercel's cron (they come without custom headers)
    // Check if it's a legitimate cron request by checking the user-agent
    const userAgent = req.headers['user-agent'] || '';
    if (!userAgent.includes('vercel-cron')) {
      console.log('Unauthorized request - missing or invalid cron secret');
      // Still allow for testing, just log it
    }
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Initialize Twilio client
    const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioWhatsAppNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    const yourWhatsAppNumber = process.env.YOUR_WHATSAPP_NUMBER;

    if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsAppNumber || !yourWhatsAppNumber) {
      throw new Error('Missing Twilio configuration');
    }

    const twilioClient = twilio(twilioAccountSid, twilioAuthToken);

    // Get current time in Central Time
    const now = new Date();
    const ctOptions = { timeZone: 'America/Chicago' };
    const ctDate = new Date(now.toLocaleString('en-US', ctOptions));

    // Format current date and time
    const todayStr = ctDate.toISOString().split('T')[0];
    const currentHours = ctDate.getHours().toString().padStart(2, '0');
    const currentMinutes = ctDate.getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${currentHours}:${currentMinutes}:00`;

    console.log(`Checking reminders for ${todayStr} at ${currentTimeStr} CT`);

    // Query for tasks that need reminders
    // Tasks where:
    // - due_date is today
    // - completed is false
    // - reminder_time <= current time
    // - reminder_sent_today is false
    // - reminder_time is not null
    const { data: tasksToRemind, error: queryError } = await supabase
      .from('tasks')
      .select('*')
      .eq('due_date', todayStr)
      .eq('completed', false)
      .eq('reminder_sent_today', false)
      .not('reminder_time', 'is', null)
      .lte('reminder_time', currentTimeStr);

    if (queryError) {
      throw new Error(`Supabase query error: ${queryError.message}`);
    }

    console.log(`Found ${tasksToRemind?.length || 0} tasks to remind`);

    const results = {
      checked_at: now.toISOString(),
      central_time: `${todayStr} ${currentTimeStr}`,
      tasks_found: tasksToRemind?.length || 0,
      messages_sent: 0,
      errors: []
    };

    // Send WhatsApp message for each task
    for (const task of tasksToRemind || []) {
      try {
        // Format the reminder message
        const priorityEmoji = {
          high: '🔴',
          medium: '🟡',
          low: '🟢'
        }[task.priority] || '⚪';

        const message = `📋 *Task Reminder*\n\n${priorityEmoji} *${task.task}*\n\n` +
          `Priority: ${task.priority || 'medium'}\n` +
          (task.category ? `Category: ${task.category}\n` : '') +
          `Due: Today\n\n` +
          `_Sent from your To-Do App_`;

        // Send WhatsApp message via Twilio
        const twilioMessage = await twilioClient.messages.create({
          body: message,
          from: twilioWhatsAppNumber,
          to: yourWhatsAppNumber
        });

        console.log(`Sent reminder for task "${task.task}" - Message SID: ${twilioMessage.sid}`);

        // Mark reminder as sent
        const { error: updateError } = await supabase
          .from('tasks')
          .update({ reminder_sent_today: true })
          .eq('id', task.id);

        if (updateError) {
          console.error(`Failed to update reminder_sent_today for task ${task.id}:`, updateError);
          results.errors.push({
            task_id: task.id,
            error: `Update failed: ${updateError.message}`
          });
        } else {
          results.messages_sent++;
        }

      } catch (sendError) {
        console.error(`Failed to send reminder for task "${task.task}":`, sendError);
        results.errors.push({
          task_id: task.id,
          task_name: task.task,
          error: sendError.message
        });
      }
    }

    // Reset reminder_sent_today at 2am CT
    const resetHour = 2;
    if (ctDate.getHours() === resetHour && ctDate.getMinutes() < 5) {
      console.log('Resetting reminder_sent_today flags...');

      const { error: resetError } = await supabase
        .from('tasks')
        .update({ reminder_sent_today: false })
        .eq('reminder_sent_today', true);

      if (resetError) {
        console.error('Failed to reset reminder flags:', resetError);
        results.errors.push({
          error: `Reset failed: ${resetError.message}`
        });
      } else {
        results.reset_performed = true;
        console.log('Reset complete');
      }
    }

    // Return success response
    return res.status(200).json(results);

  } catch (error) {
    console.error('Error in check-reminders:', error);
    return res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
