import Link from "next/link";
import { notFound } from "next/navigation";
import SmartAddClient from "@/components/SmartAddClient";
import { getCurrentUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type Props = {
  params: { deckId: string };
};

export default async function SmartAddPage({ params }: Props) {
  const userId = await getCurrentUserId();
  const deck = await prisma.deck.findFirst({ where: { id: params.deckId, userId } });
  if (!deck) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Создать с AI: {deck.name}</h1>
          <p className="text-sm text-slate-600">
            Выбери слово, затем выбери лучший контекст из 5 примеров и создай карточку.
          </p>
        </div>
        <Link href={`/decks/${deck.id}`} className="text-sm">
          Назад в колоду
        </Link>
      </div>

      <SmartAddClient deckId={deck.id} />
    </div>
  );
}
