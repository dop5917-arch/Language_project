import { prisma } from "@/lib/prisma";

export const STARTER_DECK_NAME = "Демо-колода";

export const STARTER_CARDS = [
  {
    word: "whisper",
    frontText: "He whispered something during the movie so no one heard.\n\nПодсказка: said very quietly so others don’t hear",
    backText:
      "Word: whisper\nЗначения: шептать | прошептать | говорить шепотом\nDefinition (EN): to speak very quietly so only nearby people hear\nExample: She whispered the answer while the teacher looked away.\nWhy this word here: because he speaks quietly to avoid attention\nSynonyms: murmur | speak softly\nEmoji cue: 🤫\nFrequency: 4/5\nUsage domain: conversation",
    tags: "demo,starter",
    level: 4
  },
  {
    word: "umbrella",
    frontText: "I took an umbrella because dark clouds were gathering outside.\n\nПодсказка: used when rain is expected",
    backText:
      "Word: umbrella\nЗначения: зонт | зонтик\nDefinition (EN): a tool used to protect yourself from rain\nExample: He forgot his umbrella and got completely wet on the way home.\nWhy this word here: because it protects you from rain\nSynonyms: parasol | rain cover\nEmoji cue: ☔\nFrequency: 5/5\nUsage domain: everyday",
    tags: "demo,starter",
    level: 5
  },
  {
    word: "stubborn",
    frontText: "He is too stubborn to admit that he made a mistake.\n\nПодсказка: refuses to change opinion or accept help",
    backText:
      "Word: stubborn\nЗначения: упрямый | упорный | несговорчивый\nDefinition (EN): not willing to change your opinion or behavior\nExample: My little brother is stubborn and won’t eat anything new.\nWhy this word here: because he refuses to change his mind\nSynonyms: headstrong | determined\nEmoji cue: 😤\nFrequency: 4/5\nUsage domain: personality",
    tags: "demo,starter",
    level: 4
  },
  {
    word: "lawn",
    frontText: "They had a picnic on the green lawn behind the house.\n\nПодсказка: grass area next to a house",
    backText:
      "Word: lawn\nЗначения: лужайка | газон\nDefinition (EN): an area of short grass in a garden or yard\nExample: He spent the afternoon cutting the lawn with a noisy machine.\nWhy this word here: because it's the grassy area near a home\nSynonyms: yard | grass\nEmoji cue: 🌱\nFrequency: 3/5\nUsage domain: home",
    tags: "demo,starter",
    level: 3
  },
  {
    word: "riddle",
    frontText: "She told a funny riddle that made everyone think for a moment.\n\nПодсказка: a tricky question with a hidden answer",
    backText:
      "Word: riddle\nЗначения: загадка | головоломка\nDefinition (EN): a question or puzzle that is hard to solve\nExample: The children tried to solve the riddle during the long trip.\nWhy this word here: because it is a question with a clever answer\nSynonyms: puzzle | brain teaser\nEmoji cue: 🧩\nFrequency: 3/5\nUsage domain: fun",
    tags: "demo,starter",
    level: 3
  },
  {
    word: "distracting",
    frontText: "The loud music was distracting while I was trying to work.\n\nПодсказка: makes it hard to focus on something",
    backText:
      "Word: distracting\nЗначения: отвлекающий | мешающий сосредоточиться\nDefinition (EN): making it difficult to concentrate on something\nExample: Her phone notifications were distracting during the important meeting.\nWhy this word here: because it takes attention away from the task\nSynonyms: annoying | disturbing\nEmoji cue: 📱\nFrequency: 4/5\nUsage domain: work",
    tags: "demo,starter",
    level: 4
  },
  {
    word: "decent",
    frontText: "The hotel was decent, clean and comfortable for the price.\n\nПодсказка: good enough, not perfect but okay",
    backText:
      "Word: decent\nЗначения: приличный | неплохой | достаточно хороший\nDefinition (EN): good enough or acceptable in quality\nExample: He found a decent job after searching for several months.\nWhy this word here: because it is acceptable but not amazing\nSynonyms: acceptable | okay\nEmoji cue: 👌\nFrequency: 4/5\nUsage domain: everyday",
    tags: "demo,starter",
    level: 4
  },
  {
    word: "terrific",
    frontText: "We had a terrific time at the beach last weekend.\n\nПодсказка: very good or enjoyable experience",
    backText:
      "Word: terrific\nЗначения: отличный | замечательный | прекрасный\nDefinition (EN): very good or excellent\nExample: She did a terrific job on the presentation at work.\nWhy this word here: because the experience was very enjoyable\nSynonyms: great | fantastic\nEmoji cue: 😄\nFrequency: 4/5\nUsage domain: emotions",
    tags: "demo,starter",
    level: 4
  },
  {
    word: "fairy tale",
    frontText: "My grandmother used to tell me a fairy tale before bed.\n\nПодсказка: magical story with princes or creatures",
    backText:
      "Word: fairy tale\nЗначения: сказка | волшебная история\nDefinition (EN): a traditional story with magic and imaginary characters\nExample: The movie felt like a modern fairy tale with a happy ending.\nWhy this word here: because it describes a magical story for children\nSynonyms: storybook | fantasy story\nEmoji cue: 🧚\nFrequency: 3/5\nUsage domain: stories",
    tags: "demo,starter",
    level: 3
  }
] as const;

export function getPublicStarterQueue() {
  return STARTER_CARDS.map((card, index) => ({
    id: `public-demo-${index + 1}`,
    deckId: "public-demo",
    deckName: STARTER_DECK_NAME,
    targetWord: card.word,
    phonetic: null,
    audioUrl: null,
    frontText: card.frontText,
    backText: card.backText,
    imageUrl: null,
    tags: card.tags,
    level: card.level,
    isNew: false
  }));
}

export async function ensureStarterDeckForUser(userId: string) {
  const existingDecksCount = await prisma.deck.count({
    where: { userId }
  });

  if (existingDecksCount > 0) {
    return null;
  }

  const deck = await prisma.deck.create({
    data: {
      userId,
      name: STARTER_DECK_NAME,
      cards: {
        create: STARTER_CARDS.map((card) => ({
          targetWord: card.word,
          frontText: card.frontText,
          backText: card.backText,
          tags: card.tags,
          level: card.level
        }))
      }
    },
    select: {
      id: true,
      name: true
    }
  });

  return deck;
}
