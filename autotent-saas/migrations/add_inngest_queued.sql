-- Add inngest_queued column to jobs table
-- This tracks whether a job has been queued to Inngest
ALTER TABLE jobs 
ADD COLUMN inngest_queued BOOLEAN DEFAULT FALSE;

-- Create index for efficient querying by the cron job
CREATE INDEX idx_jobs_scheduling 
ON jobs(status, inngest_queued, scheduled_for) 
WHERE status = 'scheduled' AND inngest_queued = FALSE;

-- Update existing scheduled jobs to be queued (for existing data)
UPDATE jobs 
SET inngest_queued = TRUE 
WHERE status = 'scheduled' OR status = 'pending';

-- Verify the changes
SELECT 
    COUNT(*) as total_jobs,
    COUNT(*) FILTER (WHERE inngest_queued = TRUE) as queued_jobs,
    COUNT(*) FILTER (WHERE inngest_queued = FALSE) as unqueued_jobs
FROM jobs;
