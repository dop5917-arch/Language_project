import ReviewClient from "@/components/ReviewClient";
import { getPublicStarterQueue, STARTER_DECK_NAME } from "@/lib/starter-deck";

export default function PublicDemoReviewPage() {
  const queue = getPublicStarterQueue();

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#E5E7EB]">
        <h1 className="text-2xl font-semibold text-[#111111]">Демо-повторение</h1>
        <p className="text-sm text-[#64748B]">
          Публичный режим без регистрации. Можно пролистать и оценить карточки, не сохраняя прогресс.
        </p>
      </div>

      <ReviewClient
        deckId="public-demo"
        deckName={STARTER_DECK_NAME}
        modeLabel="Демо-режим"
        initialQueue={queue}
        returnHref="/demo/deck"
        returnLabel="Назад к демо-колоде"
        persistRatings={false}
      />
    </div>
  );
}
