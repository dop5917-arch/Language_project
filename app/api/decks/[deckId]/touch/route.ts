import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type Context = {
  params: { deckId: string };
};

export async function POST(_: Request, { params }: Context) {
  try {
    const userId = await getCurrentUserId();
    const result = await prisma.deck.updateMany({
      where: { id: params.deckId, userId },
      data: { updatedAt: new Date() }
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }
    revalidatePath("/decks");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
