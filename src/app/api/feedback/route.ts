import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/client";

type FeedbackInsert = Database["public"]["Tables"]["feedback"]["Insert"];
type FeedbackRow = Database["public"]["Tables"]["feedback"]["Row"];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, message, email, pageUrl, userAgent } = body;

    // Validate required fields
    if (!type || !message) {
      return NextResponse.json(
        { error: "Type and message are required" },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ["bug", "feature", "general", "content"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid feedback type" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const insertData: FeedbackInsert = {
      type,
      message,
      email: email || null,
      page_url: pageUrl || null,
      user_agent: userAgent || null,
    };

    const { data, error } = await supabase
      .from("feedback")
      .insert(insertData as never)
      .select()
      .single();

    if (error) {
      console.error("Failed to save feedback:", error);
      return NextResponse.json(
        { error: "Failed to save feedback" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: (data as FeedbackRow).id });
  } catch (error) {
    console.error("Feedback API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
