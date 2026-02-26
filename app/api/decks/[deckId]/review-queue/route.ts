import { NextRequest, NextResponse } from "next/server";
import { getTodayQueue } from "@/lib/srs";
import { reviewQueueQuerySchema } from "@/lib/validations";

type Context = {
  params: { deckId: string };
};

export async function GET(req: NextRequest, { params }: Context) {
  try {
    const query = Object.fromEntries(req.nextUrl.searchParams.entries());
    const parsed = reviewQueueQuerySchema.safeParse(query);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    }

    const queue = await getTodayQueue(params.deckId, new Date(), parsed.data.newLimit);
    return NextResponse.json({
      queue: queue.map((item) => ({
        card: item.card,
        reviewState: item.reviewState
          ? {
              ...item.reviewState,
              dueDate: item.reviewState.dueDate.toISOString(),
              lastReviewedAt: item.reviewState.lastReviewedAt?.toISOString() ?? null
            }
          : null,
        isNew: item.isNew
      }))
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
