import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const deleteSchema = z.object({
  cardIds: z.array(z.string().min(1)).min(1).max(1000)
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const cards = await prisma.card.findMany({
      where: { id: { in: parsed.data.cardIds } },
      select: { id: true, deckId: true }
    });
    if (cards.length === 0) {
      return NextResponse.json({ ok: true, deleted: 0 });
    }

    const deckIds = Array.from(new Set(cards.map((card) => card.deckId)));
    const result = await prisma.card.deleteMany({ where: { id: { in: cards.map((card) => card.id) } } });

    revalidatePath("/decks");
    for (const deckId of deckIds) {
      revalidatePath(`/decks/${deckId}`);
      revalidatePath(`/decks/${deckId}/today`);
      revalidatePath(`/decks/${deckId}/review-all`);
    }

    return NextResponse.json({ ok: true, deleted: result.count });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
