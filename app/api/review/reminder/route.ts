import { NextResponse } from "next/server";
import { startOfLocalDay } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const today = startOfLocalDay(new Date());
    const [dueTotal, newTotal, decks] = await Promise.all([
      prisma.reviewState.count({
        where: {
          dueDate: { lte: today }
        }
      }),
      prisma.card.count({
        where: {
          reviewState: { is: null }
        }
      }),
      prisma.deck.findMany({
        select: {
          id: true,
          name: true,
          cards: {
            select: {
              reviewState: {
                select: { dueDate: true }
              }
            }
          }
        }
      })
    ]);

    const perDeck = decks
      .map((deck) => ({
        deckId: deck.id,
        deckName: deck.name,
        dueCount: deck.cards.filter(
          (card) => card.reviewState?.dueDate && card.reviewState.dueDate <= today
        ).length
      }))
      .filter((deck) => deck.dueCount > 0)
      .sort((a, b) => b.dueCount - a.dueCount)
      .slice(0, 8);

    return NextResponse.json({
      dueTotal,
      newTotal,
      perDeck
    });
  } catch {
    return NextResponse.json(
      {
        dueTotal: 0,
        newTotal: 0,
        perDeck: []
      },
      { status: 200 }
    );
  }
}

