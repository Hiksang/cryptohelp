import { PlaywrightCrawler } from "crawlee";
import { supabase } from "../../config/supabase.js";
import { generateContentHash, generateSlug } from "../../utils/hash.js";
import { normalizeChains } from "../../utils/chainNormalizer.js";
import type { GrantStatus } from "@buidltown/shared";

interface FoundationGrant {
  name: string;
  slug: string;
  foundation: {
    name: string;
    chain: string;
    websiteUrl: string;
    logoUrl?: string;
  };
  description: string;
  shortDescription?: string;
  funding?: {
    minAmount?: number;
    maxAmount?: number;
    currency: string;
    format: "fixed" | "range" | "negotiable" | "milestone-based";
    totalPool?: number;
  };
  categories: string[];
  tracks: string[];
  applicationUrl: string;
  guidelinesUrl?: string;
  isRolling: boolean;
  status: GrantStatus;
}

interface GrantSource {
  name: string;
  chain: string;
  url: string;
  logoUrl?: string;
  grants: Omit<FoundationGrant, "foundation">[];
}

/**
 * Curated list of known foundation grant programs
 */
const KNOWN_GRANTS: GrantSource[] = [
  {
    name: "Ethereum Foundation",
    chain: "Ethereum",
    url: "https://ethereum.org/en/community/grants/",
    logoUrl: "https://ethereum.org/static/a183661dd70e0e5c70689a0ec95ef0ba/13c43/eth-diamond-purple.png",
    grants: [
      {
        name: "Ethereum Foundation Grants",
        slug: "ef-grants",
        description: "The Ethereum Foundation provides grants to teams working on projects that strengthen Ethereum's foundations and core infrastructure. Focus areas include consensus layer, execution layer, cryptography, and developer tooling.",
        shortDescription: "Grants for Ethereum core infrastructure and public goods",
        funding: { minAmount: 10000, maxAmount: 500000, currency: "USD", format: "range" },
        categories: ["Infrastructure", "Research", "Public Goods"],
        tracks: ["Protocol Development", "Applied ZK", "Cryptography", "Formal Verification"],
        applicationUrl: "https://esp.ethereum.foundation/",
        guidelinesUrl: "https://esp.ethereum.foundation/applicants",
        isRolling: true,
        status: "active",
      },
      {
        name: "Ethereum Protocol Fellowship",
        slug: "ef-fellowship",
        description: "A program designed to onboard developers into Ethereum's protocol development. Fellows work on core protocol improvements under mentorship from experienced contributors.",
        shortDescription: "Fellowship for Ethereum protocol developers",
        funding: { minAmount: 30000, maxAmount: 50000, currency: "USD", format: "fixed" },
        categories: ["Education", "Infrastructure"],
        tracks: ["Core Development"],
        applicationUrl: "https://github.com/eth-protocol-fellows/cohort-five",
        isRolling: false,
        status: "active",
      },
    ],
  },
  {
    name: "Arbitrum Foundation",
    chain: "Arbitrum",
    url: "https://arbitrum.foundation/grants",
    grants: [
      {
        name: "Arbitrum Foundation Grants",
        slug: "arbitrum-grants",
        description: "The Arbitrum Foundation supports projects building on Arbitrum through grants. Focus on DeFi, gaming, NFTs, and developer tooling that enhance the Arbitrum ecosystem.",
        shortDescription: "Grants for building on Arbitrum L2",
        funding: { minAmount: 5000, maxAmount: 250000, currency: "USD", format: "range" },
        categories: ["DeFi", "Gaming", "Infrastructure", "NFT"],
        tracks: ["DeFi", "Gaming", "Infrastructure", "Social"],
        applicationUrl: "https://arbitrum.foundation/grants",
        isRolling: true,
        status: "active",
      },
      {
        name: "Arbitrum STIP (Short-Term Incentive Program)",
        slug: "arbitrum-stip",
        description: "ARB token incentive program for protocols building on Arbitrum. Designed to bootstrap liquidity and user growth for DeFi applications.",
        shortDescription: "ARB incentives for Arbitrum protocols",
        funding: { currency: "ARB", format: "milestone-based" },
        categories: ["DeFi"],
        tracks: ["DeFi", "Liquidity"],
        applicationUrl: "https://forum.arbitrum.foundation/",
        isRolling: false,
        status: "active",
      },
    ],
  },
  {
    name: "Optimism Foundation",
    chain: "Optimism",
    url: "https://app.optimism.io/retropgf",
    grants: [
      {
        name: "Optimism RetroPGF",
        slug: "optimism-retropgf",
        description: "Retroactive Public Goods Funding rewards projects that have already delivered value to the Optimism Collective. Funded by OP token allocations.",
        shortDescription: "Retroactive funding for Optimism public goods",
        funding: { currency: "OP", format: "milestone-based", totalPool: 10000000 },
        categories: ["Public Goods", "Infrastructure"],
        tracks: ["Developer Tooling", "Education", "Infrastructure"],
        applicationUrl: "https://app.optimism.io/retropgf",
        isRolling: false,
        status: "active",
      },
      {
        name: "Optimism Grants Council",
        slug: "optimism-grants-council",
        description: "Builder grants for teams developing on Optimism. Focus on growth experiments, developer tools, and ecosystem expansion.",
        shortDescription: "Builder grants for Optimism ecosystem",
        funding: { minAmount: 5000, maxAmount: 250000, currency: "OP", format: "range" },
        categories: ["Infrastructure", "DeFi", "Gaming"],
        tracks: ["Builder Grants", "Growth Experiments"],
        applicationUrl: "https://app.charmverse.io/op-grants/",
        isRolling: true,
        status: "active",
      },
    ],
  },
  {
    name: "Polygon Labs",
    chain: "Polygon",
    url: "https://polygon.technology/ecosystem/grants",
    grants: [
      {
        name: "Polygon Village Grants",
        slug: "polygon-village",
        description: "Grants for builders in the Polygon ecosystem. Supports DeFi, gaming, enterprise, and infrastructure projects with funding and ecosystem support.",
        shortDescription: "Ecosystem grants for Polygon builders",
        funding: { minAmount: 5000, maxAmount: 100000, currency: "USD", format: "range" },
        categories: ["DeFi", "Gaming", "Enterprise", "Infrastructure"],
        tracks: ["DeFi", "Gaming", "Enterprise", "zkEVM"],
        applicationUrl: "https://polygon.technology/ecosystem/grants",
        isRolling: true,
        status: "active",
      },
    ],
  },
  {
    name: "Base",
    chain: "Base",
    url: "https://base.org/grants",
    grants: [
      {
        name: "Base Ecosystem Fund",
        slug: "base-ecosystem-fund",
        description: "Base invests in and supports projects building on Base. Focus on consumer apps, DeFi, and onchain social applications.",
        shortDescription: "Coinbase-backed grants for Base ecosystem",
        funding: { minAmount: 10000, maxAmount: 500000, currency: "USD", format: "range" },
        categories: ["DeFi", "Social", "Consumer"],
        tracks: ["Consumer Apps", "DeFi", "Onchain Social"],
        applicationUrl: "https://base.org/grants",
        isRolling: true,
        status: "active",
      },
      {
        name: "Base Onchain Summer Builder Grants",
        slug: "base-onchain-summer",
        description: "Grants for builders participating in Onchain Summer, Base's flagship event for consumer crypto adoption.",
        shortDescription: "Seasonal grants for Base builders",
        funding: { minAmount: 1000, maxAmount: 25000, currency: "USD", format: "range" },
        categories: ["Consumer", "Social", "NFT"],
        tracks: ["Consumer Apps"],
        applicationUrl: "https://base.org/",
        isRolling: false,
        status: "active",
      },
    ],
  },
  {
    name: "Solana Foundation",
    chain: "Solana",
    url: "https://solana.org/grants",
    grants: [
      {
        name: "Solana Foundation Grants",
        slug: "solana-grants",
        description: "The Solana Foundation provides grants to teams building on Solana. Focus areas include DeFi, NFTs, gaming, and developer tooling.",
        shortDescription: "Grants for Solana ecosystem development",
        funding: { minAmount: 5000, maxAmount: 500000, currency: "USD", format: "range" },
        categories: ["DeFi", "NFT", "Gaming", "Infrastructure"],
        tracks: ["DeFi", "NFT", "Gaming", "Infrastructure", "Mobile"],
        applicationUrl: "https://solana.org/grants",
        isRolling: true,
        status: "active",
      },
    ],
  },
  {
    name: "NEAR Foundation",
    chain: "NEAR",
    url: "https://near.org/ecosystem/get-funding",
    grants: [
      {
        name: "NEAR Foundation Grants",
        slug: "near-grants",
        description: "NEAR Foundation provides funding for projects building on NEAR Protocol. Focus on usability, scalability, and bringing Web3 to mainstream users.",
        shortDescription: "Grants for NEAR ecosystem builders",
        funding: { minAmount: 10000, maxAmount: 250000, currency: "USD", format: "range" },
        categories: ["Infrastructure", "DeFi", "Social"],
        tracks: ["DeFi", "Gaming", "Social", "Infrastructure"],
        applicationUrl: "https://near.org/ecosystem/get-funding",
        isRolling: true,
        status: "active",
      },
    ],
  },
  {
    name: "Sui Foundation",
    chain: "Sui",
    url: "https://sui.io/grants",
    grants: [
      {
        name: "Sui Grants Program",
        slug: "sui-grants",
        description: "Sui Foundation supports builders creating innovative applications on Sui. Focus on Move development, gaming, DeFi, and infrastructure.",
        shortDescription: "Grants for Sui ecosystem development",
        funding: { minAmount: 10000, maxAmount: 500000, currency: "USD", format: "range" },
        categories: ["DeFi", "Gaming", "Infrastructure"],
        tracks: ["Gaming", "DeFi", "Move Development"],
        applicationUrl: "https://sui.io/grants",
        isRolling: true,
        status: "active",
      },
    ],
  },
  {
    name: "Aptos Foundation",
    chain: "Aptos",
    url: "https://aptosfoundation.org/grants",
    grants: [
      {
        name: "Aptos Grants Program",
        slug: "aptos-grants",
        description: "Aptos Foundation provides grants for projects building on Aptos. Focus on Move smart contracts, DeFi, gaming, and infrastructure.",
        shortDescription: "Grants for Aptos ecosystem builders",
        funding: { minAmount: 10000, maxAmount: 500000, currency: "USD", format: "range" },
        categories: ["DeFi", "Gaming", "Infrastructure"],
        tracks: ["DeFi", "Gaming", "Move Development", "Infrastructure"],
        applicationUrl: "https://aptosfoundation.org/grants",
        isRolling: true,
        status: "active",
      },
    ],
  },
  {
    name: "zkSync",
    chain: "zkSync",
    url: "https://zksync.io/explore#grants",
    grants: [
      {
        name: "zkSync Era Grants",
        slug: "zksync-grants",
        description: "zkSync provides grants for teams building on zkSync Era. Focus on DeFi, account abstraction, and ZK-powered applications.",
        shortDescription: "Grants for zkSync Era ecosystem",
        funding: { minAmount: 5000, maxAmount: 200000, currency: "USD", format: "range" },
        categories: ["DeFi", "Infrastructure"],
        tracks: ["DeFi", "Account Abstraction", "ZK Applications"],
        applicationUrl: "https://matterlabs.notion.site/zkSync-Ecosystem-Grants-Program-7f9b36e8cd104ea79efbc28cc21bdf2b",
        isRolling: true,
        status: "active",
      },
    ],
  },
  {
    name: "Scroll",
    chain: "Scroll",
    url: "https://scroll.io/",
    grants: [
      {
        name: "Scroll Grants Program",
        slug: "scroll-grants",
        description: "Scroll provides grants for builders deploying on Scroll's zkEVM. Focus on DeFi, developer tools, and infrastructure projects.",
        shortDescription: "Grants for Scroll zkEVM ecosystem",
        funding: { minAmount: 5000, maxAmount: 150000, currency: "USD", format: "range" },
        categories: ["DeFi", "Infrastructure"],
        tracks: ["DeFi", "Developer Tools", "Infrastructure"],
        applicationUrl: "https://scroll.io/",
        isRolling: true,
        status: "active",
      },
    ],
  },
  {
    name: "Linea",
    chain: "Linea",
    url: "https://linea.build/",
    grants: [
      {
        name: "Linea Ecosystem Grants",
        slug: "linea-grants",
        description: "Linea, powered by ConsenSys, provides grants for projects building on Linea's zkEVM. Focus on DeFi, gaming, and consumer applications.",
        shortDescription: "ConsenSys-backed grants for Linea builders",
        funding: { minAmount: 5000, maxAmount: 200000, currency: "USD", format: "range" },
        categories: ["DeFi", "Gaming", "Consumer"],
        tracks: ["DeFi", "Gaming", "Consumer Apps"],
        applicationUrl: "https://linea.build/ecosystem",
        isRolling: true,
        status: "active",
      },
    ],
  },
  {
    name: "Cosmos Hub",
    chain: "Cosmos",
    url: "https://cosmos.network/community",
    grants: [
      {
        name: "Interchain Foundation Grants",
        slug: "icf-grants",
        description: "The Interchain Foundation provides grants for projects building in the Cosmos ecosystem. Focus on IBC development, Cosmos SDK improvements, and cross-chain infrastructure.",
        shortDescription: "Grants for Cosmos and IBC ecosystem",
        funding: { minAmount: 10000, maxAmount: 500000, currency: "USD", format: "range" },
        categories: ["Infrastructure", "Research"],
        tracks: ["IBC", "Cosmos SDK", "Cross-chain"],
        applicationUrl: "https://interchain.io/",
        isRolling: true,
        status: "active",
      },
    ],
  },
  {
    name: "Avalanche",
    chain: "Avalanche",
    url: "https://www.avax.network/community",
    grants: [
      {
        name: "Avalanche Foundation Grants",
        slug: "avalanche-grants",
        description: "Avalanche Foundation supports projects building on Avalanche. Focus on subnets, DeFi, gaming, and enterprise applications.",
        shortDescription: "Grants for Avalanche ecosystem development",
        funding: { minAmount: 10000, maxAmount: 300000, currency: "USD", format: "range" },
        categories: ["DeFi", "Gaming", "Enterprise", "Infrastructure"],
        tracks: ["Subnets", "DeFi", "Gaming", "Enterprise"],
        applicationUrl: "https://www.avax.network/community",
        isRolling: true,
        status: "active",
      },
    ],
  },
  // Additional chains from DefiLlama
  {
    name: "BNB Chain",
    chain: "BNB Chain",
    url: "https://www.bnbchain.org/en/developers/developer-programs",
    grants: [
      {
        name: "BNB Chain Grants",
        slug: "bnb-grants",
        description: "BNB Chain provides grants for projects building on BNB Smart Chain and opBNB. Focus on DeFi, GameFi, and infrastructure.",
        shortDescription: "Grants for BNB Chain ecosystem builders",
        funding: { minAmount: 10000, maxAmount: 100000, currency: "USD", format: "range" },
        categories: ["DeFi", "Gaming", "Infrastructure"],
        tracks: ["DeFi", "GameFi", "Infrastructure", "opBNB"],
        applicationUrl: "https://www.bnbchain.org/en/developers/developer-programs",
        isRolling: true,
        status: "active",
      },
      {
        name: "BNB Chain MVB Program",
        slug: "bnb-mvb",
        description: "Most Valuable Builder (MVB) accelerator program for promising projects on BNB Chain with mentorship and funding support.",
        shortDescription: "BNB Chain accelerator program",
        funding: { minAmount: 10000, maxAmount: 300000, currency: "USD", format: "range" },
        categories: ["DeFi", "Gaming", "Infrastructure"],
        tracks: ["Accelerator", "DeFi", "GameFi"],
        applicationUrl: "https://www.bnbchain.org/en/bsc-mvb-program",
        isRolling: false,
        status: "active",
      },
    ],
  },
  {
    name: "Starknet Foundation",
    chain: "Starknet",
    url: "https://www.starknet.io/grants/",
    grants: [
      {
        name: "Starknet Grants",
        slug: "starknet-grants",
        description: "Starknet Foundation provides grants for projects building on Starknet's ZK-rollup. Focus on Cairo development, DeFi, and infrastructure.",
        shortDescription: "Grants for Starknet ZK-rollup ecosystem",
        funding: { minAmount: 5000, maxAmount: 250000, currency: "USD", format: "range" },
        categories: ["DeFi", "Infrastructure", "Research"],
        tracks: ["Cairo Development", "DeFi", "Infrastructure", "ZK Research"],
        applicationUrl: "https://www.starknet.io/grants/",
        isRolling: true,
        status: "active",
      },
      {
        name: "Starknet Seed Grants",
        slug: "starknet-seed",
        description: "Smaller grants for early-stage projects and experiments on Starknet. Ideal for hackathon winners and indie developers.",
        shortDescription: "Seed grants for early Starknet projects",
        funding: { minAmount: 1000, maxAmount: 25000, currency: "USD", format: "range" },
        categories: ["DeFi", "Infrastructure", "Education"],
        tracks: ["Experiments", "Hackathon Projects", "Open Source"],
        applicationUrl: "https://www.starknet.io/grants/",
        isRolling: true,
        status: "active",
      },
    ],
  },
  {
    name: "Fantom Foundation",
    chain: "Fantom",
    url: "https://fantom.foundation/grants/",
    grants: [
      {
        name: "Fantom Grants",
        slug: "fantom-grants",
        description: "Fantom Foundation provides grants for projects building on Fantom Opera and Sonic. Focus on DeFi, infrastructure, and ecosystem tools.",
        shortDescription: "Grants for Fantom ecosystem development",
        funding: { minAmount: 5000, maxAmount: 200000, currency: "USD", format: "range" },
        categories: ["DeFi", "Infrastructure"],
        tracks: ["DeFi", "Infrastructure", "Sonic"],
        applicationUrl: "https://fantom.foundation/grants/",
        isRolling: true,
        status: "active",
      },
    ],
  },
  {
    name: "Mantle",
    chain: "Mantle",
    url: "https://www.mantle.xyz/grants",
    grants: [
      {
        name: "Mantle Grants Program",
        slug: "mantle-grants",
        description: "Mantle provides grants for builders on Mantle Network. Focus on DeFi, gaming, and consumer applications leveraging Mantle's L2.",
        shortDescription: "Grants for Mantle L2 ecosystem",
        funding: { minAmount: 10000, maxAmount: 500000, currency: "USD", format: "range" },
        categories: ["DeFi", "Gaming", "Consumer"],
        tracks: ["DeFi", "Gaming", "Infrastructure", "Consumer Apps"],
        applicationUrl: "https://www.mantle.xyz/grants",
        isRolling: true,
        status: "active",
      },
      {
        name: "Mantle EcoFund",
        slug: "mantle-ecofund",
        description: "Mantle's $200M ecosystem fund for strategic investments in projects building on Mantle Network.",
        shortDescription: "Strategic investments for Mantle builders",
        funding: { minAmount: 100000, maxAmount: 5000000, currency: "USD", format: "range", totalPool: 200000000 },
        categories: ["DeFi", "Infrastructure"],
        tracks: ["Strategic Investment", "DeFi", "Infrastructure"],
        applicationUrl: "https://www.mantle.xyz/grants",
        isRolling: true,
        status: "active",
      },
    ],
  },
  {
    name: "Blast",
    chain: "Blast",
    url: "https://blast.io/",
    grants: [
      {
        name: "Blast Big Bang",
        slug: "blast-bigbang",
        description: "Blast's flagship competition and grants program for projects launching on Blast L2. Focuses on DeFi, NFTs, and social applications.",
        shortDescription: "Grants for Blast L2 builders",
        funding: { minAmount: 10000, maxAmount: 1000000, currency: "USD", format: "range" },
        categories: ["DeFi", "NFT", "Social"],
        tracks: ["DeFi", "NFTs", "SocialFi", "Gaming"],
        applicationUrl: "https://blast.io/bigbang",
        isRolling: false,
        status: "active",
      },
    ],
  },
  {
    name: "Mode Network",
    chain: "Mode",
    url: "https://www.mode.network/",
    grants: [
      {
        name: "Mode Grants",
        slug: "mode-grants",
        description: "Mode Network provides grants for DeFi builders on its Optimism-based L2. Focus on yield optimization and DeFi innovation.",
        shortDescription: "Grants for Mode DeFi ecosystem",
        funding: { minAmount: 5000, maxAmount: 100000, currency: "USD", format: "range" },
        categories: ["DeFi"],
        tracks: ["DeFi", "Yield", "Lending"],
        applicationUrl: "https://www.mode.network/",
        isRolling: true,
        status: "active",
      },
    ],
  },
  {
    name: "Celo Foundation",
    chain: "Celo",
    url: "https://celo.org/community",
    grants: [
      {
        name: "Celo Grants",
        slug: "celo-grants",
        description: "Celo Foundation provides grants for projects building mobile-first and ReFi applications on Celo. Focus on financial inclusion and sustainability.",
        shortDescription: "Grants for Celo mobile-first ecosystem",
        funding: { minAmount: 5000, maxAmount: 200000, currency: "USD", format: "range" },
        categories: ["DeFi", "Social", "Public Goods"],
        tracks: ["ReFi", "Mobile", "Financial Inclusion", "Climate"],
        applicationUrl: "https://celo.org/community",
        isRolling: true,
        status: "active",
      },
    ],
  },
  {
    name: "Gnosis",
    chain: "Gnosis",
    url: "https://www.gnosis.io/grants",
    grants: [
      {
        name: "Gnosis Grants",
        slug: "gnosis-grants",
        description: "Gnosis provides grants for projects building on Gnosis Chain. Focus on prediction markets, DAOs, and decentralized infrastructure.",
        shortDescription: "Grants for Gnosis Chain ecosystem",
        funding: { minAmount: 5000, maxAmount: 150000, currency: "USD", format: "range" },
        categories: ["DeFi", "DAO", "Infrastructure"],
        tracks: ["Prediction Markets", "DAOs", "Safe", "Infrastructure"],
        applicationUrl: "https://www.gnosis.io/grants",
        isRolling: true,
        status: "active",
      },
    ],
  },
  {
    name: "TON Foundation",
    chain: "TON",
    url: "https://ton.org/grants",
    grants: [
      {
        name: "TON Grants",
        slug: "ton-grants",
        description: "TON Foundation provides grants for projects building on The Open Network. Focus on Telegram Mini Apps, DeFi, and social applications.",
        shortDescription: "Grants for TON and Telegram ecosystem",
        funding: { minAmount: 5000, maxAmount: 500000, currency: "USD", format: "range" },
        categories: ["DeFi", "Social", "Gaming"],
        tracks: ["Telegram Mini Apps", "DeFi", "Gaming", "Social"],
        applicationUrl: "https://ton.org/grants",
        isRolling: true,
        status: "active",
      },
    ],
  },
  {
    name: "Sei Foundation",
    chain: "Sei",
    url: "https://www.sei.io/ecosystem",
    grants: [
      {
        name: "Sei Grants",
        slug: "sei-grants",
        description: "Sei Foundation provides grants for projects building on Sei, the fastest L1. Focus on DeFi, gaming, and high-performance applications.",
        shortDescription: "Grants for Sei high-performance L1",
        funding: { minAmount: 10000, maxAmount: 250000, currency: "USD", format: "range" },
        categories: ["DeFi", "Gaming", "Infrastructure"],
        tracks: ["DeFi", "Gaming", "NFT", "Infrastructure"],
        applicationUrl: "https://www.sei.io/ecosystem",
        isRolling: true,
        status: "active",
      },
    ],
  },
  {
    name: "Injective",
    chain: "Injective",
    url: "https://injective.com/grants",
    grants: [
      {
        name: "Injective Grants",
        slug: "injective-grants",
        description: "Injective provides grants for projects building DeFi applications on Injective. Focus on derivatives, trading, and financial infrastructure.",
        shortDescription: "Grants for Injective DeFi ecosystem",
        funding: { minAmount: 10000, maxAmount: 300000, currency: "USD", format: "range" },
        categories: ["DeFi", "Infrastructure"],
        tracks: ["Derivatives", "Trading", "DeFi", "Infrastructure"],
        applicationUrl: "https://injective.com/grants",
        isRolling: true,
        status: "active",
      },
    ],
  },
  {
    name: "Cronos",
    chain: "Cronos",
    url: "https://cronos.org/grants",
    grants: [
      {
        name: "Cronos Grants",
        slug: "cronos-grants",
        description: "Cronos, powered by Crypto.com, provides grants for DeFi and gaming projects. Focus on EVM-compatible applications.",
        shortDescription: "Crypto.com-backed grants for Cronos",
        funding: { minAmount: 5000, maxAmount: 200000, currency: "USD", format: "range" },
        categories: ["DeFi", "Gaming", "NFT"],
        tracks: ["DeFi", "Gaming", "NFT", "Infrastructure"],
        applicationUrl: "https://cronos.org/grants",
        isRolling: true,
        status: "active",
      },
    ],
  },
  {
    name: "Flow",
    chain: "Flow",
    url: "https://flow.com/ecosystemsupport",
    grants: [
      {
        name: "Flow Grants",
        slug: "flow-grants",
        description: "Flow provides grants for NFT, gaming, and consumer applications. Focus on mainstream adoption and user-friendly experiences.",
        shortDescription: "Grants for Flow NFT and gaming ecosystem",
        funding: { minAmount: 10000, maxAmount: 250000, currency: "USD", format: "range" },
        categories: ["NFT", "Gaming", "Consumer"],
        tracks: ["NFT", "Gaming", "Sports", "Entertainment"],
        applicationUrl: "https://flow.com/ecosystemsupport",
        isRolling: true,
        status: "active",
      },
    ],
  },
  {
    name: "Hedera",
    chain: "Hedera",
    url: "https://hedera.com/grants",
    grants: [
      {
        name: "Hedera Grants",
        slug: "hedera-grants",
        description: "Hedera provides grants for enterprise and DeFi applications. Focus on tokenization, supply chain, and sustainable technology.",
        shortDescription: "Enterprise-focused grants for Hedera",
        funding: { minAmount: 10000, maxAmount: 500000, currency: "USD", format: "range" },
        categories: ["Enterprise", "DeFi", "Infrastructure"],
        tracks: ["Enterprise", "DeFi", "Tokenization", "Sustainability"],
        applicationUrl: "https://hedera.com/grants",
        isRolling: true,
        status: "active",
      },
    ],
  },
  {
    name: "Algorand Foundation",
    chain: "Algorand",
    url: "https://algorand.foundation/grants-program",
    grants: [
      {
        name: "Algorand Grants",
        slug: "algorand-grants",
        description: "Algorand Foundation provides grants for DeFi, NFT, and infrastructure projects. Focus on sustainable and scalable applications.",
        shortDescription: "Grants for Algorand ecosystem development",
        funding: { minAmount: 10000, maxAmount: 300000, currency: "USD", format: "range" },
        categories: ["DeFi", "NFT", "Infrastructure"],
        tracks: ["DeFi", "NFT", "Gaming", "Infrastructure"],
        applicationUrl: "https://algorand.foundation/grants-program",
        isRolling: true,
        status: "active",
      },
    ],
  },
  {
    name: "Moonbeam",
    chain: "Moonbeam",
    url: "https://moonbeam.foundation/grants/",
    grants: [
      {
        name: "Moonbeam Grants",
        slug: "moonbeam-grants",
        description: "Moonbeam Foundation provides grants for cross-chain and EVM-compatible applications in the Polkadot ecosystem.",
        shortDescription: "Grants for Moonbeam Polkadot ecosystem",
        funding: { minAmount: 5000, maxAmount: 150000, currency: "USD", format: "range" },
        categories: ["DeFi", "Infrastructure"],
        tracks: ["Cross-chain", "DeFi", "XCM", "Infrastructure"],
        applicationUrl: "https://moonbeam.foundation/grants/",
        isRolling: true,
        status: "active",
      },
    ],
  },
  {
    name: "Metis",
    chain: "Metis",
    url: "https://www.metis.io/ecosystem",
    grants: [
      {
        name: "Metis Grants",
        slug: "metis-grants",
        description: "Metis provides grants for projects building on Metis L2. Focus on DeFi, DAOs, and decentralized storage applications.",
        shortDescription: "Grants for Metis L2 ecosystem",
        funding: { minAmount: 5000, maxAmount: 100000, currency: "USD", format: "range" },
        categories: ["DeFi", "DAO", "Infrastructure"],
        tracks: ["DeFi", "DAOs", "Storage", "Infrastructure"],
        applicationUrl: "https://www.metis.io/ecosystem",
        isRolling: true,
        status: "active",
      },
    ],
  },
  {
    name: "Manta Network",
    chain: "Manta",
    url: "https://manta.network/grants",
    grants: [
      {
        name: "Manta Grants",
        slug: "manta-grants",
        description: "Manta Network provides grants for privacy-preserving and ZK applications. Focus on DeFi privacy and infrastructure.",
        shortDescription: "Grants for Manta ZK ecosystem",
        funding: { minAmount: 5000, maxAmount: 150000, currency: "USD", format: "range" },
        categories: ["DeFi", "Infrastructure", "Research"],
        tracks: ["Privacy", "ZK", "DeFi", "Infrastructure"],
        applicationUrl: "https://manta.network/grants",
        isRolling: true,
        status: "active",
      },
    ],
  },
  {
    name: "Taiko",
    chain: "Taiko",
    url: "https://taiko.xyz/",
    grants: [
      {
        name: "Taiko Grants",
        slug: "taiko-grants",
        description: "Taiko provides grants for builders on its Type 1 zkEVM. Focus on Ethereum-equivalent applications and infrastructure.",
        shortDescription: "Grants for Taiko zkEVM ecosystem",
        funding: { minAmount: 5000, maxAmount: 100000, currency: "USD", format: "range" },
        categories: ["DeFi", "Infrastructure"],
        tracks: ["DeFi", "Infrastructure", "Developer Tools"],
        applicationUrl: "https://taiko.xyz/",
        isRolling: true,
        status: "active",
      },
    ],
  },
  {
    name: "ZetaChain",
    chain: "ZetaChain",
    url: "https://www.zetachain.com/grants",
    grants: [
      {
        name: "ZetaChain Grants",
        slug: "zetachain-grants",
        description: "ZetaChain provides grants for omnichain applications. Focus on cross-chain DeFi and universal smart contracts.",
        shortDescription: "Grants for ZetaChain omnichain ecosystem",
        funding: { minAmount: 5000, maxAmount: 200000, currency: "USD", format: "range" },
        categories: ["DeFi", "Infrastructure"],
        tracks: ["Omnichain", "Cross-chain", "DeFi", "Infrastructure"],
        applicationUrl: "https://www.zetachain.com/grants",
        isRolling: true,
        status: "active",
      },
    ],
  },
  {
    name: "Polkadot",
    chain: "Polkadot",
    url: "https://web3.foundation/grants/",
    grants: [
      {
        name: "Web3 Foundation Grants",
        slug: "web3-grants",
        description: "Web3 Foundation provides grants for projects building on Polkadot and Substrate. Focus on infrastructure and tooling.",
        shortDescription: "Grants for Polkadot and Substrate ecosystem",
        funding: { minAmount: 10000, maxAmount: 100000, currency: "USD", format: "range" },
        categories: ["Infrastructure", "Research"],
        tracks: ["Substrate", "Pallets", "Bridges", "Tooling"],
        applicationUrl: "https://web3.foundation/grants/",
        guidelinesUrl: "https://github.com/w3f/Grants-Program",
        isRolling: true,
        status: "active",
      },
      {
        name: "Polkadot Treasury",
        slug: "polkadot-treasury",
        description: "Polkadot Treasury funds projects through on-chain governance. Community-driven funding for ecosystem development.",
        shortDescription: "Community-governed Polkadot funding",
        funding: { currency: "DOT", format: "negotiable" },
        categories: ["Infrastructure", "Research", "Education"],
        tracks: ["Marketing", "Development", "Events", "Education"],
        applicationUrl: "https://polkadot.network/ecosystem/treasury/",
        isRolling: true,
        status: "active",
      },
    ],
  },
];

/**
 * Scraper for curated foundation grant programs
 * Uses predefined grant data for reliability
 */
export class FoundationGrantsScraper {
  private source = "foundation_grants";

  async run(): Promise<{ found: number; created: number; updated: number }> {
    let found = 0;
    let created = 0;
    let updated = 0;

    for (const source of KNOWN_GRANTS) {
      for (const grantInfo of source.grants) {
        const grant: FoundationGrant = {
          ...grantInfo,
          foundation: {
            name: source.name,
            chain: source.chain,
            websiteUrl: source.url,
            logoUrl: source.logoUrl,
          },
        };

        try {
          found++;
          const result = await this.saveGrant(grant);
          if (result === "created") created++;
          else if (result === "updated") updated++;
        } catch (error) {
          console.error(`Failed to save grant ${grant.name}:`, error);
        }
      }
    }

    return { found, created, updated };
  }

  private async saveGrant(grant: FoundationGrant): Promise<"created" | "updated" | "unchanged"> {
    const { chains, chainIds } = normalizeChains([grant.foundation.chain]);

    const grantData = {
      source: this.source,
      source_id: grant.slug,
      slug: generateSlug(grant.name, this.source, grant.slug),
      name: grant.name,
      program_name: null,
      description: grant.description || null,
      short_description: grant.shortDescription || null,
      foundation: grant.foundation,
      funding: grant.funding || null,
      application_deadline: null,
      program_start_date: null,
      program_end_date: null,
      is_rolling: grant.isRolling,
      categories: grant.categories,
      tracks: grant.tracks,
      eligibility: null,
      application_url: grant.applicationUrl,
      guidelines_url: grant.guidelinesUrl || null,
      faq_url: null,
      logo_url: grant.foundation.logoUrl || null,
      banner_url: null,
      status: grant.status,
      is_featured: false,
      chains,
      chain_ids: chainIds,
      raw_data: grant as unknown as Record<string, unknown>,
      content_hash: generateContentHash(grant as unknown as Record<string, unknown>),
      last_scraped_at: new Date().toISOString(),
    };

    // Check if exists
    const { data: existing } = await supabase
      .from("grants")
      .select("id, content_hash")
      .eq("source", this.source)
      .eq("source_id", grant.slug)
      .single();

    if (!existing) {
      const { error } = await supabase.from("grants").insert(grantData);
      if (error) throw error;
      return "created";
    }

    if (existing.content_hash !== grantData.content_hash) {
      const { error } = await supabase
        .from("grants")
        .update(grantData)
        .eq("id", existing.id);
      if (error) throw error;
      return "updated";
    }

    return "unchanged";
  }
}
