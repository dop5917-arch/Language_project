import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/current-user";
import { deckSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const userId = await getCurrentUserId();
    const body = await req.json();
    const parsed = deckSchema.safeParse({ name: body?.name });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid deck name" },
        { status: 400 }
      );
    }

    const deck = await prisma.deck.create({
      data: {
        name: parsed.data.name,
        userId
      },
      select: { id: true, name: true }
    });

    revalidatePath("/decks");
    return NextResponse.json({ deck });
  } catch {
    return NextResponse.json({ error: "Failed to create deck" }, { status: 500 });
  }
}
