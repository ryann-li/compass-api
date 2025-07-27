import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function GET() {
  const { rows } = await sql`SELECT NOW() AS now`;
  return NextResponse.json(rows);
}
