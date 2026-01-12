export type CalendarEventType = "hackathon" | "grant";

export interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;

  // Common metadata
  chains: string[];
  categories: string[];

  // Hackathon specific
  prizePool?: {
    amount: number;
    currency: string;
  };
  format?: "online" | "in-person" | "hybrid";

  // Grant specific
  foundation?: string;
  isRolling?: boolean;

  // Links
  url: string;
  logoUrl?: string;
}

export interface CalendarFilter {
  types?: CalendarEventType[];
  chains?: string[];
  categories?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}
