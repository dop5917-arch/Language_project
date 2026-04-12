import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

const previewSchema = z.object({
  createdCardIds: z.array(z.string().min(1)).min(1).max(500)
});

type Row = {
  id: string;
  deckId: string;
  deckName: string;
  targetWord: string | null;
  createdAt: Date;
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const body = await req.json();
    const parsed = previewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const createdIds = parsed.data.createdCardIds;
    const createdCards = await prisma.card.findMany({
      where: {
        id: { in: createdIds },
        deck: { userId }
      },
      select: { id: true, targetWord: true }
    });

    const createdWords = Array.from(
      new Set(
        createdCards
          .map((card) => (card.targetWord ?? "").trim())
          .filter(Boolean)
          .map(normalizeKey)
      )
    );

    if (createdWords.length === 0) {
      return NextResponse.json({ groups: [], recommendedDeleteIds: [] });
    }

    const rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
      SELECT c.id, c."deckId", d.name as "deckName", c."targetWord", c."createdAt"
      FROM "Card" c
      JOIN "Deck" d ON d.id = c."deckId"
      WHERE c."targetWord" IS NOT NULL
        AND d."userId" = ${userId}
        AND LOWER(TRIM(c."targetWord")) IN (${Prisma.join(createdWords)})
    `);

    const createdSet = new Set(createdIds);
    const byKey = new Map<string, Row[]>();
    for (const row of rows) {
      const key = normalizeKey(row.targetWord ?? "");
      if (!key) continue;
      const current = byKey.get(key) ?? [];
      current.push(row);
      byKey.set(key, current);
    }

    const groups: Array<{
      word: string;
      items: Array<{
        id: string;
        deckId: string;
        deckName: string;
        targetWord: string;
        createdAt: string;
        isCreatedNow: boolean;
      }>;
    }> = [];
    const recommendedDeleteIds: string[] = [];

    for (const [key, items] of byKey.entries()) {
      if (items.length < 2) continue;
      if (!items.some((item) => createdSet.has(item.id))) continue;

      const sorted = [...items].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      const keepId = sorted[0]?.id;
      for (const item of sorted) {
        if (item.id !== keepId) {
          recommendedDeleteIds.push(item.id);
        }
      }

      groups.push({
        word: key,
        items: sorted.map((item) => ({
          id: item.id,
          deckId: item.deckId,
          deckName: item.deckName,
          targetWord: (item.targetWord ?? key).trim() || key,
          createdAt: item.createdAt.toISOString(),
          isCreatedNow: createdSet.has(item.id)
        }))
      });
    }

    return NextResponse.json({ groups, recommendedDeleteIds });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
