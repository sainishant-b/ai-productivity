-- Add notes column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN notes TEXT;

-- Create task_history table for tracking changes
CREATE TABLE public.task_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL,
  user_id UUID NOT NULL,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT task_history_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE CASCADE
);

-- Enable RLS on task_history
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;

-- Create policies for task_history
CREATE POLICY "Users can view their own task history" 
ON public.task_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own task history" 
ON public.task_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_task_history_task_id ON public.task_history(task_id);
CREATE INDEX idx_task_history_created_at ON public.task_history(created_at DESC);