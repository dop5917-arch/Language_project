import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined))
  .refine((value) => !value || /^https?:\/\//i.test(value) || /^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(value), {
    message: "image_url must be a valid http(s) URL or image file"
  });

export const deckSchema = z.object({
  name: z.string().trim().min(1, "Введите название колоды").max(100)
});

export const cardSchema = z.object({
  targetWord: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  phonetic: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  audioUrl: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined))
    .refine((value) => !value || /^https?:\/\//i.test(value), {
      message: "audioUrl must be a valid http(s) URL"
    }),
  frontText: z.string().trim().min(1, "Front phrase is required").max(500),
  backText: z.string().trim().min(1, "Заполни обратную сторону карточки").max(1000),
  imageUrl: optionalUrl,
  tags: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  level: z
    .union([z.number().int().min(1).max(10), z.nan()])
    .optional()
    .transform((value) => (typeof value === "number" && !Number.isNaN(value) ? value : undefined))
});

export const cardFormSchema = z.object({
  targetWord: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  frontText: z.string().trim().min(1, "Front phrase is required").max(500),
  backText: z.string().trim().min(1, "Заполни обратную сторону карточки").max(1000),
  phonetic: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  audioUrl: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined))
    .refine((value) => !value || /^https?:\/\//i.test(value), {
      message: "audioUrl must be a valid http(s) URL"
    }),
  imageUrl: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined))
    .refine((value) => !value || /^https?:\/\//i.test(value) || /^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(value), {
      message: "image_url must be a valid http(s) URL or image file"
    }),
  tags: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  level: z
    .string()
    .optional()
    .transform((value) => {
      if (!value || value.trim() === "") return undefined;
      const num = Number(value);
      return Number.isInteger(num) ? num : Number.NaN;
    })
    .refine((value) => value === undefined || (Number.isInteger(value) && value >= 1 && value <= 10), {
      message: "Level must be an integer from 1 to 10"
    })
});

export const ratingSchema = z.object({
  cardId: z.string().min(1),
  rating: z.enum(["Again", "Hard", "Good", "Easy"])
});

export const wordHelperSchema = z.object({
  word: z
    .string()
    .trim()
    .min(1, "Введи слово")
    .max(100, "Слово слишком длинное")
    .regex(/^[a-zA-Z][a-zA-Z' -]*$/, "Use English letters only")
});

export const sentenceOptionsSchema = z.object({
  word: wordHelperSchema.shape.word,
  exclude: z.array(z.string().trim().min(1).max(300)).max(200).optional(),
  translationHint: z.string().trim().min(1).max(200).optional()
});

export const buildCardFromSentenceSchema = z.object({
  word: wordHelperSchema.shape.word,
  frontSentence: z.string().trim().min(6, "Front sentence is too short").max(300)
});

export const sentenceTranslateSchema = z.object({
  text: z.string().trim().min(1, "Text is required").max(500),
  sourceLang: z.string().trim().min(2).max(10).optional().default("en"),
  targetLang: z.string().trim().min(2).max(10).optional().default("ru")
});

export const definitionOptionsSchema = z.object({
  word: wordHelperSchema.shape.word,
  exclude: z.array(z.string().trim().min(1).max(300)).max(200).optional(),
  translationHint: z.string().trim().min(1).max(200).optional()
});

export const whyThisWordSchema = z.object({
  word: wordHelperSchema.shape.word,
  sentence: z.string().trim().min(6).max(300),
  ruMeaning: z.string().trim().min(1).max(240).optional(),
  definitionEn: z.string().trim().min(3).max(240).optional()
});

export const reviewQueueQuerySchema = z.object({
  newLimit: z.coerce.number().int().min(1).max(100).default(20),
  dueLimit: z.coerce.number().int().min(1).max(200).default(25)
});

export const csvImportRowSchema = z.object({
  front_text: z.string().trim().min(1),
  back_text: z.string().trim().min(1),
  image_url: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined))
    .refine((value) => !value || /^https?:\/\//i.test(value), {
      message: "Invalid image_url"
    }),
  tags: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  level: z
    .union([z.number().int().min(1).max(10), z.undefined()])
    .optional()
});

export type RatingInput = z.infer<typeof ratingSchema>;
