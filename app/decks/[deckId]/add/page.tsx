import Link from "next/link";
import { notFound } from "next/navigation";
import AddCardForm from "@/components/AddCardForm";
import { createCardAction } from "@/lib/actions";
import { getCurrentUserId } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type Props = {
  params: { deckId: string };
};

export default async function AddCardPage({ params }: Props) {
  const userId = await getCurrentUserId();
  const deck = await prisma.deck.findFirst({ where: { id: params.deckId, userId } });
  if (!deck) notFound();

  const action = createCardAction.bind(null, deck.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Создать карточку: {deck.name}</h1>
        <Link href={`/decks/${deck.id}`} className="text-sm">
          Назад в колоду
        </Link>
      </div>

      <AddCardForm action={action} />
    </div>
  );
}
