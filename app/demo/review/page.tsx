import ReviewClient from "@/components/ReviewClient";
import { getPublicStarterQueue, STARTER_DECK_NAME } from "@/lib/starter-deck";

export default function PublicDemoReviewPage() {
  const queue = getPublicStarterQueue();

  return (
    <div>
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
