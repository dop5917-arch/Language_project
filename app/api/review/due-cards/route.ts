import { NextResponse } from "next/server";
import { startOfLocalDay } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const today = startOfLocalDay(new Date());
    const decks = await prisma.deck.findMany({
      select: {
        id: true,
        name: true,
        cards: {
          where: {
            reviewState: {
              is: {
                dueDate: { lte: today }
              }
            }
          },
          select: {
            id: true,
            targetWord: true,
            frontText: true
          },
          orderBy: [{ reviewState: { dueDate: "asc" } }, { createdAt: "asc" }]
        }
      },
      orderBy: { name: "asc" }
    });

    const filteredDecks = decks.filter((deck) => deck.cards.length > 0);
    const dueTotal = filteredDecks.reduce((sum, deck) => sum + deck.cards.length, 0);

    return NextResponse.json({
      dueTotal,
      decks: filteredDecks.map((deck) => ({
        deckId: deck.id,
        deckName: deck.name,
        cards: deck.cards
      }))
    });
  } catch {
    return NextResponse.json(
      {
        dueTotal: 0,
        decks: []
      },
      { status: 200 }
    );
  }
}
