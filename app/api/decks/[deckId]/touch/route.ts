import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Context = {
  params: { deckId: string };
};

export async function POST(_: Request, { params }: Context) {
  try {
    await prisma.deck.update({
      where: { id: params.deckId },
      data: { updatedAt: new Date() }
    });
    revalidatePath("/decks");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
