-- Add preferred_ai_provider column to projects table (website-level default)
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS preferred_ai_provider TEXT DEFAULT 'auto';

-- Add ai_provider column to jobs table (job-level, captured at creation time)
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS ai_provider TEXT NOT NULL DEFAULT 'auto';

-- Add helpful comments
COMMENT ON COLUMN projects.preferred_ai_provider IS 'Default AI provider for website: auto, gemini, groq';
COMMENT ON COLUMN jobs.ai_provider IS 'AI provider used for this specific job (captured at scheduling time)';
