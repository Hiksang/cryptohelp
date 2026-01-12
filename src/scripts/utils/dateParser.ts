/**
 * Parse various date formats commonly used on hackathon/event websites
 */

const MONTHS: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

/**
 * Parse ordinal date format like "Nov 15th, 2024" or "Sep 26th, 2025Sep 28th, 2025"
 */
export function parseOrdinalDate(text: string): ParsedDateRange | null {
  if (!text) return null;

  // Match pattern: "Mon DDth, YYYY" (with optional second date)
  // Examples: "Nov 15th, 2024", "Sep 26th, 2025Sep 28th, 2025"
  const pattern = /([A-Za-z]{3,})\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})/gi;
  const matches = [...text.matchAll(pattern)];

  if (matches.length === 0) return null;

  const parseMatch = (match: RegExpMatchArray): Date | null => {
    const monthStr = match[1].toLowerCase();
    const day = parseInt(match[2]);
    const year = parseInt(match[3]);

    const month = MONTHS[monthStr] ?? MONTHS[monthStr.slice(0, 3)];
    if (month === undefined) return null;

    return new Date(year, month, day);
  };

  const startDate = parseMatch(matches[0]);
  if (!startDate) return null;

  // If there's a second date, use it as end date
  const endDate = matches.length > 1 ? parseMatch(matches[1]) : startDate;

  return {
    startDate: startDate.toISOString(),
    endDate: (endDate || startDate).toISOString(),
  };
}

interface ParsedDateRange {
  startDate: string;
  endDate: string;
}

/**
 * Parse a date range string into ISO date strings
 * Handles formats like:
 * - "Jan 15 - 17, 2026"
 * - "January 15-17, 2026"
 * - "Jan 15, 2026 - Jan 17, 2026"
 * - "15-17 January 2026"
 * - "2026-01-15"
 */
export function parseDateRange(dateText: string): ParsedDateRange | null {
  if (!dateText) return null;

  const text = dateText.trim().toLowerCase();

  // Try ISO format first (2026-01-15)
  const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const date = new Date(text);
    if (!isNaN(date.getTime())) {
      return {
        startDate: date.toISOString(),
        endDate: date.toISOString(),
      };
    }
  }

  // Extract year
  const yearMatch = text.match(/\b(202\d)\b/);
  const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();

  // Find month
  let month: number | null = null;
  let monthEndIndex = 0;
  for (const [name, idx] of Object.entries(MONTHS)) {
    const monthIndex = text.indexOf(name);
    if (monthIndex !== -1) {
      month = idx;
      monthEndIndex = monthIndex + name.length;
      break;
    }
  }

  if (month === null) return null;

  // Extract day numbers after the month
  const afterMonth = text.slice(monthEndIndex);
  const dayMatches = afterMonth.match(/(\d{1,2})\s*[-–—to]+\s*(\d{1,2})/);

  if (dayMatches) {
    const startDay = parseInt(dayMatches[1]);
    const endDay = parseInt(dayMatches[2]);

    const startDate = new Date(year, month, startDay);
    const endDate = new Date(year, month, endDay);

    // Handle month rollover (e.g., Jan 30 - Feb 2)
    if (endDay < startDay) {
      endDate.setMonth(month + 1);
    }

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }

  // Single date (e.g., "January 15, 2026")
  const singleDayMatch = afterMonth.match(/(\d{1,2})/);
  if (singleDayMatch) {
    const day = parseInt(singleDayMatch[1]);
    const date = new Date(year, month, day);
    return {
      startDate: date.toISOString(),
      endDate: date.toISOString(),
    };
  }

  return null;
}

/**
 * Parse date with format before month (e.g., "15-17 January 2026")
 */
export function parseDateRangeReverse(dateText: string): ParsedDateRange | null {
  if (!dateText) return null;

  const text = dateText.trim().toLowerCase();

  // Match "15-17 January 2026" or "15 - 17 January 2026"
  const match = text.match(/(\d{1,2})\s*[-–—to]+\s*(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (match) {
    const startDay = parseInt(match[1]);
    const endDay = parseInt(match[2]);
    const monthName = match[3];
    const year = parseInt(match[4]);

    const month = MONTHS[monthName];
    if (month !== undefined) {
      const startDate = new Date(year, month, startDay);
      const endDate = new Date(year, month, endDay);

      return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };
    }
  }

  return null;
}

/**
 * Try all date parsing strategies
 */
export function parseEventDates(dateText: string): ParsedDateRange | null {
  if (!dateText) return null;

  // Try ordinal format first (most common on ETHGlobal)
  let result = parseOrdinalDate(dateText);
  if (result) return result;

  // Try standard format
  result = parseDateRange(dateText);
  if (result) return result;

  // Try reverse format
  result = parseDateRangeReverse(dateText);
  if (result) return result;

  // Try parsing as natural language date
  const date = new Date(dateText);
  if (!isNaN(date.getTime()) && date.getFullYear() > 2020) {
    return {
      startDate: date.toISOString(),
      endDate: date.toISOString(),
    };
  }

  return null;
}
