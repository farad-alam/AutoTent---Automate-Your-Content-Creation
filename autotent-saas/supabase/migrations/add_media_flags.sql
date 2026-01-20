-- Add media flags to jobs table
ALTER TABLE jobs 
ADD COLUMN include_images BOOLEAN DEFAULT TRUE,
ADD COLUMN include_videos BOOLEAN DEFAULT TRUE;

-- Comment on columns
COMMENT ON COLUMN jobs.include_images IS 'Whether to automatically inject images from Unsplash';
COMMENT ON COLUMN jobs.include_videos IS 'Whether to automatically inject videos from YouTube';
