-- Add preferred_model column to jobs table
-- This stores the user's selected AI model with each job, so scheduled jobs remember the model choice

ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS preferred_model TEXT;

COMMENT ON COLUMN jobs.preferred_model IS 'AI model selected by user for this job (null = auto fallback)';

-- Add model_used column to track which model actually succeeded
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS model_used TEXT;

COMMENT ON COLUMN jobs.model_used IS 'AI model that actually generated the content (for tracking and display)';
