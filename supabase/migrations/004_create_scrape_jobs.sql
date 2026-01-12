-- Create scrape_jobs table for tracking scraping history
CREATE TABLE IF NOT EXISTS scrape_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(50) NOT NULL,
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('hackathon', 'grant')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Results
  items_found INTEGER DEFAULT 0,
  items_created INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  items_unchanged INTEGER DEFAULT 0,

  -- Error tracking
  error_message TEXT,
  error_stack TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}',               -- Additional job-specific data
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for monitoring
CREATE INDEX idx_scrape_jobs_source ON scrape_jobs(source);
CREATE INDEX idx_scrape_jobs_status ON scrape_jobs(status);
CREATE INDEX idx_scrape_jobs_created_at ON scrape_jobs(created_at DESC);
CREATE INDEX idx_scrape_jobs_entity_type ON scrape_jobs(entity_type);

-- Create view for latest job status per source
CREATE VIEW latest_scrape_jobs AS
SELECT DISTINCT ON (source, entity_type)
  id,
  source,
  entity_type,
  status,
  started_at,
  completed_at,
  duration_ms,
  items_found,
  items_created,
  items_updated,
  error_message,
  created_at
FROM scrape_jobs
ORDER BY source, entity_type, created_at DESC;

-- Create function to get scrape stats
CREATE OR REPLACE FUNCTION get_scrape_stats(days_back INTEGER DEFAULT 7)
RETURNS TABLE (
  source VARCHAR(50),
  entity_type VARCHAR(20),
  total_jobs BIGINT,
  successful_jobs BIGINT,
  failed_jobs BIGINT,
  avg_duration_ms NUMERIC,
  total_items_found BIGINT,
  last_run TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sj.source,
    sj.entity_type,
    COUNT(*)::BIGINT as total_jobs,
    COUNT(*) FILTER (WHERE sj.status = 'completed')::BIGINT as successful_jobs,
    COUNT(*) FILTER (WHERE sj.status = 'failed')::BIGINT as failed_jobs,
    AVG(sj.duration_ms)::NUMERIC as avg_duration_ms,
    SUM(sj.items_found)::BIGINT as total_items_found,
    MAX(sj.created_at) as last_run
  FROM scrape_jobs sj
  WHERE sj.created_at > NOW() - (days_back || ' days')::INTERVAL
  GROUP BY sj.source, sj.entity_type
  ORDER BY sj.source, sj.entity_type;
END;
$$ LANGUAGE plpgsql;
