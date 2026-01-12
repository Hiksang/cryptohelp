"use client";

import Link from "next/link";
import { usePostHog } from "posthog-js/react";
import { format } from "date-fns";
import { Calendar, MapPin, Globe, Users, Trophy, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { HackathonRow } from "@/lib/hooks/useHackathons";

interface HackathonCardProps {
  hackathon: HackathonRow;
}

const statusColors: Record<string, string> = {
  upcoming: "bg-blue-100 text-blue-800",
  registration_open: "bg-green-100 text-green-800",
  ongoing: "bg-yellow-100 text-yellow-800",
  judging: "bg-purple-100 text-purple-800",
  completed: "bg-gray-100 text-gray-800",
};

const statusLabels: Record<string, string> = {
  upcoming: "Upcoming",
  registration_open: "Registration Open",
  ongoing: "Ongoing",
  judging: "Judging",
  completed: "Completed",
};

const formatLabels: Record<string, string> = {
  online: "Online",
  "in-person": "In-Person",
  hybrid: "Hybrid",
};

function formatPrizePool(prizePool: Record<string, unknown> | null): string | null {
  if (!prizePool) return null;
  const amount = prizePool.amount as number;
  const currency = (prizePool.currency as string) || "USD";

  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M ${currency}`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K ${currency}`;
  }
  return `$${amount.toLocaleString()} ${currency}`;
}

function getLocation(location: Record<string, unknown> | null): string | null {
  if (!location) return null;
  const parts: string[] = [];
  if (location.city) parts.push(location.city as string);
  if (location.country) parts.push(location.country as string);
  return parts.length > 0 ? parts.join(", ") : null;
}

export function HackathonCard({ hackathon }: HackathonCardProps) {
  const posthog = usePostHog();
  const startDate = new Date(hackathon.start_date);
  const endDate = new Date(hackathon.end_date);
  const prizeDisplay = formatPrizePool(hackathon.prize_pool);
  const locationDisplay = getLocation(hackathon.location);

  const trackClick = () => {
    posthog?.capture("hackathon_clicked", {
      hackathon_name: hackathon.name,
      hackathon_slug: hackathon.slug,
      hackathon_source: hackathon.source,
      hackathon_status: hackathon.status,
      prize_pool: (hackathon.prize_pool as { amount?: number })?.amount,
    });
  };

  return (
    <Card className="group hover:shadow-lg transition-shadow duration-200 overflow-hidden">
      {/* Banner Image */}
      {hackathon.banner_url && (
        <div className="relative h-32 overflow-hidden">
          <img
            src={hackathon.banner_url}
            alt={hackathon.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      )}

      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold leading-snug line-clamp-2">
              {hackathon.name}
            </CardTitle>
            <p className="text-xs text-muted-foreground capitalize mt-0.5">{hackathon.source}</p>
          </div>
          <Badge className={`shrink-0 text-xs ${statusColors[hackathon.status] || "bg-gray-100 text-gray-800"}`}>
            {statusLabels[hackathon.status] || hackathon.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        {hackathon.short_description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {hackathon.short_description}
          </p>
        )}

        {/* Info Grid */}
        <div className="space-y-2 text-xs">
          {/* Dates & Format Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>
                {format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Globe className="h-3.5 w-3.5 shrink-0" />
              <span>{formatLabels[hackathon.format] || hackathon.format}</span>
            </div>
          </div>

          {/* Location & Participants Row */}
          <div className="flex items-center justify-between gap-2">
            {/* Location (if in-person or hybrid) */}
            {locationDisplay && hackathon.format !== "online" ? (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>{locationDisplay}</span>
              </div>
            ) : (
              <div />
            )}

            {/* Participants */}
            {hackathon.participant_count ? (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-3.5 w-3.5 shrink-0" />
                <span>{hackathon.participant_count.toLocaleString()} participants</span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Prize Pool */}
        {prizeDisplay && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200">
            <Trophy className="h-5 w-5 text-yellow-600" />
            <span className="font-semibold text-yellow-800">{prizeDisplay}</span>
            <span className="text-sm text-yellow-600">Prize Pool</span>
          </div>
        )}

        {/* Chains */}
        {hackathon.chains && hackathon.chains.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {hackathon.chains.slice(0, 5).map((chain) => (
              <Badge key={chain} variant="outline" className="text-xs">
                {chain}
              </Badge>
            ))}
            {hackathon.chains.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{hackathon.chains.length - 5} more
              </Badge>
            )}
          </div>
        )}

        {/* Categories */}
        {hackathon.categories && hackathon.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {hackathon.categories.slice(0, 4).map((category) => (
              <Badge key={category} variant="secondary" className="text-xs capitalize">
                {category.replace(/-/g, " ")}
              </Badge>
            ))}
            {hackathon.categories.length > 4 && (
              <Badge variant="secondary" className="text-xs">
                +{hackathon.categories.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          <Button asChild className="w-full" onClick={trackClick}>
            <Link
              href={`/hackathons/${hackathon.slug}`}
              className="flex items-center justify-center gap-2"
            >
              View Details
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
