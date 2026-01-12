"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHAINS, CATEGORIES } from "@buidltown/shared";
import { X } from "lucide-react";

export interface FilterState {
  types: ("hackathon" | "grant")[];
  chains: string[];
  categories: string[];
  status: string[];
}

interface FilterSidebarProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

const EVENT_TYPES = [
  { id: "hackathon", name: "Hackathons" },
  { id: "grant", name: "Grants" },
] as const;

const STATUS_OPTIONS = [
  { id: "upcoming", name: "Upcoming" },
  { id: "registration_open", name: "Registration Open" },
  { id: "ongoing", name: "Ongoing" },
  { id: "active", name: "Active (Grants)" },
] as const;

export function FilterSidebar({ filters, onChange }: FilterSidebarProps) {
  const toggleType = (type: "hackathon" | "grant") => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    onChange({ ...filters, types: newTypes });
  };

  const addChain = (chainName: string) => {
    if (!filters.chains.includes(chainName)) {
      onChange({ ...filters, chains: [...filters.chains, chainName] });
    }
  };

  const removeChain = (chainName: string) => {
    onChange({
      ...filters,
      chains: filters.chains.filter((c) => c !== chainName),
    });
  };

  const addCategory = (categoryId: string) => {
    if (!filters.categories.includes(categoryId)) {
      onChange({ ...filters, categories: [...filters.categories, categoryId] });
    }
  };

  const removeCategory = (categoryId: string) => {
    onChange({
      ...filters,
      categories: filters.categories.filter((c) => c !== categoryId),
    });
  };

  const clearAll = () => {
    onChange({
      types: [],
      chains: [],
      categories: [],
      status: [],
    });
  };

  const hasActiveFilters =
    filters.types.length > 0 ||
    filters.chains.length > 0 ||
    filters.categories.length > 0;

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Filters</CardTitle>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAll}>
              Clear all
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Event Type */}
        <div>
          <h4 className="mb-2 text-sm font-medium">Event Type</h4>
          <div className="flex flex-wrap gap-2">
            {EVENT_TYPES.map((type) => (
              <Badge
                key={type.id}
                variant={
                  filters.types.includes(type.id as "hackathon" | "grant")
                    ? "default"
                    : "outline"
                }
                className="cursor-pointer"
                onClick={() => toggleType(type.id as "hackathon" | "grant")}
              >
                {type.name}
              </Badge>
            ))}
          </div>
        </div>

        {/* Chains */}
        <div>
          <h4 className="mb-2 text-sm font-medium">Chains</h4>
          <Select onValueChange={addChain}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select chain" />
            </SelectTrigger>
            <SelectContent>
              {CHAINS.filter((c) => !filters.chains.includes(c.name)).map(
                (chain) => (
                  <SelectItem key={chain.id} value={chain.name}>
                    {chain.name}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
          {filters.chains.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {filters.chains.map((chain) => (
                <Badge
                  key={chain}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => removeChain(chain)}
                >
                  {chain}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Categories */}
        <div>
          <h4 className="mb-2 text-sm font-medium">Categories</h4>
          <Select onValueChange={addCategory}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.filter(
                (c) => !filters.categories.includes(c.id)
              ).map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filters.categories.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {filters.categories.map((categoryId) => {
                const category = CATEGORIES.find((c) => c.id === categoryId);
                return (
                  <Badge
                    key={categoryId}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => removeCategory(categoryId)}
                  >
                    {category?.name || categoryId}
                    <X className="ml-1 h-3 w-3" />
                  </Badge>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
