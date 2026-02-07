-- Create topic_clusters table
CREATE TABLE IF NOT EXISTS topic_clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    pillar_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add topic_cluster_id to jobs table
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS topic_cluster_id UUID REFERENCES topic_clusters(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_jobs_topic_cluster_id ON jobs(topic_cluster_id);
CREATE INDEX IF NOT EXISTS idx_topic_clusters_project_id ON topic_clusters(project_id);
