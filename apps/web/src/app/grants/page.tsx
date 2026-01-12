"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Filter, X, ChevronLeft, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GrantCard } from "@/components/grants";
import { useGrants, type GrantFilters } from "@/lib/hooks";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "upcoming", label: "Upcoming" },
  { value: "paused", label: "Paused" },
  { value: "closed", label: "Closed" },
];

const CATEGORY_OPTIONS = [
  "infrastructure",
  "defi",
  "gaming",
  "social",
  "dao",
  "nft",
  "public-goods",
  "tooling",
  "research",
  "education",
];

const CHAIN_OPTIONS = [
  { name: "Ethereum", logo: "/chains/ethereum.svg" },
  { name: "Polygon", logo: "/chains/polygon.svg" },
  { name: "Arbitrum", logo: "/chains/arbitrum.svg" },
  { name: "Optimism", logo: "/chains/optimism.svg" },
  { name: "Base", logo: "/chains/base.svg" },
  { name: "Solana", logo: "/chains/solana.svg" },
  { name: "Near", logo: "/chains/near.svg" },
  { name: "Sui", logo: "/chains/sui.svg" },
];

export default function GrantsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedChains, setSelectedChains] = useState<string[]>([]);
  const [showRollingOnly, setShowRollingOnly] = useState<boolean | undefined>(undefined);

  const filters: GrantFilters = useMemo(() => ({
    status: selectedStatus.length > 0 ? selectedStatus : undefined,
    categories: selectedCategories.length > 0 ? selectedCategories : undefined,
    chains: selectedChains.length > 0 ? selectedChains : undefined,
    isRolling: showRollingOnly,
    search: searchQuery || undefined,
  }), [selectedStatus, selectedCategories, selectedChains, showRollingOnly, searchQuery]);

  const { data: grants, isLoading, error } = useGrants(filters);

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
    setSelectedCategories([]);
    setSelectedChains([]);
    setShowRollingOnly(undefined);
    setSearchQuery("");
  };

  const hasActiveFilters =
    selectedStatus.length > 0 ||
    selectedCategories.length > 0 ||
    selectedChains.length > 0 ||
    showRollingOnly !== undefined ||
    searchQuery.length > 0;

  const stats = useMemo(() => {
    if (!grants) return { total: 0, active: 0, rolling: 0 };

    const active = grants.filter((g) => g.status === "active").length;
    const rolling = grants.filter((g) => g.is_rolling).length;

    return { total: grants.length, active, rolling };
  }, [grants]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900">Grants</h1>
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {stats.total} programs
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
                {selectedStatus.length + selectedCategories.length + selectedChains.length + (showRollingOnly !== undefined ? 1 : 0)}
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-green-600">{stats.total}</span>
            <span className="text-sm text-gray-600">Total</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-blue-600">{stats.active}</span>
            <span className="text-sm text-gray-600">Active</span>
          </div>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-purple-600" />
            <span className="text-2xl font-bold text-purple-600">{stats.rolling}</span>
            <span className="text-sm text-gray-600">Rolling</span>
          </div>
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
                  placeholder="Search grants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border bg-white px-10 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
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

              {/* Rolling Toggle */}
              <div className="rounded-lg border bg-white p-4">
                <h3 className="mb-3 font-semibold text-gray-900">Application Type</h3>
                <div className="space-y-2">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="rolling"
                      checked={showRollingOnly === undefined}
                      onChange={() => setShowRollingOnly(undefined)}
                      className="text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">All</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="rolling"
                      checked={showRollingOnly === true}
                      onChange={() => setShowRollingOnly(true)}
                      className="text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">Rolling Applications</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="radio"
                      name="rolling"
                      checked={showRollingOnly === false}
                      onChange={() => setShowRollingOnly(false)}
                      className="text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">Fixed Deadline</span>
                  </label>
                </div>
              </div>

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
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <span className="text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Categories Filter */}
              <div className="rounded-lg border bg-white p-4">
                <h3 className="mb-3 font-semibold text-gray-900">Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map((category) => (
                    <Badge
                      key={category}
                      variant={selectedCategories.includes(category) ? "default" : "outline"}
                      className="cursor-pointer capitalize"
                      onClick={() => toggleFilter(category, selectedCategories, setSelectedCategories)}
                    >
                      {category.replace(/-/g, " ")}
                    </Badge>
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
                      placeholder="Search grants..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-lg border bg-white px-10 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                    />
                  </div>

                  {/* Rolling Toggle */}
                  <div>
                    <h3 className="mb-3 font-semibold text-gray-900">Application Type</h3>
                    <div className="space-y-2">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="rolling-mobile"
                          checked={showRollingOnly === undefined}
                          onChange={() => setShowRollingOnly(undefined)}
                          className="text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">All</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="rolling-mobile"
                          checked={showRollingOnly === true}
                          onChange={() => setShowRollingOnly(true)}
                          className="text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">Rolling Applications</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="rolling-mobile"
                          checked={showRollingOnly === false}
                          onChange={() => setShowRollingOnly(false)}
                          className="text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">Fixed Deadline</span>
                      </label>
                    </div>
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
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                          <span className="text-sm text-gray-700">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Categories Filter */}
                  <div>
                    <h3 className="mb-3 font-semibold text-gray-900">Categories</h3>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORY_OPTIONS.map((category) => (
                        <Badge
                          key={category}
                          variant={selectedCategories.includes(category) ? "default" : "outline"}
                          className="cursor-pointer capitalize"
                          onClick={() => toggleFilter(category, selectedCategories, setSelectedCategories)}
                        >
                          {category.replace(/-/g, " ")}
                        </Badge>
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

          {/* Grant List */}
          <div className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
                <p className="text-red-800">Failed to load grants. Please try again.</p>
              </div>
            ) : grants && grants.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {grants.map((grant) => (
                  <GrantCard key={grant.id} grant={grant} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border bg-white p-12 text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <Search className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">No grants found</h3>
                <p className="mt-2 text-sm text-gray-600">
                  {hasActiveFilters
                    ? "Try adjusting your filters or search query"
                    : "Check back later for new grant programs"}
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
