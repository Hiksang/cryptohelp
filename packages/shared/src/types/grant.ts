export type GrantSource =
  | "ethereum_foundation"
  | "solana"
  | "near"
  | "polygon"
  | "arbitrum"
  | "optimism"
  | "sui"
  | "gitcoin"
  | "base";

export type GrantStatus = "active" | "upcoming" | "closed" | "paused";

export type FundingFormat = "fixed" | "range" | "negotiable" | "milestone-based";

export interface Foundation {
  name: string;
  chain: string;
  logoUrl?: string;
  websiteUrl?: string;
}

export interface Funding {
  minAmount?: number;
  maxAmount?: number;
  typicalAmount?: number;
  currency: string;
  totalPool?: number;
  format: FundingFormat;
}

export interface Eligibility {
  regions?: string[];
  requirements: string[];
  restrictions?: string[];
}

export interface Grant {
  id: string;
  source: GrantSource;
  sourceId: string;
  slug: string;

  foundation: Foundation;

  name: string;
  programName?: string;
  description: string;
  shortDescription?: string;

  funding?: Funding;

  applicationDeadline?: Date;
  programStartDate?: Date;
  programEndDate?: Date;
  isRolling: boolean;

  categories: string[];
  tracks?: string[];
  eligibility?: Eligibility;

  applicationUrl: string;
  guidelinesUrl?: string;
  faqUrl?: string;

  logoUrl?: string;
  bannerUrl?: string;

  status: GrantStatus;
  isFeatured?: boolean;

  rawData?: Record<string, unknown>;
  contentHash?: string;
  createdAt: Date;
  updatedAt: Date;
  lastScrapedAt?: Date;
}

export interface GrantFilter {
  status?: GrantStatus[];
  source?: GrantSource[];
  categories?: string[];
  chains?: string[];
  isRolling?: boolean;
  minFunding?: number;
  maxFunding?: number;
  deadlineFrom?: Date;
  deadlineTo?: Date;
  search?: string;
}
