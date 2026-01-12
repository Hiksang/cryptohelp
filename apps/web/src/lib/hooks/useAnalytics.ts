"use client";

import { useCallback, useEffect, useRef } from "react";

type EventType = "page_view" | "click" | "search" | "filter" | "external_link";

interface TrackEventOptions {
  eventName: string;
  properties?: Record<string, unknown>;
}

// Generate a simple session ID for the current browser session
function getSessionId(): string {
  if (typeof window === "undefined") return "";

  let sessionId = sessionStorage.getItem("buidltown_session_id");
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem("buidltown_session_id", sessionId);
  }
  return sessionId;
}

export function useAnalytics() {
  const sessionId = useRef<string>("");

  useEffect(() => {
    sessionId.current = getSessionId();
  }, []);

  const trackEvent = useCallback(
    async (eventType: EventType, options: TrackEventOptions) => {
      try {
        await fetch("/api/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventType,
            eventName: options.eventName,
            pageUrl: window.location.href,
            referrer: document.referrer || null,
            properties: options.properties || {},
            sessionId: sessionId.current,
            userAgent: navigator.userAgent,
          }),
        });
      } catch {
        // Silently fail - analytics should never break the user experience
      }
    },
    []
  );

  const trackPageView = useCallback(
    (pageName: string) => {
      trackEvent("page_view", {
        eventName: pageName,
        properties: {
          title: document.title,
        },
      });
    },
    [trackEvent]
  );

  const trackClick = useCallback(
    (
      elementName: string,
      properties?: { targetType?: string; targetId?: string; [key: string]: unknown }
    ) => {
      trackEvent("click", {
        eventName: elementName,
        properties: properties || {},
      });
    },
    [trackEvent]
  );

  const trackSearch = useCallback(
    (query: string, resultCount?: number) => {
      trackEvent("search", {
        eventName: "search",
        properties: { query, resultCount },
      });
    },
    [trackEvent]
  );

  const trackFilter = useCallback(
    (filterType: string, filterValue: string | string[]) => {
      trackEvent("filter", {
        eventName: `filter_${filterType}`,
        properties: { filterType, filterValue },
      });
    },
    [trackEvent]
  );

  const trackExternalLink = useCallback(
    (url: string, context?: string) => {
      trackEvent("external_link", {
        eventName: "external_link_click",
        properties: { url, context },
      });
    },
    [trackEvent]
  );

  return {
    trackEvent,
    trackPageView,
    trackClick,
    trackSearch,
    trackFilter,
    trackExternalLink,
  };
}
