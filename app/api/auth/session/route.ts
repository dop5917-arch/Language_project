import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    return NextResponse.json({
      authenticated: Boolean(user),
      user: user ?? null
    });
  } catch {
    return NextResponse.json({
      authenticated: false,
      user: null
    });
  }
}
