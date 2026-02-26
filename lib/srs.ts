import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addDaysLocal, startOfLocalDay } from "@/lib/date";

export type Rating = "Again" | "Hard" | "Good" | "Easy";
export type RatingFilter = Rating | "Difficult" | "Learned" | "all";
const FIXED_INTERVAL_STEPS_DAYS = [1, 3, 7, 30] as const;

export type QueueItem = {
  card: {
    id: string;
    deckId: string;
    targetWord: string | null;
    phonetic: string | null;
    audioUrl: string | null;
    frontText: string;
    backText: string;
    imageUrl: string | null;
    tags: string | null;
    level: number | null;
  };
  reviewState: {
    ease: number;
    intervalDays: number;
    dueDate: Date;
    reps: number;
    lapses: number;
    lastReviewedAt: Date | null;
  } | null;
  isNew: boolean;
};

function getFixedStepIndex(intervalDays: number): number {
  if (intervalDays <= 0) return -1;
  const exactIndex = FIXED_INTERVAL_STEPS_DAYS.findIndex((step) => step === intervalDays);
  if (exactIndex >= 0) return exactIndex;
  const nextIndex = FIXED_INTERVAL_STEPS_DAYS.findIndex((step) => intervalDays < step);
  if (nextIndex === -1) return FIXED_INTERVAL_STEPS_DAYS.length - 1;
  return Math.max(0, nextIndex - 1);
}

export async function getTodayQueue(deckId: string, date: Date, newLimit: number): Promise<QueueItem[]> {
  const today = startOfLocalDay(date);

  const dueCards = await prisma.card.findMany({
    where: {
      deckId,
      reviewState: {
        is: {
          dueDate: {
            lte: today
          }
        }
      }
    },
    include: {
      reviewState: true
    },
    orderBy: [{ reviewState: { dueDate: "asc" } }, { createdAt: "asc" }]
  });

  const newCards = await prisma.card.findMany({
    where: {
      deckId,
      reviewState: { is: null }
    },
    orderBy: { createdAt: "asc" },
    take: newLimit
  });

  return [
    ...dueCards.map((card) => ({
      card: {
        id: card.id,
        deckId: card.deckId,
        targetWord: card.targetWord,
        phonetic: card.phonetic,
        audioUrl: card.audioUrl,
        frontText: card.frontText,
        backText: card.backText,
        imageUrl: card.imageUrl,
        tags: card.tags,
        level: card.level
      },
      reviewState: card.reviewState
        ? {
            ease: card.reviewState.ease,
            intervalDays: card.reviewState.intervalDays,
            dueDate: card.reviewState.dueDate,
            reps: card.reviewState.reps,
            lapses: card.reviewState.lapses,
            lastReviewedAt: card.reviewState.lastReviewedAt
          }
        : null,
      isNew: false
    })),
    ...newCards.map((card) => ({
      card: {
        id: card.id,
        deckId: card.deckId,
        targetWord: card.targetWord,
        phonetic: card.phonetic,
        audioUrl: card.audioUrl,
        frontText: card.frontText,
        backText: card.backText,
        imageUrl: card.imageUrl,
        tags: card.tags,
        level: card.level
      },
      reviewState: null,
      isNew: true
    }))
  ];
}

export async function getFullDeckQueue(deckId: string): Promise<QueueItem[]> {
  const cards = await prisma.card.findMany({
    where: { deckId },
    include: { reviewState: true },
    orderBy: [{ createdAt: "asc" }]
  });

  return cards.map((card) => ({
    card: {
      id: card.id,
      deckId: card.deckId,
      targetWord: card.targetWord,
      phonetic: card.phonetic,
      audioUrl: card.audioUrl,
      frontText: card.frontText,
      backText: card.backText,
      imageUrl: card.imageUrl,
      tags: card.tags,
      level: card.level
    },
    reviewState: card.reviewState
      ? {
          ease: card.reviewState.ease,
          intervalDays: card.reviewState.intervalDays,
          dueDate: card.reviewState.dueDate,
          reps: card.reviewState.reps,
          lapses: card.reviewState.lapses,
          lastReviewedAt: card.reviewState.lastReviewedAt
        }
      : null,
    isNew: !card.reviewState
  }));
}

export async function getGlobalTodayQueue(date: Date, newLimit: number): Promise<QueueItem[]> {
  const today = startOfLocalDay(date);

  const dueCards = await prisma.card.findMany({
    where: {
      reviewState: {
        is: {
          dueDate: {
            lte: today
          }
        }
      }
    },
    include: {
      reviewState: true
    },
    orderBy: [{ reviewState: { dueDate: "asc" } }, { createdAt: "asc" }]
  });

  const newCards = await prisma.card.findMany({
    where: {
      reviewState: { is: null }
    },
    orderBy: { createdAt: "asc" },
    take: newLimit
  });

  return [
    ...dueCards.map((card) => ({
      card: {
        id: card.id,
        deckId: card.deckId,
        targetWord: card.targetWord,
        phonetic: card.phonetic,
        audioUrl: card.audioUrl,
        frontText: card.frontText,
        backText: card.backText,
        imageUrl: card.imageUrl,
        tags: card.tags,
        level: card.level
      },
      reviewState: card.reviewState
        ? {
            ease: card.reviewState.ease,
            intervalDays: card.reviewState.intervalDays,
            dueDate: card.reviewState.dueDate,
            reps: card.reviewState.reps,
            lapses: card.reviewState.lapses,
            lastReviewedAt: card.reviewState.lastReviewedAt
          }
        : null,
      isNew: false
    })),
    ...newCards.map((card) => ({
      card: {
        id: card.id,
        deckId: card.deckId,
        targetWord: card.targetWord,
        phonetic: card.phonetic,
        audioUrl: card.audioUrl,
        frontText: card.frontText,
        backText: card.backText,
        imageUrl: card.imageUrl,
        tags: card.tags,
        level: card.level
      },
      reviewState: null,
      isNew: true
    }))
  ];
}

export async function getGlobalFullQueue(): Promise<QueueItem[]> {
  const cards = await prisma.card.findMany({
    include: { reviewState: true },
    orderBy: [{ createdAt: "asc" }]
  });

  return cards.map((card) => ({
    card: {
      id: card.id,
      deckId: card.deckId,
      targetWord: card.targetWord,
      phonetic: card.phonetic,
      audioUrl: card.audioUrl,
      frontText: card.frontText,
      backText: card.backText,
      imageUrl: card.imageUrl,
      tags: card.tags,
      level: card.level
    },
    reviewState: card.reviewState
      ? {
          ease: card.reviewState.ease,
          intervalDays: card.reviewState.intervalDays,
          dueDate: card.reviewState.dueDate,
          reps: card.reviewState.reps,
          lapses: card.reviewState.lapses,
          lastReviewedAt: card.reviewState.lastReviewedAt
        }
      : null,
    isNew: !card.reviewState
  }));
}

export async function filterQueueByLatestRating(
  queue: QueueItem[],
  ratingFilter: RatingFilter
): Promise<QueueItem[]> {
  if (ratingFilter === "all" || queue.length === 0) {
    return queue;
  }

  const cardIds = queue.map((item) => item.card.id);
  const logs = await prisma.reviewLog.findMany({
    where: {
      cardId: { in: cardIds }
    },
    orderBy: [{ reviewedAt: "desc" }]
  });

  const latestByCard = new Map<string, string>();
  for (const log of logs) {
    if (!latestByCard.has(log.cardId)) {
      latestByCard.set(log.cardId, log.rating);
    }
  }

  return queue.filter((item) => {
    const lastRating = latestByCard.get(item.card.id);
    if (ratingFilter === "Difficult") {
      return lastRating === "Again" || lastRating === "Hard";
    }
    if (ratingFilter === "Learned") {
      return lastRating === "Good" || lastRating === "Easy";
    }
    return lastRating === ratingFilter;
  });
}

type ReviewStateSnapshot = {
  ease: number;
  intervalDays: number;
  reps: number;
  lapses: number;
};

export async function applyRating(cardId: string, rating: Rating, now: Date) {
  const today = startOfLocalDay(now);

  return prisma.$transaction(async (tx) => {
    const card = await tx.card.findUnique({
      where: { id: cardId },
      include: { reviewState: true }
    });

    if (!card) {
      throw new Error("Card not found");
    }

    const current: ReviewStateSnapshot = {
      ease: card.reviewState?.ease ?? 2.5,
      intervalDays: card.reviewState?.intervalDays ?? 0,
      reps: card.reviewState?.reps ?? 0,
      lapses: card.reviewState?.lapses ?? 0
    };

    let next: ReviewStateSnapshot = { ...current };
    let dueDate = today;

    if (rating === "Again") {
      next = {
        ease: Math.max(1.3, current.ease - 0.2),
        intervalDays: 0,
        reps: 0,
        lapses: current.lapses + 1
      };
      dueDate = today;
    }

    if (rating === "Hard") {
      const currentStep = getFixedStepIndex(current.intervalDays);
      const nextStep = Math.max(0, currentStep);
      const intervalDays = FIXED_INTERVAL_STEPS_DAYS[nextStep];
      next = {
        ease: Math.max(1.3, current.ease - 0.05),
        intervalDays,
        reps: current.reps + 1,
        lapses: current.lapses
      };
      dueDate = addDaysLocal(today, next.intervalDays);
    }

    if (rating === "Good") {
      const reps = current.reps + 1;
      const currentStep = getFixedStepIndex(current.intervalDays);
      const nextStep = Math.min(FIXED_INTERVAL_STEPS_DAYS.length - 1, currentStep + 1);
      const intervalDays = FIXED_INTERVAL_STEPS_DAYS[nextStep];

      next = {
        ease: current.ease,
        intervalDays,
        reps,
        lapses: current.lapses
      };
      dueDate = addDaysLocal(today, intervalDays);
    }

    if (rating === "Easy") {
      const ease = current.ease + 0.15;
      const currentStep = getFixedStepIndex(current.intervalDays);
      const nextStep = Math.min(FIXED_INTERVAL_STEPS_DAYS.length - 1, currentStep + 2);
      const intervalDays = FIXED_INTERVAL_STEPS_DAYS[nextStep];
      next = {
        ease,
        intervalDays,
        reps: current.reps + 1,
        lapses: current.lapses
      };
      dueDate = addDaysLocal(today, intervalDays);
    }

    const reviewStateData: Prisma.ReviewStateUncheckedCreateInput = {
      cardId,
      ease: next.ease,
      intervalDays: next.intervalDays,
      dueDate,
      reps: next.reps,
      lapses: next.lapses,
      lastReviewedAt: now
    };

    const reviewState = await tx.reviewState.upsert({
      where: { cardId },
      update: {
        ease: next.ease,
        intervalDays: next.intervalDays,
        dueDate,
        reps: next.reps,
        lapses: next.lapses,
        lastReviewedAt: now
      },
      create: reviewStateData
    });

    await tx.reviewLog.create({
      data: {
        cardId,
        reviewedAt: now,
        rating,
        prevEase: current.ease,
        newEase: reviewState.ease,
        prevIntervalDays: current.intervalDays,
        newIntervalDays: reviewState.intervalDays,
        prevReps: current.reps,
        newReps: reviewState.reps,
        dueDateAfter: reviewState.dueDate
      }
    });

    return reviewState;
  });
}
