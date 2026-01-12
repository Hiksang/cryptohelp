/**
 * Standard hackathon/grant categories
 */
export const CATEGORIES = [
  { id: "defi", name: "DeFi", description: "Decentralized Finance" },
  { id: "nft", name: "NFT", description: "Non-Fungible Tokens & Digital Collectibles" },
  { id: "gaming", name: "Gaming", description: "Blockchain Games & GameFi" },
  { id: "dao", name: "DAO", description: "Decentralized Autonomous Organizations" },
  { id: "infrastructure", name: "Infrastructure", description: "Developer Tools & Infrastructure" },
  { id: "social", name: "Social", description: "Social Networks & SocialFi" },
  { id: "privacy", name: "Privacy", description: "Privacy & Zero-Knowledge" },
  { id: "identity", name: "Identity", description: "Digital Identity & Credentials" },
  { id: "payments", name: "Payments", description: "Payment Solutions & Stablecoins" },
  { id: "ai", name: "AI", description: "Artificial Intelligence & ML" },
  { id: "rwa", name: "RWA", description: "Real World Assets" },
  { id: "security", name: "Security", description: "Security & Auditing" },
  { id: "education", name: "Education", description: "Education & Onboarding" },
  { id: "public-goods", name: "Public Goods", description: "Public Goods & Open Source" },
  { id: "metaverse", name: "Metaverse", description: "Virtual Worlds & XR" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

/**
 * Category alias normalization
 */
export const CATEGORY_ALIASES: Record<string, CategoryId> = {
  // DeFi
  "decentralized finance": "defi",
  "defi": "defi",
  "finance": "defi",
  "lending": "defi",
  "dex": "defi",
  "amm": "defi",
  "yield": "defi",

  // NFT
  "nft": "nft",
  "nfts": "nft",
  "collectibles": "nft",
  "digital art": "nft",
  "art": "nft",

  // Gaming
  "gaming": "gaming",
  "gamefi": "gaming",
  "games": "gaming",
  "play to earn": "gaming",
  "p2e": "gaming",

  // DAO
  "dao": "dao",
  "governance": "dao",
  "daos": "dao",

  // Infrastructure
  "infrastructure": "infrastructure",
  "infra": "infrastructure",
  "developer tools": "infrastructure",
  "tooling": "infrastructure",
  "sdk": "infrastructure",
  "api": "infrastructure",

  // Social
  "social": "social",
  "socialfi": "social",
  "social network": "social",
  "community": "social",

  // Privacy
  "privacy": "privacy",
  "zk": "privacy",
  "zero knowledge": "privacy",
  "zkp": "privacy",

  // Identity
  "identity": "identity",
  "did": "identity",
  "credentials": "identity",
  "kyc": "identity",

  // Payments
  "payments": "payments",
  "stablecoin": "payments",
  "stablecoins": "payments",
  "remittance": "payments",

  // AI
  "ai": "ai",
  "artificial intelligence": "ai",
  "machine learning": "ai",
  "ml": "ai",

  // RWA
  "rwa": "rwa",
  "real world assets": "rwa",
  "tokenization": "rwa",

  // Security
  "security": "security",
  "audit": "security",
  "auditing": "security",

  // Education
  "education": "education",
  "onboarding": "education",
  "learning": "education",

  // Public Goods
  "public goods": "public-goods",
  "open source": "public-goods",
  "oss": "public-goods",

  // Metaverse
  "metaverse": "metaverse",
  "virtual world": "metaverse",
  "vr": "metaverse",
  "xr": "metaverse",
};
