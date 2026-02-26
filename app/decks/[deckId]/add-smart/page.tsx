import Link from "next/link";
import { notFound } from "next/navigation";
import SmartAddClient from "@/components/SmartAddClient";
import { prisma } from "@/lib/prisma";

type Props = {
  params: { deckId: string };
};

export default async function SmartAddPage({ params }: Props) {
  const deck = await prisma.deck.findUnique({ where: { id: params.deckId } });
  if (!deck) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Smart Add: {deck.name}</h1>
          <p className="text-sm text-slate-600">Введи одно слово, приложение предложит карточку.</p>
        </div>
        <Link href={`/decks/${deck.id}`} className="text-sm">
          Back to deck
        </Link>
      </div>

      <SmartAddClient deckId={deck.id} />
    </div>
  );
}
