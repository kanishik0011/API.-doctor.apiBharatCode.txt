import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { configured: Boolean(process.env.BHARATCODE_API_KEY), model: process.env.BHARATCODE_MODEL || "qwen-3.8-27b" },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
