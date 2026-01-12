"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAnalytics } from "@/lib/hooks";

function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    // Track page view on route change
    const pageName = getPageName(pathname);
    trackPageView(pageName);
  }, [pathname, searchParams, trackPageView]);

  return null;
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <AnalyticsTracker />
      </Suspense>
      {children}
    </>
  );
}

function getPageName(pathname: string): string {
  if (pathname === "/") return "home";
  if (pathname === "/hackathons") return "hackathons_list";
  if (pathname.startsWith("/hackathons/")) return "hackathon_detail";
  if (pathname === "/grants") return "grants_list";
  if (pathname.startsWith("/grants/")) return "grant_detail";
  return pathname.replace(/^\//, "").replace(/\//g, "_") || "unknown";
}
