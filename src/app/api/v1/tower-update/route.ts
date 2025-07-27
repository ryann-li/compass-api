// app/api/v1/tower-update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export const runtime = "nodejs";

interface TowerUpdate {
  fob_id: string;
  timestamp: string;
  location: { lat: number; lon: number; accuracy_m: number };
  event: string;
  battery_level: number;
}

// hard‑coded mapping
const FOB_MAP: Record<string, { user_id: string; full_name: string }> = {
  "FOB-12345": { user_id: "user-4", full_name: "Daniel" },
  "FOB-99999": { user_id: "user-1", full_name: "Jess" },
};

const WRITE_KEY = process.env.WRITE_KEY;

export async function POST(req: NextRequest) {
  // ─── simple Bearer check ───────────────────────────────
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!WRITE_KEY || token !== WRITE_KEY) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }

  // ─── parse payload ─────────────────────────────────────
  const body = (await req.json()) as TowerUpdate;
  const { fob_id, timestamp, location, event, battery_level } = body;

  // ─── ensure table exists ──────────────────────────────
  await sql`
    CREATE TABLE IF NOT EXISTS latest_locations (
      fob_id        text PRIMARY KEY,
      user_id       text NOT NULL,
      full_name     text NOT NULL,
      lat           double precision NOT NULL,
      lon           double precision NOT NULL,
      accuracy_m    integer,
      event         text,
      battery_level integer,
      last_updated  timestamptz NOT NULL
    );
  `;

  // ─── upsert ────────────────────────────────────────────
  const mapping =
    FOB_MAP[fob_id] ?? { user_id: "unknown", full_name: "Unknown" };

  await sql`
    INSERT INTO latest_locations
      (fob_id, user_id, full_name, lat, lon, accuracy_m, event, battery_level, last_updated)
    VALUES
      (
        ${fob_id},
        ${mapping.user_id},
        ${mapping.full_name},
        ${location.lat},
        ${location.lon},
        ${location.accuracy_m},
        ${event},
        ${battery_level},
        ${timestamp}
      )
    ON CONFLICT (fob_id) DO UPDATE SET
      user_id       = EXCLUDED.user_id,
      full_name     = EXCLUDED.full_name,
      lat           = EXCLUDED.lat,
      lon           = EXCLUDED.lon,
      accuracy_m    = EXCLUDED.accuracy_m,
      event         = EXCLUDED.event,
      battery_level = EXCLUDED.battery_level,
      last_updated  = EXCLUDED.last_updated;
  `;

  return NextResponse.json({ ok: true });
}

// support preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
      "Access-Control-Allow-Headers": "Authorization,Content-Type",
    },
  });
}
