-- Create chains table for blockchain metadata
CREATE TABLE IF NOT EXISTS chains (
  id SERIAL PRIMARY KEY,
  chain_id INTEGER,                          -- EIP-155 chain ID (nullable for non-EVM)
  caip2 VARCHAR(100),                        -- CAIP-2 identifier
  name VARCHAR(100) NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('L1', 'L2', 'sidechain', 'appchain')),
  evm_compatible BOOLEAN DEFAULT false,
  logo_url TEXT,
  explorer_url TEXT,
  website_url TEXT,
  aliases TEXT[] DEFAULT '{}',               -- Array of name aliases for normalization
  metadata JSONB DEFAULT '{}',               -- Additional metadata (TVL, developer count, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(chain_id),
  UNIQUE(name)
);

-- Create index for alias lookups
CREATE INDEX idx_chains_aliases ON chains USING GIN(aliases);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chains_updated_at
  BEFORE UPDATE ON chains
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert initial chain data
INSERT INTO chains (id, chain_id, caip2, name, symbol, type, evm_compatible, aliases) VALUES
  -- Layer 1 - EVM
  (1, 1, 'eip155:1', 'Ethereum', 'ETH', 'L1', true, ARRAY['ethereum', 'eth', 'ethereum mainnet', 'mainnet']),
  (56, 56, 'eip155:56', 'BNB Chain', 'BNB', 'L1', true, ARRAY['bnb', 'bsc', 'binance', 'binance smart chain', 'bnb chain']),
  (137, 137, 'eip155:137', 'Polygon', 'MATIC', 'L1', true, ARRAY['polygon', 'matic', 'polygon pos', 'polygon mainnet']),
  (43114, 43114, 'eip155:43114', 'Avalanche', 'AVAX', 'L1', true, ARRAY['avalanche', 'avax', 'avalanche c-chain']),

  -- Layer 1 - Non-EVM
  (900, NULL, 'solana:mainnet', 'Solana', 'SOL', 'L1', false, ARRAY['solana', 'sol']),
  (901, NULL, 'near:mainnet', 'NEAR', 'NEAR', 'L1', false, ARRAY['near', 'near protocol']),
  (902, NULL, NULL, 'Sui', 'SUI', 'L1', false, ARRAY['sui']),
  (903, NULL, NULL, 'Aptos', 'APT', 'L1', false, ARRAY['aptos', 'apt']),
  (904, NULL, 'cosmos:cosmoshub-4', 'Cosmos Hub', 'ATOM', 'L1', false, ARRAY['cosmos', 'atom', 'cosmos hub']),

  -- Layer 2 - Optimism Superchain
  (10, 10, 'eip155:10', 'Optimism', 'OP', 'L2', true, ARRAY['optimism', 'op', 'op mainnet']),
  (8453, 8453, 'eip155:8453', 'Base', 'ETH', 'L2', true, ARRAY['base', 'base mainnet', 'coinbase']),

  -- Layer 2 - Arbitrum
  (42161, 42161, 'eip155:42161', 'Arbitrum One', 'ARB', 'L2', true, ARRAY['arbitrum', 'arb', 'arbitrum one']),
  (42170, 42170, 'eip155:42170', 'Arbitrum Nova', 'ARB', 'L2', true, ARRAY['arbitrum nova', 'nova']),

  -- Layer 2 - zkEVM
  (324, 324, 'eip155:324', 'zkSync Era', 'ETH', 'L2', true, ARRAY['zksync', 'zksync era', 'zk sync']),
  (59144, 59144, 'eip155:59144', 'Linea', 'ETH', 'L2', true, ARRAY['linea', 'linea mainnet']),
  (534352, 534352, 'eip155:534352', 'Scroll', 'ETH', 'L2', true, ARRAY['scroll']),
  (1101, 1101, 'eip155:1101', 'Polygon zkEVM', 'ETH', 'L2', true, ARRAY['polygon zkevm', 'polygon hermez']),

  -- Other L2s
  (81457, 81457, 'eip155:81457', 'Blast', 'ETH', 'L2', true, ARRAY['blast']);
