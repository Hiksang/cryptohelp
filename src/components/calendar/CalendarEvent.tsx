"use client";

import type { CalendarEvent as CalendarEventType } from "@/lib/shared";
import { Badge } from "@/components/ui/badge";

interface CalendarEventProps {
  event: CalendarEventType;
}

export function CalendarEvent({ event }: CalendarEventProps) {
  return (
    <div className="flex items-center gap-1 overflow-hidden">
      <span className="truncate text-xs font-medium">{event.title}</span>
      {event.prizePool && (
        <Badge variant="secondary" className="hidden text-[10px] md:inline-flex">
          ${(event.prizePool.amount / 1000).toFixed(0)}k
        </Badge>
      )}
    </div>
  );
}
