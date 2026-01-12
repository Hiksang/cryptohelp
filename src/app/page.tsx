"use client";

import Link from "next/link";
import {
  Trophy,
  Gift,
  ArrowRight,
  Calendar,
  Zap,
  Globe,
  TrendingUp,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useHackathons, useGrants, type HackathonRow, type GrantRow } from "@/lib/hooks";
import { HackathonCard } from "@/components/hackathons/HackathonCard";
import { GrantCard } from "@/components/grants/GrantCard";

function formatPrizePool(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `$${Math.round(amount / 1000)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

function extractPrizeAmount(prizePool: Record<string, unknown> | null): number {
  if (!prizePool) return 0;

  // Handle different prize_pool structures
  const amount = prizePool.amount;

  // If amount is already a number, return it
  if (typeof amount === "number") {
    return amount;
  }

  // If amount is a string, try to parse it
  if (typeof amount === "string") {
    // Remove currency symbols, commas, and non-numeric characters except decimal point
    const cleanedAmount = amount.replace(/[^0-9.]/g, "");
    const parsed = parseFloat(cleanedAmount);
    return isNaN(parsed) ? 0 : parsed;
  }

  // Try to find a numeric value in the prize pool object
  if (typeof prizePool.total === "number") {
    return prizePool.total;
  }

  if (typeof prizePool.totalPrize === "number") {
    return prizePool.totalPrize;
  }

  return 0;
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />

      {/* Gradient Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: "1s" }} />

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:py-28">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/80 backdrop-blur-sm border border-white/10 mb-6">
            <Sparkles className="h-4 w-4 text-yellow-400" />
            <span>Discover the best Web3 opportunities</span>
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight">
            Find Your Next
            <span className="block mt-2 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              Web3 Adventure
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg sm:text-xl text-white/70 max-w-2xl mx-auto">
            Discover hackathons, grants, and funding opportunities across all major blockchain ecosystems.
            Build, learn, and earn in the decentralized world.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-white text-slate-900 hover:bg-white/90 text-base px-8">
              <Link href="/hackathons" className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Explore Hackathons
              </Link>
            </Button>
            <Button asChild size="lg" className="bg-transparent border border-white/30 text-white hover:bg-white/10 text-base px-8">
              <Link href="/grants" className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Browse Grants
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsSection({ hackathons, grants }: { hackathons: HackathonRow[]; grants: GrantRow[] }) {
  const totalPrize = hackathons.reduce((sum, h) => {
    const amount = extractPrizeAmount(h.prize_pool as Record<string, unknown> | null);
    return sum + amount;
  }, 0);

  const upcomingHackathons = hackathons.filter(h =>
    h.status === "upcoming" || h.status === "registration_open"
  ).length;

  const activeGrants = grants.filter(g => g.status === "active").length;

  const stats = [
    {
      icon: Trophy,
      value: hackathons.length.toString(),
      label: "Hackathons",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      icon: Gift,
      value: grants.length.toString(),
      label: "Grants",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      icon: TrendingUp,
      value: formatPrizePool(totalPrize),
      label: "Total Prizes",
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
    {
      icon: Zap,
      value: (upcomingHackathons + activeGrants).toString(),
      label: "Active Now",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <section className="py-12 bg-white border-b">
      <div className="mx-auto max-w-7xl px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-4 p-4 sm:p-6">
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className={`text-2xl sm:text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedHackathons({ hackathons }: { hackathons: HackathonRow[] }) {
  // Show featured or upcoming hackathons
  const featured = hackathons
    .filter(h => h.status === "registration_open" || h.status === "upcoming")
    .slice(0, 3);

  if (featured.length === 0) return null;

  return (
    <section className="py-16 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Upcoming Hackathons</h2>
            <p className="mt-2 text-gray-600">Don't miss these exciting opportunities to build and win</p>
          </div>
          <Button asChild variant="ghost" className="hidden sm:flex">
            <Link href="/hackathons" className="flex items-center gap-2">
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featured.map((hackathon) => (
            <HackathonCard key={hackathon.id} hackathon={hackathon} />
          ))}
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Button asChild>
            <Link href="/hackathons" className="flex items-center gap-2">
              View All Hackathons
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function FeaturedGrants({ grants }: { grants: GrantRow[] }) {
  // Show active grants
  const featured = grants
    .filter(g => g.status === "active")
    .slice(0, 3);

  if (featured.length === 0) return null;

  return (
    <section className="py-16 bg-white">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Active Grants</h2>
            <p className="mt-2 text-gray-600">Get funded for your Web3 projects</p>
          </div>
          <Button asChild variant="ghost" className="hidden sm:flex">
            <Link href="/grants" className="flex items-center gap-2">
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featured.map((grant) => (
            <GrantCard key={grant.id} grant={grant} />
          ))}
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Button asChild>
            <Link href="/grants" className="flex items-center gap-2">
              View All Grants
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function ChainsSection() {
  const chains = [
    { name: "Ethereum", logo: "/chains/ethereum.svg", color: "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100" },
    { name: "Polygon", logo: "/chains/polygon.svg", color: "bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100" },
    { name: "Arbitrum", logo: "/chains/arbitrum.svg", color: "bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100" },
    { name: "Optimism", logo: "/chains/optimism.svg", color: "bg-red-50 text-red-800 border-red-200 hover:bg-red-100" },
    { name: "Solana", logo: "/chains/solana.svg", color: "bg-gradient-to-r from-green-50 to-purple-50 text-purple-800 border-purple-200 hover:from-green-100 hover:to-purple-100" },
    { name: "Base", logo: "/chains/base.svg", color: "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100" },
    { name: "BNB Chain", logo: "/chains/bnb.svg", color: "bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100" },
    { name: "Avalanche", logo: "/chains/avalanche.svg", color: "bg-red-50 text-red-800 border-red-200 hover:bg-red-100" },
  ];

  return (
    <section className="py-16 bg-gray-50 border-t">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Explore by Chain</h2>
          <p className="mt-2 text-gray-600">Find opportunities across all major blockchain ecosystems</p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {chains.map((chain) => (
            <Link key={chain.name} href={`/hackathons?chain=${encodeURIComponent(chain.name)}`}>
              <Badge
                variant="outline"
                className={`px-4 py-2.5 text-sm cursor-pointer hover:scale-105 transition-all ${chain.color}`}
              >
                <img src={chain.logo} alt={chain.name} className="h-5 w-5 mr-2" />
                {chain.name}
              </Badge>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-r from-purple-600 to-blue-600">
      <div className="mx-auto max-w-4xl px-4 text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-white">
          Ready to Start Building?
        </h2>
        <p className="mt-4 text-lg text-white/80">
          Join thousands of developers building the future of Web3.
          Find your next hackathon or grant today.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild size="lg" className="bg-white text-purple-600 hover:bg-white/90">
            <Link href="/hackathons" className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Browse Events
            </Link>
          </Button>
          <Button asChild size="lg" className="bg-transparent border border-white/30 text-white hover:bg-white/10">
            <Link href="/grants" className="flex items-center gap-2">
              Get Funded
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-slate-900 text-white py-12">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-lg">buidlTown</p>
              <p className="text-sm text-gray-400">Web3 Hackathons & Grants</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/hackathons" className="text-gray-400 hover:text-white transition-colors">
              Hackathons
            </Link>
            <Link href="/grants" className="text-gray-400 hover:text-white transition-colors">
              Grants
            </Link>
          </div>

          <p className="text-sm text-gray-500">
            © 2026 buidlTown. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function Home() {
  const { data: hackathons = [], isLoading: hackathonsLoading } = useHackathons();
  const { data: grants = [], isLoading: grantsLoading } = useGrants();

  const isLoading = hackathonsLoading || grantsLoading;

  return (
    <div className="min-h-screen bg-gray-50">
      <HeroSection />

      {!isLoading && (
        <>
          <StatsSection hackathons={hackathons} grants={grants} />
          <FeaturedHackathons hackathons={hackathons} />
          <FeaturedGrants grants={grants} />
        </>
      )}

      <ChainsSection />
      <CTASection />
      <Footer />
    </div>
  );
}
