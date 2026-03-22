import { NextResponse } from "next/server";
import { startOfLocalDay } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const today = startOfLocalDay(new Date());
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 6);

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
    const latestRatings = Array.from(latestByCard.values());
    const learnedCards = latestRatings.filter((r) => r === "Easy").length;
    const difficultCards = latestRatings.filter((r) => r === "Again" || r === "Hard").length;
    const retainedCards = latestRatings.filter((r) => r === "Good" || r === "Easy").length;

    const reviewsToday = logs.filter((log) => log.reviewedAt >= today).length;
    const reviewsLast7 = logs.filter((log) => log.reviewedAt >= weekStart).length;
    const dailyGoal = Math.max(20, dueToday);
    const dailyProgressPercent = Math.min(100, Math.round((reviewsToday / Math.max(1, dailyGoal)) * 100));

    const reviewedDayKeys = new Set(logs.map((log) => dayKey(log.reviewedAt)));
    let streakDays = 0;
    const cursor = new Date(today);
    while (reviewedDayKeys.has(dayKey(cursor))) {
      streakDays += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return NextResponse.json({
      totalCards,
      dueToday,
      learnedCards,
      difficultCards,
      retentionPercent:
        latestRatings.length > 0 ? Math.round((retainedCards / latestRatings.length) * 100) : 0,
      masteryPercent: totalCards > 0 ? Math.round((learnedCards / totalCards) * 100) : 0,
      dailyProgressPercent,
      reviewsToday,
      reviewsLast7,
      dailyGoal,
      streakDays
    });
  } catch {
    return NextResponse.json(
      {
        totalCards: 0,
        dueToday: 0,
        learnedCards: 0,
        difficultCards: 0,
        retentionPercent: 0,
        masteryPercent: 0,
        dailyProgressPercent: 0,
        reviewsToday: 0,
        reviewsLast7: 0,
        dailyGoal: 20,
        streakDays: 0
      },
      { status: 200 }
    );
  }
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}
