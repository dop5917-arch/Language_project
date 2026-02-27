"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { cardFormSchema, deckSchema } from "@/lib/validations";

function formValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function createDeckAction(formData: FormData) {
  const parsed = deckSchema.safeParse({
    name: formValue(formData, "name")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid deck name");
  }

  await prisma.deck.create({
    data: { name: parsed.data.name }
  });

  revalidatePath("/decks");
  redirect("/decks");
}

export async function renameDeckAction(deckId: string, formData: FormData) {
  const parsed = deckSchema.safeParse({
    name: formValue(formData, "name")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid deck name");
  }

  await prisma.deck.update({
    where: { id: deckId },
    data: { name: parsed.data.name }
  });

  revalidatePath("/decks");
  revalidatePath(`/decks/${deckId}`);
  redirect("/decks");
}

export async function deleteDeckAction(deckId: string) {
  await prisma.deck.delete({
    where: { id: deckId }
  });

  revalidatePath("/decks");
  redirect("/decks");
}

export async function createCardAction(deckId: string, formData: FormData) {
  const parsed = cardFormSchema.safeParse({
    targetWord: formValue(formData, "targetWord"),
    frontText: formValue(formData, "frontText"),
    backText: formValue(formData, "backText"),
    phonetic: formValue(formData, "phonetic"),
    audioUrl: formValue(formData, "audioUrl"),
    imageUrl: formValue(formData, "imageUrl"),
    tags: formValue(formData, "tags"),
    level: formValue(formData, "level")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid card");
  }

  await prisma.card.create({
    data: {
      deckId,
      targetWord: parsed.data.targetWord,
      frontText: parsed.data.frontText,
      backText: parsed.data.backText,
      phonetic: parsed.data.phonetic,
      audioUrl: parsed.data.audioUrl,
      imageUrl: parsed.data.imageUrl,
      tags: parsed.data.tags,
      level: parsed.data.level
    }
  });

  revalidatePath(`/decks/${deckId}`);
  revalidatePath(`/decks/${deckId}/today`);
  redirect(`/decks/${deckId}`);
}

export async function updateCardAction(deckId: string, cardId: string, formData: FormData) {
  const parsed = cardFormSchema.safeParse({
    targetWord: formValue(formData, "targetWord"),
    frontText: formValue(formData, "frontText"),
    backText: formValue(formData, "backText"),
    phonetic: formValue(formData, "phonetic"),
    audioUrl: formValue(formData, "audioUrl"),
    imageUrl: formValue(formData, "imageUrl"),
    tags: formValue(formData, "tags"),
    level: formValue(formData, "level")
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid card");
  }

  const existing = await prisma.card.findUnique({
    where: { id: cardId },
    select: { id: true, deckId: true }
  });
  if (!existing || existing.deckId !== deckId) {
    throw new Error("Card not found");
  }

  await prisma.card.update({
    where: { id: cardId },
    data: {
      targetWord: parsed.data.targetWord,
      frontText: parsed.data.frontText,
      backText: parsed.data.backText,
      phonetic: parsed.data.phonetic,
      audioUrl: parsed.data.audioUrl,
      imageUrl: parsed.data.imageUrl,
      tags: parsed.data.tags,
      level: parsed.data.level
    }
  });

  revalidatePath(`/decks/${deckId}`);
  revalidatePath(`/decks/${deckId}/today`);
  revalidatePath(`/decks/${deckId}/review`);
  revalidatePath(`/decks/${deckId}/review-all`);
  redirect(`/decks/${deckId}`);
}
