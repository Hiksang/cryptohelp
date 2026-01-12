"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Filter, X, ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HackathonCard } from "@/components/hackathons";
import { useHackathons, type HackathonFilters } from "@/lib/hooks";

const STATUS_OPTIONS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "registration_open", label: "Registration Open" },
  { value: "ongoing", label: "Ongoing" },
  { value: "judging", label: "Judging" },
  { value: "completed", label: "Completed" },
];

const FORMAT_OPTIONS = [
  { value: "online", label: "Online" },
  { value: "in-person", label: "In-Person" },
  { value: "hybrid", label: "Hybrid" },
];

const CHAIN_OPTIONS = [
  { name: "Ethereum", logo: "/chains/ethereum.svg" },
  { name: "Polygon", logo: "/chains/polygon.svg" },
  { name: "Arbitrum", logo: "/chains/arbitrum.svg" },
  { name: "Optimism", logo: "/chains/optimism.svg" },
  { name: "Base", logo: "/chains/base.svg" },
  { name: "Solana", logo: "/chains/solana.svg" },
  { name: "BNB Chain", logo: "/chains/bnb.svg" },
  { name: "Avalanche", logo: "/chains/avalanche.svg" },
];

export default function HackathonsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<string[]>([]);
  const [selectedChains, setSelectedChains] = useState<string[]>([]);

  const filters: HackathonFilters = useMemo(() => ({
    status: selectedStatus.length > 0 ? selectedStatus : undefined,
    format: selectedFormat.length > 0 ? selectedFormat : undefined,
    chains: selectedChains.length > 0 ? selectedChains : undefined,
    search: searchQuery || undefined,
  }), [selectedStatus, selectedFormat, selectedChains, searchQuery]);

  const { data: hackathons, isLoading, error } = useHackathons(filters);

  const toggleFilter = (
    value: string,
    selected: string[],
    setSelected: (v: string[]) => void
  ) => {
    if (selected.includes(value)) {
      setSelected(selected.filter((v) => v !== value));
    } else {
      setSelected([...selected, value]);
    }
  };

  const clearFilters = () => {
    setSelectedStatus([]);
    setSelectedFormat([]);
    setSelectedChains([]);
    setSearchQuery("");
  };

  const hasActiveFilters =
    selectedStatus.length > 0 ||
    selectedFormat.length > 0 ||
    selectedChains.length > 0 ||
    searchQuery.length > 0;

  const stats = useMemo(() => {
    if (!hackathons) return { total: 0, upcoming: 0, totalPrize: 0 };

    const upcoming = hackathons.filter(
      (h) => h.status === "upcoming" || h.status === "registration_open"
    ).length;

    const totalPrize = hackathons.reduce((sum, h) => {
      const prize = h.prize_pool as { amount?: number } | null;
      return sum + (prize?.amount || 0);
    }, 0);

    return { total: hackathons.length, upcoming, totalPrize };
  }, [hackathons]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Hackathons</h1>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {stats.total} events
            </Badge>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden"
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 rounded-full bg-primary text-primary-foreground px-1.5 text-xs">
                {selectedStatus.length + selectedFormat.length + selectedChains.length}
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-blue-600">{stats.total}</span>
            <span className="text-sm text-gray-600">Total</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-green-600">{stats.upcoming}</span>
            <span className="text-sm text-gray-600">Upcoming</span>
          </div>
          {stats.totalPrize > 0 && (
            <div className="hidden items-center gap-2 sm:flex">
              <span className="text-2xl font-bold text-yellow-600">
                ${(stats.totalPrize / 1000000).toFixed(1)}M
              </span>
              <span className="text-sm text-gray-600">in Prizes</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar - Desktop */}
          <aside className="hidden w-72 shrink-0 lg:block">
            <div className="sticky top-24 space-y-6">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search hackathons..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border bg-white px-10 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full">
                  <X className="h-4 w-4 mr-1" />
                  Clear all filters
                </Button>
              )}

              {/* Status Filter */}
              <div className="rounded-lg border bg-white p-4">
                <h3 className="mb-3 font-semibold text-gray-900">Status</h3>
                <div className="space-y-2">
                  {STATUS_OPTIONS.map((option) => (
                    <label key={option.value} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedStatus.includes(option.value)}
                        onChange={() => toggleFilter(option.value, selectedStatus, setSelectedStatus)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Format Filter */}
              <div className="rounded-lg border bg-white p-4">
                <h3 className="mb-3 font-semibold text-gray-900">Format</h3>
                <div className="space-y-2">
                  {FORMAT_OPTIONS.map((option) => (
                    <label key={option.value} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedFormat.includes(option.value)}
                        onChange={() => toggleFilter(option.value, selectedFormat, setSelectedFormat)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Chains Filter */}
              <div className="rounded-lg border bg-white p-4">
                <h3 className="mb-3 font-semibold text-gray-900">Chains</h3>
                <div className="flex flex-wrap gap-2">
                  {CHAIN_OPTIONS.map((chain) => (
                    <Badge
                      key={chain.name}
                      variant={selectedChains.includes(chain.name) ? "default" : "outline"}
                      className="cursor-pointer flex items-center gap-1.5"
                      onClick={() => toggleFilter(chain.name, selectedChains, setSelectedChains)}
                    >
                      <img src={chain.logo} alt={chain.name} className="h-4 w-4" />
                      {chain.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Mobile Filters */}
          {showFilters && (
            <div className="fixed inset-0 z-50 bg-black/50 lg:hidden">
              <div className="absolute right-0 top-0 h-full w-80 overflow-y-auto bg-white p-4 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Filters</h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-6">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search hackathons..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border bg-white px-10 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Status Filter */}
                  <div>
                    <h3 className="mb-3 font-semibold text-gray-900">Status</h3>
                    <div className="space-y-2">
                      {STATUS_OPTIONS.map((option) => (
                        <label key={option.value} className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedStatus.includes(option.value)}
                            onChange={() => toggleFilter(option.value, selectedStatus, setSelectedStatus)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Format Filter */}
                  <div>
                    <h3 className="mb-3 font-semibold text-gray-900">Format</h3>
                    <div className="space-y-2">
                      {FORMAT_OPTIONS.map((option) => (
                        <label key={option.value} className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedFormat.includes(option.value)}
                            onChange={() => toggleFilter(option.value, selectedFormat, setSelectedFormat)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Chains Filter */}
                  <div>
                    <h3 className="mb-3 font-semibold text-gray-900">Chains</h3>
                    <div className="flex flex-wrap gap-2">
                      {CHAIN_OPTIONS.map((chain) => (
                        <Badge
                          key={chain.name}
                          variant={selectedChains.includes(chain.name) ? "default" : "outline"}
                          className="cursor-pointer flex items-center gap-1.5"
                          onClick={() => toggleFilter(chain.name, selectedChains, setSelectedChains)}
                        >
                          <img src={chain.logo} alt={chain.name} className="h-4 w-4" />
                          {chain.name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Clear & Apply */}
                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={clearFilters} className="flex-1">
                      Clear
                    </Button>
                    <Button onClick={() => setShowFilters(false)} className="flex-1">
                      Apply
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Hackathon List */}
          <div className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
                <p className="text-red-800">Failed to load hackathons. Please try again.</p>
              </div>
            ) : hackathons && hackathons.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {hackathons.map((hackathon) => (
                  <HackathonCard key={hackathon.id} hackathon={hackathon} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border bg-white p-12 text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <Search className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">No hackathons found</h3>
                <p className="mt-2 text-sm text-gray-600">
                  {hasActiveFilters
                    ? "Try adjusting your filters or search query"
                    : "Check back later for new hackathons"}
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters} className="mt-4">
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
