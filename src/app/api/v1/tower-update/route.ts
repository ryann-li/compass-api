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

const WRITE_KEY = process.env.WRITE_KEY;
// Hard coding names for now, 
const NAMES = ["Ryan", "Daniel", "Jess", "Razi", "Sushant"];

export async function POST(req: NextRequest) {
  // TODO: fix auth, hard coded for now
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!WRITE_KEY || token !== WRITE_KEY) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: { "Access-Control-Allow-Origin": "*" },
      }
    );
  }

  const { fob_id, timestamp, location, event, battery_level } =
    (await req.json()) as TowerUpdate;

    // TODO: need more tables following detailed design
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

  const nameIndex = [...fob_id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % NAMES.length;
  const full_name = NAMES[nameIndex];

  await sql`
    INSERT INTO latest_locations
      (fob_id, user_id, full_name, lat, lon, accuracy_m, event, battery_level, last_updated)
    VALUES
      (
        ${fob_id},
        ${fob_id},
        ${full_name},
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

  const { rows } = await sql`
    SELECT fob_id AS user_id, full_name, lat, lon, accuracy_m, event, battery_level, last_updated
      FROM latest_locations
     WHERE fob_id = ${fob_id}
  `;
  const record = rows[0] || null;

  return NextResponse.json(record, {
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}

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
