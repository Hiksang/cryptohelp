-- Full Migration Script for CryptoHelp
-- Run this in Supabase SQL Editor

-- ============================================
-- 001: Create chains table
-- ============================================

CREATE TABLE IF NOT EXISTS chains (
  id SERIAL PRIMARY KEY,
  chain_id INTEGER,
  caip2 VARCHAR(100),
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('L1', 'L2', 'sidechain', 'appchain')),
  evm_compatible BOOLEAN DEFAULT false,
  logo_url TEXT,
  explorer_url TEXT,
  website_url TEXT,
  aliases TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chain_id),
  UNIQUE(name)
);

CREATE INDEX IF NOT EXISTS idx_chains_aliases ON chains USING GIN(aliases);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_chains_updated_at ON chains;
CREATE TRIGGER update_chains_updated_at
  BEFORE UPDATE ON chains
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert initial chain data
INSERT INTO chains (id, chain_id, caip2, name, symbol, type, evm_compatible, aliases) VALUES
  (1, 1, 'eip155:1', 'Ethereum', 'ETH', 'L1', true, ARRAY['ethereum', 'eth', 'ethereum mainnet', 'mainnet']),
  (56, 56, 'eip155:56', 'BNB Chain', 'BNB', 'L1', true, ARRAY['bnb', 'bsc', 'binance', 'binance smart chain', 'bnb chain']),
  (137, 137, 'eip155:137', 'Polygon', 'MATIC', 'L1', true, ARRAY['polygon', 'matic', 'polygon pos', 'polygon mainnet']),
  (43114, 43114, 'eip155:43114', 'Avalanche', 'AVAX', 'L1', true, ARRAY['avalanche', 'avax', 'avalanche c-chain']),
  (900, NULL, 'solana:mainnet', 'Solana', 'SOL', 'L1', false, ARRAY['solana', 'sol']),
  (901, NULL, 'near:mainnet', 'NEAR', 'NEAR', 'L1', false, ARRAY['near', 'near protocol']),
  (902, NULL, NULL, 'Sui', 'SUI', 'L1', false, ARRAY['sui']),
  (903, NULL, NULL, 'Aptos', 'APT', 'L1', false, ARRAY['aptos', 'apt']),
  (904, NULL, 'cosmos:cosmoshub-4', 'Cosmos Hub', 'ATOM', 'L1', false, ARRAY['cosmos', 'atom', 'cosmos hub']),
  (10, 10, 'eip155:10', 'Optimism', 'OP', 'L2', true, ARRAY['optimism', 'op', 'op mainnet']),
  (8453, 8453, 'eip155:8453', 'Base', 'ETH', 'L2', true, ARRAY['base', 'base mainnet', 'coinbase']),
  (42161, 42161, 'eip155:42161', 'Arbitrum One', 'ARB', 'L2', true, ARRAY['arbitrum', 'arb', 'arbitrum one']),
  (42170, 42170, 'eip155:42170', 'Arbitrum Nova', 'ARB', 'L2', true, ARRAY['arbitrum nova', 'nova']),
  (324, 324, 'eip155:324', 'zkSync Era', 'ETH', 'L2', true, ARRAY['zksync', 'zksync era', 'zk sync']),
  (59144, 59144, 'eip155:59144', 'Linea', 'ETH', 'L2', true, ARRAY['linea', 'linea mainnet']),
  (534352, 534352, 'eip155:534352', 'Scroll', 'ETH', 'L2', true, ARRAY['scroll']),
  (1101, 1101, 'eip155:1101', 'Polygon zkEVM', 'ETH', 'L2', true, ARRAY['polygon zkevm', 'polygon hermez']),
  (81457, 81457, 'eip155:81457', 'Blast', 'ETH', 'L2', true, ARRAY['blast'])
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 002: Create hackathons table
-- ============================================

CREATE TABLE IF NOT EXISTS hackathons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(50) NOT NULL,
  source_id VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  short_description VARCHAR(500),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  registration_start_date TIMESTAMPTZ,
  registration_end_date TIMESTAMPTZ,
  timezone VARCHAR(100),
  format VARCHAR(20) NOT NULL CHECK (format IN ('online', 'in-person', 'hybrid')),
  location JSONB,
  prize_pool JSONB,
  chains TEXT[] DEFAULT '{}',
  chain_ids INTEGER[] DEFAULT '{}',
  categories TEXT[] DEFAULT '{}',
  themes TEXT[] DEFAULT '{}',
  sponsors JSONB DEFAULT '[]',
  registration_url TEXT NOT NULL,
  website_url TEXT,
  discord_url TEXT,
  telegram_url TEXT,
  twitter_url TEXT,
  logo_url TEXT,
  banner_url TEXT,
  participant_count INTEGER,
  project_count INTEGER,
  status VARCHAR(30) NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'registration_open', 'ongoing', 'judging', 'completed')),
  is_official BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  raw_data JSONB,
  content_hash VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_scraped_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source, source_id)
);

CREATE INDEX IF NOT EXISTS idx_hackathons_start_date ON hackathons(start_date);
CREATE INDEX IF NOT EXISTS idx_hackathons_end_date ON hackathons(end_date);
CREATE INDEX IF NOT EXISTS idx_hackathons_status ON hackathons(status);
CREATE INDEX IF NOT EXISTS idx_hackathons_source ON hackathons(source);
CREATE INDEX IF NOT EXISTS idx_hackathons_format ON hackathons(format);
CREATE INDEX IF NOT EXISTS idx_hackathons_chains ON hackathons USING GIN(chains);
CREATE INDEX IF NOT EXISTS idx_hackathons_chain_ids ON hackathons USING GIN(chain_ids);
CREATE INDEX IF NOT EXISTS idx_hackathons_categories ON hackathons USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_hackathons_is_featured ON hackathons(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_hackathons_search ON hackathons
  USING GIN(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

DROP TRIGGER IF EXISTS update_hackathons_updated_at ON hackathons;
CREATE TRIGGER update_hackathons_updated_at
  BEFORE UPDATE ON hackathons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 003: Create grants table
-- ============================================

CREATE TABLE IF NOT EXISTS grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(50) NOT NULL,
  source_id VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  foundation JSONB NOT NULL,
  name VARCHAR(500) NOT NULL,
  program_name VARCHAR(500),
  description TEXT,
  short_description VARCHAR(500),
  funding JSONB,
  application_deadline TIMESTAMPTZ,
  program_start_date TIMESTAMPTZ,
  program_end_date TIMESTAMPTZ,
  is_rolling BOOLEAN DEFAULT false,
  categories TEXT[] DEFAULT '{}',
  tracks TEXT[] DEFAULT '{}',
  eligibility JSONB,
  application_url TEXT NOT NULL,
  guidelines_url TEXT,
  faq_url TEXT,
  logo_url TEXT,
  banner_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'upcoming', 'closed', 'paused')),
  is_featured BOOLEAN DEFAULT false,
  chains TEXT[] DEFAULT '{}',
  chain_ids INTEGER[] DEFAULT '{}',
  raw_data JSONB,
  content_hash VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_scraped_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source, source_id)
);

CREATE INDEX IF NOT EXISTS idx_grants_deadline ON grants(application_deadline);
CREATE INDEX IF NOT EXISTS idx_grants_status ON grants(status);
CREATE INDEX IF NOT EXISTS idx_grants_source ON grants(source);
CREATE INDEX IF NOT EXISTS idx_grants_is_rolling ON grants(is_rolling);
CREATE INDEX IF NOT EXISTS idx_grants_categories ON grants USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_grants_chains ON grants USING GIN(chains);
CREATE INDEX IF NOT EXISTS idx_grants_is_featured ON grants(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_grants_search ON grants
  USING GIN(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

DROP TRIGGER IF EXISTS update_grants_updated_at ON grants;
CREATE TRIGGER update_grants_updated_at
  BEFORE UPDATE ON grants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 004: Create scrape_jobs table
-- ============================================

CREATE TABLE IF NOT EXISTS scrape_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(50) NOT NULL,
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('hackathon', 'grant')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  items_found INTEGER DEFAULT 0,
  items_created INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  items_unchanged INTEGER DEFAULT 0,
  error_message TEXT,
  error_stack TEXT,
  retry_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_source ON scrape_jobs(source);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_created_at ON scrape_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_entity_type ON scrape_jobs(entity_type);

-- Create view for latest job status per source
CREATE OR REPLACE VIEW latest_scrape_jobs AS
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

-- ============================================
-- Done!
-- ============================================
