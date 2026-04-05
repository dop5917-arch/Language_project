import { NextResponse } from "next/server";
import { startOfLocalDay } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const today = startOfLocalDay(new Date());

    const [totalCards, dueToday, logs] = await Promise.all([
      prisma.card.count(),
      prisma.reviewState.count({
        where: {
          dueDate: { lte: today }
        }
      }),
      prisma.reviewLog.findMany({
        orderBy: { reviewedAt: "desc" },
        select: { cardId: true, rating: true, reviewedAt: true }
      })
    ]);

    const latestByCard = new Map<string, string>();
    for (const log of logs) {
      if (!latestByCard.has(log.cardId)) {
        latestByCard.set(log.cardId, log.rating);
      }
    }
    const studiedCards = latestByCard.size;
    const remainingToMaster = Math.max(0, totalCards - studiedCards);

    const reviewsToday = logs.filter((log) => log.reviewedAt >= today).length;
    const reviewedDayKeys = new Set(logs.map((log) => dayKey(log.reviewedAt)));
    const studyDays = reviewedDayKeys.size;
    const lastActivityAt = logs.length > 0 ? logs[0].reviewedAt : null;

    return NextResponse.json({
      totalCards,
      studiedCards,
      remainingToMaster,
      dueToday,
      reviewsToday,
      studyDays,
      lastActivityAt: lastActivityAt?.toISOString() ?? null
    });
  } catch {
    return NextResponse.json(
      {
        totalCards: 0,
        studiedCards: 0,
        remainingToMaster: 0,
        dueToday: 0,
        reviewsToday: 0,
        studyDays: 0,
        lastActivityAt: null
      },
      { status: 200 }
    );
  }
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}
