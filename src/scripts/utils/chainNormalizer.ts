import { CHAIN_ALIAS_MAP, CHAIN_BY_ID } from "../../lib/shared";

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
  const normalized = text.toLowerCase();

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
