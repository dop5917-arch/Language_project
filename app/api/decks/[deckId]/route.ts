import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { deckSchema } from "@/lib/validations";

type Context = {
  params: { deckId: string };
};

export async function PATCH(req: NextRequest, { params }: Context) {
  try {
    const userId = await getCurrentUserId();
    const body = await req.json();
    const parsed = deckSchema.safeParse({ name: body?.name });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid deck name" },
        { status: 400 }
      );
    }

    const result = await prisma.deck.updateMany({
      where: { id: params.deckId, userId },
      data: { name: parsed.data.name }
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }

    revalidatePath("/decks");
    revalidatePath(`/decks/${params.deckId}`);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}

export async function DELETE(_: NextRequest, { params }: Context) {
  try {
    const userId = await getCurrentUserId();
    const result = await prisma.deck.deleteMany({ where: { id: params.deckId, userId } });
    if (result.count === 0) {
      return NextResponse.json({ error: "Deck not found" }, { status: 404 });
    }
    revalidatePath("/decks");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
