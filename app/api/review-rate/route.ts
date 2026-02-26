import { NextRequest, NextResponse } from "next/server";
import { applyRating } from "@/lib/srs";
import { ratingSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = ratingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" }, { status: 400 });
    }

    const reviewState = await applyRating(parsed.data.cardId, parsed.data.rating, new Date());
    return NextResponse.json({
      ok: true,
      reviewState: {
        cardId: reviewState.cardId,
        dueDate: reviewState.dueDate,
        intervalDays: reviewState.intervalDays,
        ease: reviewState.ease,
        reps: reviewState.reps
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
