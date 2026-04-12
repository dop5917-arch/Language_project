import { NextResponse } from "next/server";
import { AUTH_SESSION_COOKIE, clearSessionCookie, destroySessionByToken } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const token = cookies().get(AUTH_SESSION_COOKIE)?.value;
    if (token) {
      await destroySessionByToken(token);
    }
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось выйти" },
      { status: 500 }
    );
  }
}

