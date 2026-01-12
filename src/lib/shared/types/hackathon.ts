export type HackathonSource =
  | "ethglobal"
  | "devfolio"
  | "dorahacks"
  | "devpost"
  | "taikai"
  | "hackerearth"
  | "coinlaunch";

export type HackathonFormat = "online" | "in-person" | "hybrid";

export type HackathonStatus =
  | "upcoming"
  | "registration_open"
  | "ongoing"
  | "judging"
  | "completed";

export interface PrizePool {
  amount: number;
  currency: string;
  breakdown?: PrizeBreakdown[];
}

export interface PrizeBreakdown {
  place: string;
  amount: number;
  currency: string;
  description?: string;
}

export interface Sponsor {
  name: string;
  logoUrl?: string;
  bountyAmount?: number;
  bountyDescription?: string;
}

export interface Location {
  city?: string;
  country?: string;
  venue?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface Hackathon {
  id: string;
  source: HackathonSource;
  sourceId: string;
  slug: string;

  name: string;
  description: string;
  shortDescription?: string;

  startDate: Date;
  endDate: Date;
  registrationStartDate?: Date;
  registrationEndDate?: Date;
  timezone?: string;

  format: HackathonFormat;
  location?: Location;

  prizePool?: PrizePool;

  chains: string[];
  categories: string[];
  themes?: string[];
  sponsors?: Sponsor[];

  registrationUrl: string;
  websiteUrl?: string;
  discordUrl?: string;
  telegramUrl?: string;
  twitterUrl?: string;

  logoUrl?: string;
  bannerUrl?: string;

  participantCount?: number;
  projectCount?: number;

  status: HackathonStatus;
  isOfficial?: boolean;
  isFeatured?: boolean;

  rawData?: Record<string, unknown>;
  contentHash?: string;
  createdAt: Date;
  updatedAt: Date;
  lastScrapedAt?: Date;
}

export interface HackathonFilter {
  status?: HackathonStatus[];
  format?: HackathonFormat[];
  chains?: string[];
  categories?: string[];
  source?: HackathonSource[];
  startDateFrom?: Date;
  startDateTo?: Date;
  minPrize?: number;
  search?: string;
}
