import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createHash } from "crypto";

// Hash IP for privacy (don't store actual IPs)
function hashIP(ip: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex").substring(0, 16);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventType, eventName, pageUrl, referrer, properties, sessionId, userAgent } = body;

    // Validate required fields
    if (!eventType || !eventName) {
      return NextResponse.json(
        { error: "eventType and eventName are required" },
        { status: 400 }
      );
    }

    // Get client IP (hashed for privacy)
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0].trim() || null;
    const ipHash = hashIP(ip);

    const supabase = createServerClient();

    const { error } = await supabase.from("analytics_events").insert({
      event_type: eventType,
      event_name: eventName,
      page_url: pageUrl || null,
      referrer: referrer || null,
      properties: properties || {},
      session_id: sessionId || null,
      user_agent: userAgent || null,
      ip_hash: ipHash,
    });

    if (error) {
      console.error("Failed to save analytics event:", error);
      // Don't return error to client - analytics failure shouldn't break UX
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Analytics API error:", error);
    // Always return success to avoid breaking client
    return NextResponse.json({ success: true });
  }
}
