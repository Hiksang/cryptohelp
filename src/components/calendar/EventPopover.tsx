"use client";

import { useEffect, useRef } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CalendarEvent } from "@/lib/shared";
import { ExternalLink, Calendar, MapPin, Award } from "lucide-react";

interface EventPopoverProps {
  event: CalendarEvent;
  anchor: HTMLElement;
  onClose: () => void;
}

export function EventPopover({ event, anchor, onClose }: EventPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        !anchor.contains(e.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [anchor, onClose]);

  const isHackathon = event.type === "hackathon";

  return (
    <div
      ref={popoverRef}
      className="absolute z-50"
      style={{
        top: anchor.getBoundingClientRect().bottom + window.scrollY + 8,
        left: anchor.getBoundingClientRect().left + window.scrollX,
      }}
    >
      <Card className="w-80 shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <Badge variant={isHackathon ? "default" : "secondary"}>
              {isHackathon ? "Hackathon" : "Grant"}
            </Badge>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              &times;
            </button>
          </div>
          <CardTitle className="text-lg">{event.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Dates */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {format(event.start, "MMM d")} - {format(event.end, "MMM d, yyyy")}
            </span>
          </div>

          {/* Prize Pool */}
          {event.prizePool && (
            <div className="flex items-center gap-2 text-sm">
              <Award className="h-4 w-4 text-yellow-500" />
              <span className="font-semibold">
                ${event.prizePool.amount.toLocaleString()}{" "}
                {event.prizePool.currency}
              </span>
            </div>
          )}

          {/* Format */}
          {event.format && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="capitalize">{event.format}</span>
            </div>
          )}

          {/* Chains */}
          {event.chains.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {event.chains.slice(0, 4).map((chain) => (
                <Badge key={chain} variant="outline" className="text-xs">
                  {chain}
                </Badge>
              ))}
              {event.chains.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{event.chains.length - 4}
                </Badge>
              )}
            </div>
          )}

          {/* Categories */}
          {event.categories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {event.categories.slice(0, 3).map((category) => (
                <Badge key={category} variant="secondary" className="text-xs">
                  {category}
                </Badge>
              ))}
            </div>
          )}

          {/* Action Button */}
          <Button className="w-full" asChild>
            <a href={event.url} target="_blank" rel="noopener noreferrer">
              {isHackathon ? "Register" : "Apply"}
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
