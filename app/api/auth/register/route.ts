import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSession, hashPassword, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureStarterDeckForUser } from "@/lib/starter-deck";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Укажи имя"),
  email: z.string().trim().email("Укажи корректный email"),
  password: z.string().min(6, "Пароль должен быть не короче 6 символов")
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Некорректные данные" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
      select: { id: true }
    });
    if (existing) {
      return NextResponse.json({ error: "Пользователь с таким email уже существует" }, { status: 400 });
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        passwordHash
      },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    await ensureStarterDeckForUser(user.id);

    const session = await createSession(user.id);
    await setSessionCookie(session.token, session.expiresAt);

    return NextResponse.json({ ok: true, user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Не удалось создать аккаунт" },
      { status: 500 }
    );
  }
}
