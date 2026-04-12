import { prisma } from "@/lib/prisma";

export async function findOwnedDeck<T>(userId: string, deckId: string, args?: T) {
  return prisma.deck.findFirst({
    where: {
      id: deckId,
      userId
    },
    ...(args ?? {})
  });
}

export async function assertOwnedDeckExists(userId: string, deckId: string) {
  const deck = await prisma.deck.findFirst({
    where: {
      id: deckId,
      userId
    },
    select: { id: true }
  });

  if (!deck) {
    throw new Error("Deck not found");
  }

  return deck;
}
