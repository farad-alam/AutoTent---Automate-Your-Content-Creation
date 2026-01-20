-- Add gemini_api_key column to projects table
ALTER TABLE projects 
ADD COLUMN gemini_api_key TEXT;

-- Add comment
COMMENT ON COLUMN projects.gemini_api_key IS 'User-provided Gemini API key for content generation';
