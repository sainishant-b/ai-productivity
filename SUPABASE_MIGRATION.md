# Supabase Migration Guide

## Overview
This file contains everything you need to set up your own Supabase project for this app.

---

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **New Project**, pick a name and password
3. Wait for the project to finish provisioning
4. Note your **Project URL** and **anon (public) key** from Settings → API

---

## Step 2: Run the SQL Migration

Go to **SQL Editor** in your Supabase dashboard and run the following SQL **in one go**:

```sql
-- ============================================
-- 1. TABLES
-- ============================================

-- Profiles
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY,
  name text,
  work_hours_start time without time zone NOT NULL DEFAULT '09:00:00',
  work_hours_end time without time zone NOT NULL DEFAULT '18:00:00',
  timezone text NOT NULL DEFAULT 'America/New_York',
  check_in_frequency integer NOT NULL DEFAULT 3,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_check_in_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tasks
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  priority text NOT NULL,
  status text NOT NULL DEFAULT 'not_started',
  category text NOT NULL DEFAULT 'other',
  due_date timestamp with time zone,
  estimated_duration integer,
  progress integer NOT NULL DEFAULT 0,
  notes text,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Subtasks
CREATE TABLE public.subtasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Work Sessions
CREATE TABLE public.work_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  time_spent integer,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Check-ins
CREATE TABLE public.check_ins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  question text NOT NULL,
  response text NOT NULL,
  mood text,
  energy_level integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Task History
CREATE TABLE public.task_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  field_changed text NOT NULL,
  old_value text,
  new_value text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Push Subscriptions
CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  p256dh_key text NOT NULL,
  auth_key text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================
-- 2. ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- profiles (uses `id` not `user_id`)
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- tasks
CREATE POLICY "Users can view own tasks" ON public.tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.tasks FOR DELETE USING (auth.uid() = user_id);

-- subtasks
CREATE POLICY "Users can view their own subtasks" ON public.subtasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own subtasks" ON public.subtasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own subtasks" ON public.subtasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own subtasks" ON public.subtasks FOR DELETE USING (auth.uid() = user_id);

-- work_sessions
CREATE POLICY "Users can view own work sessions" ON public.work_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own work sessions" ON public.work_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own work sessions" ON public.work_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own work sessions" ON public.work_sessions FOR DELETE USING (auth.uid() = user_id);

-- check_ins
CREATE POLICY "Users can view own check-ins" ON public.check_ins FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own check-ins" ON public.check_ins FOR INSERT WITH CHECK (auth.uid() = user_id);

-- task_history
CREATE POLICY "Users can view their own task history" ON public.task_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own task history" ON public.task_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- push_subscriptions
CREATE POLICY "Users can view their own subscriptions" ON public.push_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own subscriptions" ON public.push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own subscriptions" ON public.push_subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own subscriptions" ON public.push_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 3. FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (new.id, new.raw_user_meta_data->>'name');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at on push_subscriptions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

---

## Step 3: Configure Authentication

1. In your Supabase dashboard, go to **Authentication → Providers**
2. Make sure **Email** is enabled
3. **Do NOT** enable "Confirm email" auto-confirm unless you want to skip email verification

---

## Step 4: Update Your `.env` File

In your new Lovable project (or local dev), update `.env`:

```
VITE_SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key-here"
VITE_SUPABASE_PROJECT_ID="YOUR_PROJECT_ID"
```

---

## Step 5: Deploy Edge Functions

You have 2 edge functions to deploy via [Supabase CLI](https://supabase.com/docs/guides/cli):

### `send-push-notification`
- **No Lovable dependencies** — works as-is
- Requires secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`

### `task-recommendations`
- ⚠️ **Uses Lovable AI Gateway** (`https://ai.gateway.lovable.dev`) — will NOT work outside Lovable Cloud
- To make it work, replace the fetch URL and API key:
  - **For OpenAI**: Change URL to `https://api.openai.com/v1/chat/completions`, change `LOVABLE_API_KEY` to `OPENAI_API_KEY`, change model to `gpt-4o` or `gpt-4o-mini`
  - **For Google Gemini**: Use `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`, use your `GEMINI_API_KEY`

### Deploy commands:
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_ID
supabase secrets set VAPID_PUBLIC_KEY=your_key VAPID_PRIVATE_KEY=your_key
# If using OpenAI:
supabase secrets set OPENAI_API_KEY=your_key
supabase functions deploy send-push-notification --no-verify-jwt
supabase functions deploy task-recommendations --no-verify-jwt
```

---

## Step 6: Update `supabase/config.toml`

Make sure your config.toml has:
```toml
[functions.task-recommendations]
verify_jwt = false

[functions.send-push-notification]
verify_jwt = false
```

---

## That's it!
Your app should now work with your own Supabase project. The frontend code uses the standard `@supabase/supabase-js` SDK and reads connection details from `.env` — no code changes needed.
