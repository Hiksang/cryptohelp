// Chain definitions
interface Chain {
  id: number;
  name: string;
  symbol: string;
  aliases: string[];
}

const CHAINS: Chain[] = [
  { id: 1, name: "Ethereum", symbol: "ETH", aliases: ["ethereum", "eth", "mainnet"] },
  { id: 56, name: "BNB Chain", symbol: "BNB", aliases: ["bnb", "bsc", "binance", "bnb chain"] },
  { id: 137, name: "Polygon", symbol: "MATIC", aliases: ["polygon", "matic"] },
  { id: 43114, name: "Avalanche", symbol: "AVAX", aliases: ["avalanche", "avax"] },
  { id: 10, name: "Optimism", symbol: "OP", aliases: ["optimism", "op"] },
  { id: 8453, name: "Base", symbol: "ETH", aliases: ["base", "coinbase"] },
  { id: 42161, name: "Arbitrum", symbol: "ARB", aliases: ["arbitrum", "arb"] },
  { id: 324, name: "zkSync", symbol: "ETH", aliases: ["zksync", "zksync era"] },
  { id: 59144, name: "Linea", symbol: "ETH", aliases: ["linea"] },
  { id: 534352, name: "Scroll", symbol: "ETH", aliases: ["scroll"] },
  { id: 81457, name: "Blast", symbol: "ETH", aliases: ["blast"] },
  { id: 900, name: "Solana", symbol: "SOL", aliases: ["solana", "sol"] },
  { id: 901, name: "NEAR", symbol: "NEAR", aliases: ["near", "near protocol"] },
  { id: 902, name: "Sui", symbol: "SUI", aliases: ["sui"] },
  { id: 903, name: "Aptos", symbol: "APT", aliases: ["aptos", "apt"] },
];

// Create lookup maps
const CHAIN_ALIAS_MAP = new Map<string, number>();
const CHAIN_BY_ID = new Map<number, Chain>();

for (const chain of CHAINS) {
  CHAIN_BY_ID.set(chain.id, chain);
  for (const alias of chain.aliases) {
    CHAIN_ALIAS_MAP.set(alias.toLowerCase(), chain.id);
  }
}

/**
 * Normalize chain names from various sources to standard chain IDs.
 * Handles various spellings, abbreviations, and formats.
 */
export function normalizeChainName(rawName: string): number | null {
  const normalized = rawName.toLowerCase().trim();
  return CHAIN_ALIAS_MAP.get(normalized) ?? null;
}

/**
 * Normalize an array of chain names and return both names and IDs.
 */
export function normalizeChains(rawChains: string[]): {
  chains: string[];
  chainIds: number[];
} {
  const chains: string[] = [];
  const chainIds: number[] = [];

  for (const raw of rawChains) {
    const chainId = normalizeChainName(raw);
    if (chainId !== null) {
      const chain = CHAIN_BY_ID.get(chainId);
      if (chain) {
        chains.push(chain.name);
        chainIds.push(chain.id);
      }
    } else {
      // Keep unknown chains as-is for later review
      chains.push(raw);
    }
  }

  return { chains, chainIds };
}

/**
 * Extract chain names from text (descriptions, tags, etc.)
 */
export function extractChainsFromText(text: string): string[] {
  const extracted: string[] = [];

  // Common chain patterns
  const patterns = [
    /\bethereum\b/gi,
    /\bpolygon\b/gi,
    /\barbitrum\b/gi,
    /\boptimism\b/gi,
    /\bbase\b/gi,
    /\bsolana\b/gi,
    /\bnear\b/gi,
    /\bsui\b/gi,
    /\baptos\b/gi,
    /\bzksync\b/gi,
    /\blinea\b/gi,
    /\bscroll\b/gi,
    /\bblast\b/gi,
    /\bbnb\s*chain\b/gi,
    /\bavalanche\b/gi,
  ];

  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      for (const match of matches) {
        if (!extracted.some((e) => e.toLowerCase() === match.toLowerCase())) {
          extracted.push(match);
        }
      }
    }
  }

  return extracted;
}
