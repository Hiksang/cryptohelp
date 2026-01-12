import type { Chain } from "../types/chain";

/**
 * Master list of supported blockchain chains.
 * Chain IDs follow EIP-155 for EVM chains.
 * Non-EVM chains use internal IDs (900+).
 */
export const CHAINS: Chain[] = [
  // Layer 1 - EVM
  {
    id: 1,
    chainId: 1,
    caip2: "eip155:1",
    name: "Ethereum",
    symbol: "ETH",
    type: "L1",
    evmCompatible: true,
    logoUrl: "/chains/ethereum.svg",
    explorerUrl: "https://etherscan.io",
    websiteUrl: "https://ethereum.org",
    aliases: ["ethereum", "eth", "ethereum mainnet", "mainnet"],
  },
  {
    id: 56,
    chainId: 56,
    caip2: "eip155:56",
    name: "BNB Chain",
    symbol: "BNB",
    type: "L1",
    evmCompatible: true,
    logoUrl: "/chains/bnb.svg",
    explorerUrl: "https://bscscan.com",
    websiteUrl: "https://www.bnbchain.org",
    aliases: ["bnb", "bsc", "binance", "binance smart chain", "bnb chain"],
  },
  {
    id: 137,
    chainId: 137,
    caip2: "eip155:137",
    name: "Polygon",
    symbol: "MATIC",
    type: "L1",
    evmCompatible: true,
    logoUrl: "/chains/polygon.svg",
    explorerUrl: "https://polygonscan.com",
    websiteUrl: "https://polygon.technology",
    aliases: ["polygon", "matic", "polygon pos", "polygon mainnet"],
  },
  {
    id: 43114,
    chainId: 43114,
    caip2: "eip155:43114",
    name: "Avalanche",
    symbol: "AVAX",
    type: "L1",
    evmCompatible: true,
    logoUrl: "/chains/avalanche.svg",
    explorerUrl: "https://snowtrace.io",
    websiteUrl: "https://www.avax.network",
    aliases: ["avalanche", "avax", "avalanche c-chain"],
  },
  {
    id: 250,
    chainId: 250,
    caip2: "eip155:250",
    name: "Fantom",
    symbol: "FTM",
    type: "L1",
    evmCompatible: true,
    logoUrl: "/chains/fantom.svg",
    explorerUrl: "https://ftmscan.com",
    websiteUrl: "https://fantom.foundation",
    aliases: ["fantom", "ftm"],
  },

  // Layer 1 - Non-EVM
  {
    id: 900,
    chainId: undefined,
    caip2: "solana:5eykt4UsFv8P",
    name: "Solana",
    symbol: "SOL",
    type: "L1",
    evmCompatible: false,
    logoUrl: "/chains/solana.svg",
    explorerUrl: "https://explorer.solana.com",
    websiteUrl: "https://solana.com",
    aliases: ["solana", "sol"],
  },
  {
    id: 901,
    chainId: undefined,
    caip2: "near:mainnet",
    name: "NEAR",
    symbol: "NEAR",
    type: "L1",
    evmCompatible: false,
    logoUrl: "/chains/near.svg",
    explorerUrl: "https://explorer.near.org",
    websiteUrl: "https://near.org",
    aliases: ["near", "near protocol"],
  },
  {
    id: 902,
    chainId: undefined,
    name: "Sui",
    symbol: "SUI",
    type: "L1",
    evmCompatible: false,
    logoUrl: "/chains/sui.svg",
    explorerUrl: "https://suiscan.xyz",
    websiteUrl: "https://sui.io",
    aliases: ["sui"],
  },
  {
    id: 903,
    chainId: undefined,
    name: "Aptos",
    symbol: "APT",
    type: "L1",
    evmCompatible: false,
    logoUrl: "/chains/aptos.svg",
    explorerUrl: "https://explorer.aptoslabs.com",
    websiteUrl: "https://aptosfoundation.org",
    aliases: ["aptos", "apt"],
  },
  {
    id: 904,
    chainId: undefined,
    caip2: "cosmos:cosmoshub-4",
    name: "Cosmos Hub",
    symbol: "ATOM",
    type: "L1",
    evmCompatible: false,
    logoUrl: "/chains/cosmos.svg",
    explorerUrl: "https://www.mintscan.io/cosmos",
    websiteUrl: "https://cosmos.network",
    aliases: ["cosmos", "atom", "cosmos hub"],
  },
  {
    id: 905,
    chainId: undefined,
    name: "Cardano",
    symbol: "ADA",
    type: "L1",
    evmCompatible: false,
    logoUrl: "/chains/cardano.svg",
    explorerUrl: "https://cardanoscan.io",
    websiteUrl: "https://cardano.org",
    aliases: ["cardano", "ada"],
  },

  // Layer 2 - Optimism Superchain
  {
    id: 10,
    chainId: 10,
    caip2: "eip155:10",
    name: "Optimism",
    symbol: "OP",
    type: "L2",
    evmCompatible: true,
    logoUrl: "/chains/optimism.svg",
    explorerUrl: "https://optimistic.etherscan.io",
    websiteUrl: "https://optimism.io",
    aliases: ["optimism", "op", "op mainnet"],
  },
  {
    id: 8453,
    chainId: 8453,
    caip2: "eip155:8453",
    name: "Base",
    symbol: "ETH",
    type: "L2",
    evmCompatible: true,
    logoUrl: "/chains/base.svg",
    explorerUrl: "https://basescan.org",
    websiteUrl: "https://base.org",
    aliases: ["base", "base mainnet", "coinbase"],
  },

  // Layer 2 - Arbitrum
  {
    id: 42161,
    chainId: 42161,
    caip2: "eip155:42161",
    name: "Arbitrum One",
    symbol: "ARB",
    type: "L2",
    evmCompatible: true,
    logoUrl: "/chains/arbitrum.svg",
    explorerUrl: "https://arbiscan.io",
    websiteUrl: "https://arbitrum.io",
    aliases: ["arbitrum", "arb", "arbitrum one"],
  },
  {
    id: 42170,
    chainId: 42170,
    caip2: "eip155:42170",
    name: "Arbitrum Nova",
    symbol: "ARB",
    type: "L2",
    evmCompatible: true,
    logoUrl: "/chains/arbitrum-nova.svg",
    explorerUrl: "https://nova.arbiscan.io",
    websiteUrl: "https://arbitrum.io",
    aliases: ["arbitrum nova", "nova"],
  },

  // Layer 2 - zkEVM
  {
    id: 324,
    chainId: 324,
    caip2: "eip155:324",
    name: "zkSync Era",
    symbol: "ETH",
    type: "L2",
    evmCompatible: true,
    logoUrl: "/chains/zksync.svg",
    explorerUrl: "https://explorer.zksync.io",
    websiteUrl: "https://zksync.io",
    aliases: ["zksync", "zksync era", "zk sync"],
  },
  {
    id: 59144,
    chainId: 59144,
    caip2: "eip155:59144",
    name: "Linea",
    symbol: "ETH",
    type: "L2",
    evmCompatible: true,
    logoUrl: "/chains/linea.svg",
    explorerUrl: "https://lineascan.build",
    websiteUrl: "https://linea.build",
    aliases: ["linea", "linea mainnet"],
  },
  {
    id: 534352,
    chainId: 534352,
    caip2: "eip155:534352",
    name: "Scroll",
    symbol: "ETH",
    type: "L2",
    evmCompatible: true,
    logoUrl: "/chains/scroll.svg",
    explorerUrl: "https://scrollscan.com",
    websiteUrl: "https://scroll.io",
    aliases: ["scroll"],
  },
  {
    id: 1101,
    chainId: 1101,
    caip2: "eip155:1101",
    name: "Polygon zkEVM",
    symbol: "ETH",
    type: "L2",
    evmCompatible: true,
    logoUrl: "/chains/polygon-zkevm.svg",
    explorerUrl: "https://zkevm.polygonscan.com",
    websiteUrl: "https://polygon.technology",
    aliases: ["polygon zkevm", "polygon hermez"],
  },

  // Other L2s
  {
    id: 169,
    chainId: 169,
    caip2: "eip155:169",
    name: "Manta Pacific",
    symbol: "ETH",
    type: "L2",
    evmCompatible: true,
    logoUrl: "/chains/manta.svg",
    explorerUrl: "https://pacific-explorer.manta.network",
    websiteUrl: "https://manta.network",
    aliases: ["manta", "manta pacific"],
  },
  {
    id: 81457,
    chainId: 81457,
    caip2: "eip155:81457",
    name: "Blast",
    symbol: "ETH",
    type: "L2",
    evmCompatible: true,
    logoUrl: "/chains/blast.svg",
    explorerUrl: "https://blastscan.io",
    websiteUrl: "https://blast.io",
    aliases: ["blast"],
  },
];

/**
 * Map chain name/alias to internal chain ID
 */
export const CHAIN_ALIAS_MAP: Map<string, number> = new Map(
  CHAINS.flatMap((chain) =>
    chain.aliases.map((alias) => [alias.toLowerCase(), chain.id])
  )
);

/**
 * Map internal chain ID to Chain object
 */
export const CHAIN_BY_ID: Map<number, Chain> = new Map(
  CHAINS.map((chain) => [chain.id, chain])
);

/**
 * Map EIP-155 chain ID to Chain object
 */
export const CHAIN_BY_CHAIN_ID: Map<number, Chain> = new Map(
  CHAINS.filter((chain) => chain.chainId !== undefined).map((chain) => [
    chain.chainId!,
    chain,
  ])
);
