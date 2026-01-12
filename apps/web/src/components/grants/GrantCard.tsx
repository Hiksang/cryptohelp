"use client";

import { useState } from "react";
import Link from "next/link";
import { usePostHog } from "posthog-js/react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { Calendar, DollarSign, Building2, ChevronRight, Clock, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GrantRow } from "@/lib/hooks/useGrants";

interface GrantCardProps {
  grant: GrantRow;
}

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  upcoming: "bg-blue-100 text-blue-800",
  closed: "bg-gray-100 text-gray-800",
  paused: "bg-yellow-100 text-yellow-800",
};

const statusLabels: Record<string, string> = {
  active: "Active",
  upcoming: "Upcoming",
  closed: "Closed",
  paused: "Paused",
};

interface Foundation {
  name?: string;
  chain?: string;
  logoUrl?: string;
  websiteUrl?: string;
}

interface Funding {
  minAmount?: number;
  maxAmount?: number;
  typicalAmount?: number;
  currency?: string;
  totalPool?: number;
  format?: string;
}

function formatFunding(funding: Funding | null): string | null {
  if (!funding) return null;

  const currency = funding.currency || "USD";
  const formatAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };

  if (funding.minAmount && funding.maxAmount) {
    return `${formatAmount(funding.minAmount)} - ${formatAmount(funding.maxAmount)} ${currency}`;
  } else if (funding.maxAmount) {
    return `Up to ${formatAmount(funding.maxAmount)} ${currency}`;
  } else if (funding.typicalAmount) {
    return `~${formatAmount(funding.typicalAmount)} ${currency}`;
  } else if (funding.totalPool) {
    return `${formatAmount(funding.totalPool)} ${currency} Pool`;
  }

  return null;
}

function getDeadlineInfo(deadline: string | null, isRolling: boolean): { text: string; urgent: boolean } {
  if (isRolling) {
    return { text: "Rolling applications", urgent: false };
  }

  if (!deadline) {
    return { text: "No deadline", urgent: false };
  }

  const deadlineDate = new Date(deadline);

  if (isPast(deadlineDate)) {
    return { text: "Deadline passed", urgent: false };
  }

  const daysUntil = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  if (daysUntil <= 7) {
    return { text: `${daysUntil} day${daysUntil === 1 ? "" : "s"} left`, urgent: true };
  }

  return { text: `Due ${format(deadlineDate, "MMM d, yyyy")}`, urgent: false };
}

export function GrantCard({ grant }: GrantCardProps) {
  const [logoError, setLogoError] = useState(false);
  const posthog = usePostHog();
  const foundation = grant.foundation as Foundation | null;
  const funding = grant.funding as Funding | null;
  const fundingDisplay = formatFunding(funding);
  const deadlineInfo = getDeadlineInfo(grant.application_deadline, grant.is_rolling);

  const logoUrl = grant.logo_url || foundation?.logoUrl;
  const showLogo = logoUrl && !logoError;

  const trackClick = () => {
    posthog?.capture("grant_clicked", {
      grant_name: grant.name,
      grant_slug: grant.slug,
      grant_source: grant.source,
      grant_status: grant.status,
      foundation_name: foundation?.name,
      is_rolling: grant.is_rolling,
    });
  };

  return (
    <Card className="group hover:shadow-lg transition-shadow duration-200 overflow-hidden">
      {/* Banner Image */}
      {grant.banner_url && (
        <div className="relative h-28 overflow-hidden">
          <img
            src={grant.banner_url}
            alt={grant.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      )}

      <CardHeader className={grant.banner_url ? "-mt-8 relative z-10" : ""}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {showLogo ? (
              <img
                src={logoUrl}
                alt={`${grant.name} logo`}
                className="w-12 h-12 rounded-lg object-cover bg-white shadow-sm"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-white" />
              </div>
            )}
            <div>
              <CardTitle className="text-lg leading-tight">{grant.name}</CardTitle>
              {foundation?.name && (
                <p className="text-sm text-muted-foreground">{foundation.name}</p>
              )}
            </div>
          </div>
          <Badge className={statusColors[grant.status] || "bg-gray-100 text-gray-800"}>
            {statusLabels[grant.status] || grant.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description */}
        {grant.short_description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {grant.short_description}
          </p>
        )}

        {/* Info Grid */}
        <div className="space-y-2">
          {/* Deadline */}
          <div className={`flex items-center gap-2 text-sm ${deadlineInfo.urgent ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
            {grant.is_rolling ? (
              <RefreshCw className="h-4 w-4 shrink-0" />
            ) : (
              <Clock className="h-4 w-4 shrink-0" />
            )}
            <span>{deadlineInfo.text}</span>
          </div>

          {/* Application Deadline Date */}
          {grant.application_deadline && !grant.is_rolling && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 shrink-0" />
              <span>Deadline: {format(new Date(grant.application_deadline), "MMM d, yyyy")}</span>
            </div>
          )}
        </div>

        {/* Funding */}
        {fundingDisplay && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
            <DollarSign className="h-5 w-5 text-green-600" />
            <span className="font-semibold text-green-800">{fundingDisplay}</span>
          </div>
        )}

        {/* Chains */}
        {grant.chains && grant.chains.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {grant.chains.slice(0, 4).map((chain) => (
              <Badge key={chain} variant="outline" className="text-xs">
                {chain}
              </Badge>
            ))}
            {grant.chains.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{grant.chains.length - 4} more
              </Badge>
            )}
          </div>
        )}

        {/* Categories & Tracks */}
        {grant.categories && grant.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {grant.categories.slice(0, 3).map((category) => (
              <Badge key={category} variant="secondary" className="text-xs capitalize">
                {category.replace(/-/g, " ")}
              </Badge>
            ))}
            {grant.tracks && grant.tracks.slice(0, 2).map((track) => (
              <Badge key={track} variant="secondary" className="text-xs capitalize bg-purple-100 text-purple-800">
                {track.replace(/-/g, " ")}
              </Badge>
            ))}
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          <Button asChild className="w-full" onClick={trackClick}>
            <Link
              href={`/grants/${grant.slug}`}
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
