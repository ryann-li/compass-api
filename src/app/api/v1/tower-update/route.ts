import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Just echo back what you send
  const body = await req.json();
  return NextResponse.json({ received: body });
}

// support preflight if you call from browser
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}
