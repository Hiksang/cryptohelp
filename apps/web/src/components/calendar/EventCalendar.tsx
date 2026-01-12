"use client";

import { Calendar, dateFnsLocalizer, View, Views } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { useState, useCallback, useMemo } from "react";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { CalendarEvent } from "./CalendarEvent";
import { EventPopover } from "./EventPopover";
import type { CalendarEvent as CalendarEventType } from "@cryptohelp/shared";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface EventCalendarProps {
  events: CalendarEventType[];
  onEventClick?: (event: CalendarEventType) => void;
}

export function EventCalendar({ events, onEventClick }: EventCalendarProps) {
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventType | null>(
    null
  );
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);

  const handleSelectEvent = useCallback(
    (event: CalendarEventType, e: React.SyntheticEvent) => {
      setSelectedEvent(event);
      setPopoverAnchor(e.currentTarget as HTMLElement);
      onEventClick?.(event);
    },
    [onEventClick]
  );

  const handleNavigate = useCallback((newDate: Date) => {
    setDate(newDate);
  }, []);

  const handleViewChange = useCallback((newView: View) => {
    setView(newView);
  }, []);

  const eventStyleGetter = useCallback((event: CalendarEventType) => {
    const isHackathon = event.type === "hackathon";
    return {
      style: {
        backgroundColor: isHackathon ? "#3b82f6" : "#10b981",
        borderRadius: "4px",
        opacity: 0.9,
        color: "white",
        border: "none",
        display: "block",
        fontSize: "12px",
        padding: "2px 4px",
      },
    };
  }, []);

  const components = useMemo(
    () => ({
      event: CalendarEvent,
    }),
    []
  );

  return (
    <div className="h-[calc(100vh-200px)] min-h-[600px]">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        titleAccessor="title"
        view={view}
        date={date}
        onNavigate={handleNavigate}
        onView={handleViewChange}
        onSelectEvent={handleSelectEvent}
        eventPropGetter={eventStyleGetter}
        components={components}
        popup
        selectable={false}
        views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
        className="rounded-lg border bg-white p-4"
      />

      {selectedEvent && popoverAnchor && (
        <EventPopover
          event={selectedEvent}
          anchor={popoverAnchor}
          onClose={() => {
            setSelectedEvent(null);
            setPopoverAnchor(null);
          }}
        />
      )}
    </div>
  );
}
