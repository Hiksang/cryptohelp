"use client";

import { use } from "react";
import Link from "next/link";
import { usePostHog } from "posthog-js/react";
import { format, formatDistanceToNow, isPast, isFuture } from "date-fns";
import {
  ChevronLeft,
  Calendar,
  MapPin,
  Globe,
  Users,
  Trophy,
  ExternalLink,
  Clock,
  Twitter,
  MessageCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHackathon, type HackathonRow } from "@/lib/hooks";

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

function getLocation(location: Record<string, unknown> | null): { full: string; venue?: string } | null {
  if (!location) return null;
  const parts: string[] = [];
  if (location.city) parts.push(location.city as string);
  if (location.country) parts.push(location.country as string);

  return {
    full: parts.length > 0 ? parts.join(", ") : "",
    venue: location.venue as string | undefined,
  };
}

function getTimeStatus(startDate: Date, endDate: Date): { label: string; color: string } {
  const now = new Date();

  if (isPast(endDate)) {
    return { label: "Ended", color: "text-gray-500" };
  }

  if (isPast(startDate) && isFuture(endDate)) {
    return { label: `Ends ${formatDistanceToNow(endDate, { addSuffix: true })}`, color: "text-yellow-600" };
  }

  const daysUntil = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntil <= 7) {
    return { label: `Starts in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`, color: "text-green-600" };
  }

  return { label: `Starts ${formatDistanceToNow(startDate, { addSuffix: true })}`, color: "text-blue-600" };
}

function HackathonDetailContent({ hackathon }: { hackathon: HackathonRow }) {
  const posthog = usePostHog();
  const startDate = new Date(hackathon.start_date);
  const endDate = new Date(hackathon.end_date);
  const prizeDisplay = formatPrizePool(hackathon.prize_pool);
  const locationInfo = getLocation(hackathon.location);
  const timeStatus = getTimeStatus(startDate, endDate);

  const trackExternalClick = (linkType: string, url: string) => {
    posthog?.capture("external_link_clicked", {
      link_type: linkType,
      url: url,
      hackathon_name: hackathon.name,
      hackathon_slug: hackathon.slug,
      hackathon_source: hackathon.source,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center px-4">
          <Link href="/hackathons" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ChevronLeft className="h-5 w-5" />
            <span>Back to Hackathons</span>
          </Link>
        </div>
      </header>

      {/* Banner */}
      {hackathon.banner_url && (
        <div className="relative h-48 sm:h-64 overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600">
          <img
            src={hackathon.banner_url}
            alt={hackathon.name}
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
              {hackathon.logo_url && (
                <img
                  src={hackathon.logo_url}
                  alt={`${hackathon.name} logo`}
                  className="w-16 h-16 rounded-xl object-cover bg-white shadow-md"
                />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{hackathon.name}</h1>
                  <Badge className={statusColors[hackathon.status] || "bg-gray-100 text-gray-800"}>
                    {statusLabels[hackathon.status] || hackathon.status}
                  </Badge>
                </div>
                <p className="mt-1 text-gray-600 capitalize">{hackathon.source}</p>
              </div>
            </div>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {hackathon.description || hackathon.short_description || "No description available."}
                </p>
              </CardContent>
            </Card>

            {/* Themes */}
            {hackathon.themes && hackathon.themes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Themes & Tracks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {hackathon.themes.map((theme) => (
                      <Badge key={theme} variant="secondary" className="text-sm">
                        {theme}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Supported Chains */}
            {hackathon.chains && hackathon.chains.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Supported Chains</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {hackathon.chains.map((chain) => (
                      <Badge key={chain} variant="outline" className="text-sm">
                        {chain}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Categories */}
            {hackathon.categories && hackathon.categories.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {hackathon.categories.map((category) => (
                      <Badge key={category} variant="secondary" className="text-sm capitalize">
                        {category.replace(/-/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Prize Pool */}
            {prizeDisplay && (
              <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-yellow-100">
                      <Trophy className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-yellow-700">Prize Pool</p>
                      <p className="text-2xl font-bold text-yellow-800">{prizeDisplay}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Key Info */}
            <Card>
              <CardHeader>
                <CardTitle>Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Time Status */}
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <span className={`font-medium ${timeStatus.color}`}>{timeStatus.label}</span>
                </div>

                {/* Dates */}
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">
                      {format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}
                    </p>
                    {hackathon.timezone && (
                      <p className="text-sm text-gray-500">{hackathon.timezone}</p>
                    )}
                  </div>
                </div>

                {/* Format */}
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-900">{formatLabels[hackathon.format] || hackathon.format}</span>
                </div>

                {/* Location */}
                {locationInfo && locationInfo.full && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-gray-900">{locationInfo.full}</p>
                      {locationInfo.venue && (
                        <p className="text-sm text-gray-500">{locationInfo.venue}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Participants */}
                {hackathon.participant_count && (
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-900">
                      {hackathon.participant_count.toLocaleString()} participants
                    </span>
                  </div>
                )}

                {/* Projects */}
                {hackathon.project_count && (
                  <div className="flex items-center gap-3">
                    <Trophy className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-900">
                      {hackathon.project_count.toLocaleString()} projects submitted
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Registration */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Button asChild className="w-full" size="lg">
                  <a
                    href={hackathon.registration_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                    onClick={() => trackExternalClick("registration", hackathon.registration_url)}
                  >
                    {hackathon.status === "registration_open" ? "Register Now" : "View Event"}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>

                {hackathon.website_url && hackathon.website_url !== hackathon.registration_url && (
                  <Button asChild variant="outline" className="w-full">
                    <a
                      href={hackathon.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                      onClick={() => trackExternalClick("website", hackathon.website_url!)}
                    >
                      Visit Website
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Social Links */}
            {(hackathon.discord_url || hackathon.twitter_url || hackathon.telegram_url) && (
              <Card>
                <CardHeader>
                  <CardTitle>Community</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {hackathon.discord_url && (
                    <Button asChild variant="outline" className="w-full justify-start">
                      <a
                        href={hackathon.discord_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                        onClick={() => trackExternalClick("discord", hackathon.discord_url!)}
                      >
                        <MessageCircle className="h-4 w-4" />
                        Discord
                      </a>
                    </Button>
                  )}
                  {hackathon.twitter_url && (
                    <Button asChild variant="outline" className="w-full justify-start">
                      <a
                        href={hackathon.twitter_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                        onClick={() => trackExternalClick("twitter", hackathon.twitter_url!)}
                      >
                        <Twitter className="h-4 w-4" />
                        Twitter
                      </a>
                    </Button>
                  )}
                  {hackathon.telegram_url && (
                    <Button asChild variant="outline" className="w-full justify-start">
                      <a
                        href={hackathon.telegram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                        onClick={() => trackExternalClick("telegram", hackathon.telegram_url!)}
                      >
                        <MessageCircle className="h-4 w-4" />
                        Telegram
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function HackathonDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const { data: hackathon, isLoading, error } = useHackathon(slug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !hackathon) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-40 border-b bg-white">
          <div className="mx-auto flex h-16 max-w-5xl items-center px-4">
            <Link href="/hackathons" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ChevronLeft className="h-5 w-5" />
              <span>Back to Hackathons</span>
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Hackathon Not Found</h1>
          <p className="mt-2 text-gray-600">The hackathon you're looking for doesn't exist or has been removed.</p>
          <Button asChild className="mt-6">
            <Link href="/hackathons">Browse Hackathons</Link>
          </Button>
        </main>
      </div>
    );
  }

  return <HackathonDetailContent hackathon={hackathon} />;
}
