import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deckSchema } from "@/lib/validations";

type Context = {
  params: { deckId: string };
};

export async function PATCH(req: NextRequest, { params }: Context) {
  try {
    const body = await req.json();
    const parsed = deckSchema.safeParse({ name: body?.name });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid deck name" },
        { status: 400 }
      );
    }

    await prisma.deck.update({
      where: { id: params.deckId },
      data: { name: parsed.data.name }
    });

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
    await prisma.deck.delete({ where: { id: params.deckId } });
    revalidatePath("/decks");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
