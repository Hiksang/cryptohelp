-- Create hackathons table
CREATE TABLE IF NOT EXISTS hackathons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(50) NOT NULL,               -- 'ethglobal', 'devfolio', 'dorahacks', etc.
  source_id VARCHAR(255) NOT NULL,           -- Original ID from source platform
  slug VARCHAR(255) UNIQUE NOT NULL,         -- URL-friendly identifier

  -- Core Information
  name VARCHAR(500) NOT NULL,
  description TEXT,
  short_description VARCHAR(500),

  -- Dates
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  registration_start_date TIMESTAMPTZ,
  registration_end_date TIMESTAMPTZ,
  timezone VARCHAR(100),

  -- Format & Location
  format VARCHAR(20) NOT NULL CHECK (format IN ('online', 'in-person', 'hybrid')),
  location JSONB,                            -- { city, country, venue, coordinates }

  -- Prizes
  prize_pool JSONB,                          -- { amount, currency, breakdown[] }

  -- Categories & Technologies
  chains TEXT[] DEFAULT '{}',                -- Normalized chain names
  chain_ids INTEGER[] DEFAULT '{}',          -- Internal chain IDs
  categories TEXT[] DEFAULT '{}',
  themes TEXT[] DEFAULT '{}',
  sponsors JSONB DEFAULT '[]',               -- Array of sponsor objects

  -- Links
  registration_url TEXT NOT NULL,
  website_url TEXT,
  discord_url TEXT,
  telegram_url TEXT,
  twitter_url TEXT,

  -- Media
  logo_url TEXT,
  banner_url TEXT,

  -- Stats
  participant_count INTEGER,
  project_count INTEGER,

  -- Status
  status VARCHAR(30) NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'registration_open', 'ongoing', 'judging', 'completed')),
  is_official BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,

  -- Metadata
  raw_data JSONB,                            -- Original scraped data
  content_hash VARCHAR(64),                  -- For detecting changes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_scraped_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint on source + source_id
  UNIQUE(source, source_id)
);

-- Create indexes for common queries
CREATE INDEX idx_hackathons_start_date ON hackathons(start_date);
CREATE INDEX idx_hackathons_end_date ON hackathons(end_date);
CREATE INDEX idx_hackathons_status ON hackathons(status);
CREATE INDEX idx_hackathons_source ON hackathons(source);
CREATE INDEX idx_hackathons_format ON hackathons(format);
CREATE INDEX idx_hackathons_chains ON hackathons USING GIN(chains);
CREATE INDEX idx_hackathons_chain_ids ON hackathons USING GIN(chain_ids);
CREATE INDEX idx_hackathons_categories ON hackathons USING GIN(categories);
CREATE INDEX idx_hackathons_is_featured ON hackathons(is_featured) WHERE is_featured = true;

-- Full-text search index
CREATE INDEX idx_hackathons_search ON hackathons
  USING GIN(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

-- Create trigger for updated_at
CREATE TRIGGER update_hackathons_updated_at
  BEFORE UPDATE ON hackathons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
