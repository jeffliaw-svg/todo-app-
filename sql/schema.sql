-- To-Do App Database Schema for Supabase
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Create the tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  category TEXT,
  due_date DATE,
  reminder_time TIME,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  recurring JSONB DEFAULT '{"type": "none"}'::JSONB,
  reminder_sent_today BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
CREATE INDEX IF NOT EXISTS idx_tasks_reminder ON tasks(due_date, reminder_time, completed, reminder_sent_today);

-- Enable Row Level Security (RLS)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow all operations for anonymous users
-- Note: For a production app, you'd want user authentication
-- This is suitable for personal/single-user use
CREATE POLICY "Allow all operations for anon" ON tasks
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Grant permissions to anonymous users
GRANT ALL ON tasks TO anon;
GRANT ALL ON tasks TO authenticated;

-- Optional: Create a function to reset reminder_sent_today daily
-- This can be called by a Supabase scheduled function or your cron job
CREATE OR REPLACE FUNCTION reset_daily_reminders()
RETURNS void AS $$
BEGIN
  UPDATE tasks SET reminder_sent_today = FALSE WHERE reminder_sent_today = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
