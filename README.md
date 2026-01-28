# To-Do App with WhatsApp Reminders

A fully hosted to-do application with WhatsApp reminder notifications.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Any browser     │     │ Supabase        │     │ Vercel          │
│ (index.html)    │◄───►│ (cloud DB)      │◄───►│ (cron job)      │
│                 │     │                 │     │ └─► Twilio      │
└─────────────────┘     └─────────────────┘     │     └─► WhatsApp│
     Add/edit              Store tasks          └─────────────────┘
     tasks                                       Check every minute
                                                 & send reminders
```

## Setup Instructions

### 1. Supabase Setup

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project (choose a region close to you)
3. Wait for the project to initialize
4. Go to **SQL Editor** in the left sidebar
5. Click **New Query** and paste the contents of `sql/schema.sql`
6. Click **Run** to create the database table
7. Go to **Settings** > **API** and copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

### 2. Twilio Setup

1. Create an account at [twilio.com](https://www.twilio.com)
2. Go to **Console** > **Account Info** and copy:
   - **Account SID**
   - **Auth Token**
3. Set up WhatsApp Sandbox (for testing):
   - Go to **Messaging** > **Try it out** > **Send a WhatsApp message**
   - Follow the instructions to join the sandbox (send a WhatsApp message to the Twilio number)
   - The sandbox number is typically `whatsapp:+14155238886`
4. Note your personal WhatsApp number in format: `whatsapp:+1XXXXXXXXXX`

### 3. Vercel Setup

1. Create a free account at [vercel.com](https://vercel.com)
2. Install Vercel CLI (optional): `npm i -g vercel`
3. Upload this project to GitHub:
   ```bash
   cd todo-app
   git init
   git add .
   git commit -m "Initial commit"
   # Create a repo on GitHub, then:
   git remote add origin https://github.com/YOUR_USERNAME/todo-app.git
   git push -u origin main
   ```
4. In Vercel dashboard:
   - Click **Add New** > **Project**
   - Import your GitHub repository
   - Configure environment variables (see below)
   - Deploy

### 4. Environment Variables (Vercel Dashboard)

Go to your project **Settings** > **Environment Variables** and add:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Your Supabase anon key |
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Your Twilio Auth Token |
| `TWILIO_WHATSAPP_NUMBER` | `whatsapp:+14155238886` |
| `YOUR_WHATSAPP_NUMBER` | `whatsapp:+1XXXXXXXXXX` |

### 5. Configure the App

1. Open your deployed Vercel app URL
2. Enter your Supabase URL and Anon Key in the configuration panel
3. Click **Connect**
4. Start adding tasks!

## Features

- Create, edit, and delete tasks
- Priority levels (Low, Medium, High)
- Categories for organization
- Due dates
- **Reminder times** - get WhatsApp notifications
- Recurring tasks (Daily, Weekly, Monthly, Custom)
- Tasks reset at 2am CT for recurring items
- Works from any device with a browser

## Testing Reminders

1. Create a task with:
   - Due date = Today
   - Reminder time = 2-3 minutes from now
2. Wait for the cron job to run (every minute)
3. Check your WhatsApp for the reminder

## Troubleshooting

### No WhatsApp messages received?

1. **Check Vercel Logs**: Go to your Vercel project > **Deployments** > **Functions** > `check-reminders` > **Logs**
2. **Verify Twilio Sandbox**: Make sure you've joined the sandbox by sending the join message to the Twilio WhatsApp number
3. **Check Environment Variables**: Ensure all variables are set correctly in Vercel
4. **Verify Task Setup**: Ensure the task has:
   - `due_date` = today
   - `reminder_time` <= current time (in CT)
   - `completed` = false
   - `reminder_sent_today` = false

### Database connection issues?

1. Check that your Supabase project is active (not paused)
2. Verify the URL and anon key are correct
3. Make sure you ran the SQL schema script

## Cost Summary

- **Supabase**: Free tier (500MB database, 2GB bandwidth)
- **Vercel**: Free tier (100GB bandwidth, requires payment method for cron jobs on Hobby plan)
- **Twilio**: ~$0.005 per WhatsApp message (~$3/month for 600 messages)

**Total: ~$3/month** (mostly Twilio)

## Project Structure

```
todo-app/
├── public/
│   └── index.html          # The to-do app frontend
├── api/
│   └── check-reminders.js  # Vercel serverless function
├── sql/
│   └── schema.sql          # Database schema for Supabase
├── vercel.json             # Vercel cron configuration
├── package.json            # Dependencies
├── .env.example            # Environment variables template
└── README.md               # This file
```

## Notes

- The cron job runs every minute to check for tasks needing reminders
- Reminders are sent once per day per task (tracked by `reminder_sent_today`)
- The `reminder_sent_today` flag resets at 2am CT
- All times are handled in Central Time (America/Chicago)

