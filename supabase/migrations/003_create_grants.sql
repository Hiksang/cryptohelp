-- Create grants table
CREATE TABLE IF NOT EXISTS grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(50) NOT NULL,               -- 'ethereum_foundation', 'solana', 'near', etc.
  source_id VARCHAR(255) NOT NULL,           -- Original ID from source
  slug VARCHAR(255) UNIQUE NOT NULL,

  -- Foundation Info
  foundation JSONB NOT NULL,                 -- { name, chain, logoUrl, websiteUrl }

  -- Core Information
  name VARCHAR(500) NOT NULL,
  program_name VARCHAR(500),
  description TEXT,
  short_description VARCHAR(500),

  -- Funding Details
  funding JSONB,                             -- { minAmount, maxAmount, currency, format, totalPool }

  -- Dates
  application_deadline TIMESTAMPTZ,
  program_start_date TIMESTAMPTZ,
  program_end_date TIMESTAMPTZ,
  is_rolling BOOLEAN DEFAULT false,          -- Always accepting applications

  -- Categories & Eligibility
  categories TEXT[] DEFAULT '{}',
  tracks TEXT[] DEFAULT '{}',
  eligibility JSONB,                         -- { regions[], requirements[], restrictions[] }

  -- Links
  application_url TEXT NOT NULL,
  guidelines_url TEXT,
  faq_url TEXT,

  -- Media
  logo_url TEXT,
  banner_url TEXT,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'upcoming', 'closed', 'paused')),
  is_featured BOOLEAN DEFAULT false,

  -- Chain association
  chains TEXT[] DEFAULT '{}',
  chain_ids INTEGER[] DEFAULT '{}',

  -- Metadata
  raw_data JSONB,
  content_hash VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_scraped_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint
  UNIQUE(source, source_id)
);

-- Create indexes
CREATE INDEX idx_grants_deadline ON grants(application_deadline);
CREATE INDEX idx_grants_status ON grants(status);
CREATE INDEX idx_grants_source ON grants(source);
CREATE INDEX idx_grants_is_rolling ON grants(is_rolling);
CREATE INDEX idx_grants_categories ON grants USING GIN(categories);
CREATE INDEX idx_grants_chains ON grants USING GIN(chains);
CREATE INDEX idx_grants_is_featured ON grants(is_featured) WHERE is_featured = true;

-- Full-text search index
CREATE INDEX idx_grants_search ON grants
  USING GIN(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

-- Create trigger for updated_at
CREATE TRIGGER update_grants_updated_at
  BEFORE UPDATE ON grants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
