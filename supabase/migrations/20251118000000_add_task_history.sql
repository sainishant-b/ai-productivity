-- Create task_history table to track all task updates
CREATE TABLE public.task_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

-- Task history policies
CREATE POLICY "Users can view own task history"
  ON public.task_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own task history"
  ON public.task_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_task_history_task_id ON public.task_history(task_id);
CREATE INDEX idx_task_history_created_at ON public.task_history(created_at);

-- Add notes field to tasks table if not exists
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS notes TEXT;
