import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("user_id");

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

  const query = userId
    ? sql`
        SELECT user_id, full_name, lat, lon, last_updated
          FROM latest_locations
         WHERE user_id = ${userId}
      ORDER BY last_updated DESC
      `
    : sql`
        SELECT user_id, full_name, lat, lon, last_updated
          FROM latest_locations
      ORDER BY last_updated DESC
      `;

  const { rows } = await query;
  return NextResponse.json(rows);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
