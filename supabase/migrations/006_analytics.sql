-- Analytics events table for buidlTown
-- Tracks user interactions and page views

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  event_name VARCHAR(100) NOT NULL,
  page_url TEXT,
  referrer TEXT,
  properties JSONB DEFAULT '{}',
  session_id VARCHAR(100),
  user_agent TEXT,
  ip_hash VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_page ON analytics_events(page_url);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_analytics_type_name_date ON analytics_events(event_type, event_name, created_at DESC);

-- Enable RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert events
CREATE POLICY "Anyone can insert events" ON analytics_events
  FOR INSERT WITH CHECK (true);

-- Only admins can read events
CREATE POLICY "Only admins can read events" ON analytics_events
  FOR SELECT USING (false);

-- View for daily event counts
CREATE OR REPLACE VIEW analytics_daily_summary AS
SELECT
  DATE(created_at) as date,
  event_type,
  event_name,
  COUNT(*) as event_count,
  COUNT(DISTINCT session_id) as unique_sessions
FROM analytics_events
GROUP BY DATE(created_at), event_type, event_name
ORDER BY date DESC, event_count DESC;

-- View for page views
CREATE OR REPLACE VIEW analytics_page_views AS
SELECT
  DATE(created_at) as date,
  page_url,
  COUNT(*) as views,
  COUNT(DISTINCT session_id) as unique_visitors
FROM analytics_events
WHERE event_type = 'page_view'
GROUP BY DATE(created_at), page_url
ORDER BY date DESC, views DESC;

-- View for click events
CREATE OR REPLACE VIEW analytics_clicks AS
SELECT
  DATE(created_at) as date,
  event_name,
  properties->>'targetType' as target_type,
  properties->>'targetId' as target_id,
  COUNT(*) as click_count
FROM analytics_events
WHERE event_type = 'click'
GROUP BY DATE(created_at), event_name, properties->>'targetType', properties->>'targetId'
ORDER BY date DESC, click_count DESC;
