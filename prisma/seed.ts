import { PrismaClient } from "@prisma/client";
import { startOfLocalDay } from "../lib/date";

const prisma = new PrismaClient();

async function main() {
  const deck = await prisma.deck.upsert({
    where: { id: "everyday-english-seed" },
    update: { name: "Everyday English" },
    create: {
      id: "everyday-english-seed",
      name: "Everyday English"
    }
  });

  const cards = [
    ["How are you?", "A common greeting asking about someone's condition."],
    ["Take your time", "There is no need to hurry."],
    ["I'm looking forward to it", "I am excited about a future event."],
    ["Could you repeat that?", "Please say that again."],
    ["That makes sense", "I understand and agree with the explanation."],
    ["I'm not sure", "I do not know or feel uncertain."],
    ["What do you mean?", "Please explain your meaning."],
    ["It depends", "The answer changes based on the situation."],
    ["Let's keep in touch", "Let's continue communicating."],
    ["Sounds good", "I agree; that is a good plan."]
  ];

  for (let i = 0; i < cards.length; i += 1) {
    const [frontText, backText] = cards[i];
    await prisma.card.upsert({
      where: { id: `seed-card-${i + 1}` },
      update: {
        targetWord: frontText.replace(/[?!.]/g, "").toLowerCase(),
        frontText,
        backText,
        phonetic: undefined,
        audioUrl: undefined,
        imageUrl: `https://picsum.photos/seed/english-${i + 1}/400/240`,
        tags: "daily,conversation",
        level: (i % 3) + 1,
        deckId: deck.id
      },
      create: {
        id: `seed-card-${i + 1}`,
        deckId: deck.id,
        targetWord: frontText.replace(/[?!.]/g, "").toLowerCase(),
        frontText,
        backText,
        phonetic: undefined,
        audioUrl: undefined,
        imageUrl: `https://picsum.photos/seed/english-${i + 1}/400/240`,
        tags: "daily,conversation",
        level: (i % 3) + 1
      }
    });
  }

  console.log(
    `Seed complete. Deck "${deck.name}" ready with ${cards.length} cards. Today: ${startOfLocalDay(new Date()).toISOString()}`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
