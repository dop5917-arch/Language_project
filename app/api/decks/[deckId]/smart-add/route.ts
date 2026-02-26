import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cardSchema } from "@/lib/validations";

type Context = {
  params: { deckId: string };
};

export async function POST(req: NextRequest, { params }: Context) {
  try {
    const body = await req.json();
    const parsed = cardSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid card data" },
        { status: 400 }
      );
    }

    const deck = await prisma.deck.findUnique({ where: { id: params.deckId } });
    if (!deck) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    const card = await prisma.card.create({
      data: {
        deckId: params.deckId,
        targetWord: parsed.data.targetWord,
        frontText: parsed.data.frontText,
        backText: parsed.data.backText,
        phonetic: parsed.data.phonetic,
        audioUrl: parsed.data.audioUrl,
        imageUrl: parsed.data.imageUrl,
        tags: parsed.data.tags,
        level: parsed.data.level
      }
    });

    revalidatePath(`/decks/${params.deckId}`);
    revalidatePath(`/decks/${params.deckId}/today`);

    return NextResponse.json({ ok: true, cardId: card.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
