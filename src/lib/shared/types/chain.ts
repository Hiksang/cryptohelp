export type ChainType = "L1" | "L2" | "sidechain" | "appchain";

export interface Chain {
  id: number;
  chainId?: number; // EIP-155 chain ID (null for non-EVM)
  caip2?: string; // CAIP-2 identifier
  name: string;
  symbol: string;
  type: ChainType;
  evmCompatible: boolean;
  logoUrl?: string;
  explorerUrl?: string;
  websiteUrl?: string;
  aliases: string[];
}

export interface ChainMetadata {
  tvl?: number;
  developerCount?: number;
  transactionCount24h?: number;
}
