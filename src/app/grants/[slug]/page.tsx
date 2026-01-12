"use client";

import { use } from "react";
import Link from "next/link";
import { usePostHog } from "posthog-js/react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import {
  ChevronLeft,
  Calendar,
  Globe,
  DollarSign,
  ExternalLink,
  Clock,
  Building2,
  FileText,
  HelpCircle,
  Loader2,
  RefreshCw,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGrant, type GrantRow } from "@/lib/hooks";

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

function formatFunding(funding: Record<string, unknown> | null): string | null {
  if (!funding) return null;
  const currency = (funding.currency as string) || "USD";
  const format = funding.format as string;

  if (format === "range") {
    const min = funding.minAmount as number;
    const max = funding.maxAmount as number;
    return `$${min.toLocaleString()} - $${max.toLocaleString()} ${currency}`;
  } else if (format === "fixed" || format === "milestone-based") {
    const amount = (funding.typicalAmount || funding.totalPool) as number;
    if (amount) {
      if (amount >= 1000000) {
        return `$${(amount / 1000000).toFixed(1)}M ${currency}`;
      } else if (amount >= 1000) {
        return `$${(amount / 1000).toFixed(0)}K ${currency}`;
      }
      return `$${amount.toLocaleString()} ${currency}`;
    }
  }

  return null;
}

function getFundingDetails(funding: Record<string, unknown> | null): { label: string; value: string }[] {
  if (!funding) return [];
  const details: { label: string; value: string }[] = [];
  const currency = (funding.currency as string) || "USD";

  if (funding.minAmount) {
    details.push({ label: "Minimum", value: `$${(funding.minAmount as number).toLocaleString()} ${currency}` });
  }
  if (funding.maxAmount) {
    details.push({ label: "Maximum", value: `$${(funding.maxAmount as number).toLocaleString()} ${currency}` });
  }
  if (funding.typicalAmount) {
    details.push({ label: "Typical Amount", value: `$${(funding.typicalAmount as number).toLocaleString()} ${currency}` });
  }
  if (funding.totalPool) {
    const pool = funding.totalPool as number;
    const formatted = pool >= 1000000 ? `$${(pool / 1000000).toFixed(1)}M` : `$${pool.toLocaleString()}`;
    details.push({ label: "Total Pool", value: `${formatted} ${currency}` });
  }
  if (funding.format) {
    const formatLabels: Record<string, string> = {
      range: "Range-based",
      fixed: "Fixed Amount",
      "milestone-based": "Milestone-based",
    };
    details.push({ label: "Funding Type", value: formatLabels[funding.format as string] || (funding.format as string) });
  }

  return details;
}

function getDeadlineStatus(deadline: string | null, isRolling: boolean): { label: string; color: string } {
  if (isRolling) {
    return { label: "Rolling Applications", color: "text-green-600" };
  }

  if (!deadline) {
    return { label: "No deadline set", color: "text-gray-500" };
  }

  const deadlineDate = new Date(deadline);

  if (isPast(deadlineDate)) {
    return { label: "Deadline passed", color: "text-red-600" };
  }

  const daysUntil = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  if (daysUntil <= 7) {
    return { label: `${daysUntil} day${daysUntil === 1 ? "" : "s"} left`, color: "text-orange-600" };
  }

  return { label: `Closes ${formatDistanceToNow(deadlineDate, { addSuffix: true })}`, color: "text-blue-600" };
}

function GrantDetailContent({ grant }: { grant: GrantRow }) {
  const posthog = usePostHog();
  const fundingDisplay = formatFunding(grant.funding);
  const fundingDetails = getFundingDetails(grant.funding);
  const deadlineStatus = getDeadlineStatus(grant.application_deadline, grant.is_rolling);
  const foundation = grant.foundation as { name: string; chain?: string; websiteUrl?: string } | null;
  const eligibility = grant.eligibility as { requirements?: string[] } | null;

  const trackExternalClick = (linkType: string, url: string) => {
    posthog?.capture("external_link_clicked", {
      link_type: linkType,
      url: url,
      grant_name: grant.name,
      grant_slug: grant.slug,
      grant_source: grant.source,
      foundation_name: foundation?.name,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4">
          <Link href="/grants" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ChevronLeft className="h-5 w-5" />
            <span>Back to Grants</span>
          </Link>
        </div>
      </header>

      {/* Banner */}
      {grant.banner_url && (
        <div className="relative h-48 sm:h-64 overflow-hidden bg-gradient-to-r from-emerald-600 to-teal-600">
          <img
            src={grant.banner_url}
            alt={grant.name}
            className="w-full h-full object-cover opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
      )}

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title Section */}
            <div className="flex items-start gap-4">
              {grant.logo_url && (
                <img
                  src={grant.logo_url}
                  alt={`${grant.name} logo`}
                  className="w-16 h-16 rounded-xl object-cover bg-white shadow-md"
                />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{grant.name}</h1>
                  <Badge className={statusColors[grant.status] || "bg-gray-100 text-gray-800"}>
                    {statusLabels[grant.status] || grant.status}
                  </Badge>
                  {grant.is_rolling && (
                    <Badge variant="outline" className="border-green-300 text-green-700">
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Rolling
                    </Badge>
                  )}
                </div>
                {foundation && (
                  <p className="mt-1 text-gray-600">{foundation.name}</p>
                )}
                {grant.program_name && (
                  <p className="text-sm text-gray-500">{grant.program_name}</p>
                )}
              </div>
            </div>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {grant.description || grant.short_description || "No description available."}
                </p>
              </CardContent>
            </Card>

            {/* Funding Details */}
            {fundingDetails.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Funding Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {fundingDetails.map((detail) => (
                      <div key={detail.label} className="flex flex-col">
                        <span className="text-sm text-gray-500">{detail.label}</span>
                        <span className="font-semibold text-gray-900">{detail.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tracks */}
            {grant.tracks && grant.tracks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Tracks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {grant.tracks.map((track) => (
                      <Badge key={track} variant="secondary" className="text-sm">
                        {track}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Supported Chains */}
            {grant.chains && grant.chains.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Supported Chains</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {grant.chains.map((chain) => (
                      <Badge key={chain} variant="outline" className="text-sm">
                        {chain}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Categories */}
            {grant.categories && grant.categories.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {grant.categories.map((category) => (
                      <Badge key={category} variant="secondary" className="text-sm capitalize">
                        {category.replace(/-/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Eligibility */}
            {eligibility?.requirements && eligibility.requirements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Eligibility Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {eligibility.requirements.map((req, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-gray-700">{req}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Funding Amount */}
            {fundingDisplay && (
              <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-emerald-100">
                      <DollarSign className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-emerald-700">Funding</p>
                      <p className="text-xl font-bold text-emerald-800">{fundingDisplay}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Key Info */}
            <Card>
              <CardHeader>
                <CardTitle>Grant Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Deadline Status */}
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <span className={`font-medium ${deadlineStatus.color}`}>{deadlineStatus.label}</span>
                </div>

                {/* Application Deadline */}
                {grant.application_deadline && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">
                        Deadline: {format(new Date(grant.application_deadline), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                )}

                {/* Program Dates */}
                {(grant.program_start_date || grant.program_end_date) && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Program Period</p>
                      <p className="text-gray-900">
                        {grant.program_start_date && format(new Date(grant.program_start_date), "MMM d, yyyy")}
                        {grant.program_start_date && grant.program_end_date && " - "}
                        {grant.program_end_date && format(new Date(grant.program_end_date), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                )}

                {/* Foundation */}
                {foundation && (
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-gray-900">{foundation.name}</p>
                      {foundation.chain && (
                        <p className="text-sm text-gray-500">{foundation.chain}</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Apply */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Button asChild className="w-full" size="lg">
                  <a
                    href={grant.application_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                    onClick={() => trackExternalClick("application", grant.application_url)}
                  >
                    Apply Now
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>

                {grant.guidelines_url && (
                  <Button asChild variant="outline" className="w-full">
                    <a
                      href={grant.guidelines_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                      onClick={() => trackExternalClick("guidelines", grant.guidelines_url!)}
                    >
                      <FileText className="h-4 w-4" />
                      Guidelines
                    </a>
                  </Button>
                )}

                {grant.faq_url && (
                  <Button asChild variant="outline" className="w-full">
                    <a
                      href={grant.faq_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                      onClick={() => trackExternalClick("faq", grant.faq_url!)}
                    >
                      <HelpCircle className="h-4 w-4" />
                      FAQ
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Foundation Website */}
            {foundation?.websiteUrl && (
              <Card>
                <CardHeader>
                  <CardTitle>Foundation</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="outline" className="w-full justify-start">
                    <a
                      href={foundation.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                      onClick={() => trackExternalClick("foundation_website", foundation.websiteUrl!)}
                    >
                      <Globe className="h-4 w-4" />
                      {foundation.name} Website
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function GrantDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { data: grant, isLoading, error } = useGrant(slug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !grant) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-40 border-b bg-white">
          <div className="mx-auto flex h-16 max-w-5xl items-center px-4">
            <Link href="/grants" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ChevronLeft className="h-5 w-5" />
              <span>Back to Grants</span>
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Grant Not Found</h1>
          <p className="mt-2 text-gray-600">The grant you're looking for doesn't exist or has been removed.</p>
          <Button asChild className="mt-6">
            <Link href="/grants">Browse Grants</Link>
          </Button>
        </main>
      </div>
    );
  }

  return <GrantDetailContent grant={grant} />;
}
