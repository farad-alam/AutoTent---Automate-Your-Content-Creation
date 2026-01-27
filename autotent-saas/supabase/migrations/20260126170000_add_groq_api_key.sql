-- Add groq_api_key column to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS groq_api_key TEXT;

-- Add groq_api_key_label column to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS groq_api_key_label TEXT;

-- Add comment
COMMENT ON COLUMN projects.groq_api_key IS 'User-provided Groq API key for AI content generation (fallback provider)';
COMMENT ON COLUMN projects.groq_api_key_label IS 'Optional label/name for the Groq API key for user reference';
