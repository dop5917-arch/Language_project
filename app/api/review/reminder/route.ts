import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import { startOfLocalDay } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    const today = startOfLocalDay(new Date());
    const [dueTotal, newTotal, decks] = await Promise.all([
      prisma.reviewState.count({
        where: {
          card: {
            deck: {
              userId
            }
          },
          dueDate: { lte: today }
        }
      }),
      prisma.card.count({
        where: {
          deck: { userId },
          reviewState: { is: null }
        }
      }),
      prisma.deck.findMany({
        where: { userId },
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
