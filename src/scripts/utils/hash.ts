import { createHash } from "crypto";

/**
 * Generate a content hash for change detection.
 * Only hashes significant fields to avoid false positives.
 */
export function generateContentHash(data: Record<string, unknown>): string {
  const significantFields = {
    name: data.name,
    description: data.description,
    startDate: data.startDate,
    endDate: data.endDate,
    prizePool: data.prizePool,
    status: data.status,
    registrationUrl: data.registrationUrl,
  };

  return createHash("sha256")
    .update(JSON.stringify(significantFields))
    .digest("hex");
}

/**
 * Generate a URL-friendly slug from a string.
 */
export function generateSlug(name: string, source: string, id: string): string {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);

  return `${baseSlug}-${source}-${id.substring(0, 8)}`;
}
