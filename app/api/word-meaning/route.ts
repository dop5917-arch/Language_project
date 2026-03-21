import { NextRequest, NextResponse } from "next/server";
import { getLocalRuDictionary } from "@/lib/ru-mini-dictionary";
import { wordHelperSchema } from "@/lib/validations";

type DictionaryEntry = {
  phonetic?: string;
  meanings?: Array<{
    partOfSpeech?: string;
    definitions?: Array<{
      definition?: string;
      example?: string;
    }>;
  }>;
};

type RuDictionaryEntry = {
  partOfSpeech: string;
  terms: string[];
};

type WordMeaningResponse = {
  word: string;
  phonetic?: string;
  ruVariants: string[];
  ruDictionary: RuDictionaryEntry[];
  meanings: Array<{
    partOfSpeech: string;
    definitionEn: string;
    exampleEn?: string;
  }>;
};

type CachedEntry = {
  expiresAt: number;
  data: WordMeaningResponse;
};

const REQUEST_TIMEOUT_MS = 1800;
const WORD_MEANING_CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const wordMeaningCache: Map<string, CachedEntry> =
  (globalThis as { __wordMeaningCache?: Map<string, CachedEntry> }).__wordMeaningCache ??
  new Map<string, CachedEntry>();
(globalThis as { __wordMeaningCache?: Map<string, CachedEntry> }).__wordMeaningCache =
  wordMeaningCache;

function normalizeVariant(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[,.;:!?()\[\]{}"']+/, "")
    .replace(/[,.;:!?()\[\]{}"']+$/, "");
}

function hasCyrillic(value: string): boolean {
  return /[А-Яа-яЁё]/.test(value);
}

function hasLatin(value: string): boolean {
  return /[A-Za-z]/.test(value);
}

function normalizeForCompare(value: string): string {
  return normalizeVariant(value).toLowerCase();
}

function uniqueNormalized(values: string[], limit = 8): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of values) {
    const normalized = normalizeVariant(raw);
    if (!normalized) continue;
    const key = normalizeForCompare(normalized);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(hasCyrillic(normalized) ? key : normalized);
    if (out.length >= limit) break;
  }

  return out;
}

function preferCyrillic(values: string[], limit = 8): string[] {
  const normalized = uniqueNormalized(values, Math.max(limit, 16));
  const cyrillic = normalized.filter(hasCyrillic);
  if (cyrillic.length > 0) {
    const cleaned = cyrillic.filter((v) => !hasLatin(v));
    return (cleaned.length > 0 ? cleaned : cyrillic).slice(0, limit);
  }
  return normalized.slice(0, limit);
}

async function fetchJsonWithTimeout(url: string): Promise<unknown | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 60 * 60 * 24 }
    });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchRuFromGoogle(word: string): Promise<{
  variants: string[];
  dictionary: RuDictionaryEntry[];
}> {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "en");
  url.searchParams.set("tl", "ru");
  url.searchParams.set("dt", "t");
  url.searchParams.set("dt", "bd");
  url.searchParams.set("q", word);

  const data = await fetchJsonWithTimeout(url.toString());
  try {
    if (!Array.isArray(data)) return { variants: [], dictionary: [] };

    const variants = new Set<string>();
    const dictionary: RuDictionaryEntry[] = [];

    if (Array.isArray(data[0])) {
      const base = normalizeVariant(
        (data[0] as Array<[string]>).map((item) => item[0] ?? "").join("")
      );
      if (base) variants.add(base);
    }

    if (Array.isArray(data[1])) {
      for (const part of data[1] as Array<unknown>) {
        if (!Array.isArray(part)) continue;
        const partOfSpeech = typeof part[0] === "string" ? part[0] : "meaning";
        const maybeTerms = part[2];
        if (!Array.isArray(maybeTerms)) continue;
        const terms: string[] = [];
        for (const term of maybeTerms) {
          if (typeof term !== "string") continue;
          const v = normalizeVariant(term);
          if (v) {
            variants.add(v);
            terms.push(v);
          }
          if (variants.size >= 10) break;
        }
        const cleanTerms = uniqueNormalized(terms, 6);
        if (cleanTerms.length > 0) {
          dictionary.push({
            partOfSpeech,
            terms: cleanTerms
          });
        }
        if (variants.size >= 10) break;
      }
    }

    return { variants: uniqueNormalized(Array.from(variants), 8), dictionary };
  } catch {
    return { variants: [], dictionary: [] };
  }
}

async function fetchRuFromMyMemory(word: string): Promise<string[]> {
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", word);
  url.searchParams.set("langpair", "en|ru");

  const data = await fetchJsonWithTimeout(url.toString());
  if (!data || typeof data !== "object") return [];

  const parsed = data as {
    responseData?: { translatedText?: string };
    matches?: Array<{ translation?: string }>;
  };

  const values: string[] = [];
  if (parsed.responseData?.translatedText) {
    values.push(parsed.responseData.translatedText);
  }
  for (const m of parsed.matches ?? []) {
    if (m.translation) values.push(m.translation);
    if (values.length >= 12) break;
  }

  return uniqueNormalized(values, 8);
}

function getCached(word: string): WordMeaningResponse | null {
  const entry = wordMeaningCache.get(word);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    wordMeaningCache.delete(word);
    return null;
  }
  return entry.data;
}

function setCached(word: string, data: WordMeaningResponse): void {
  wordMeaningCache.set(word, {
    expiresAt: Date.now() + WORD_MEANING_CACHE_TTL_MS,
    data
  });
}

export async function GET(req: NextRequest) {
  try {
    const wordRaw = req.nextUrl.searchParams.get("word") ?? "";
    const parsed = wordHelperSchema.safeParse({ word: wordRaw });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid word" }, { status: 400 });
    }

    const word = parsed.data.word.trim().toLowerCase();
    const cached = getCached(word);
    if (cached) {
      return NextResponse.json(cached);
    }

    const local = getLocalRuDictionary(word);
    const [googleRu, myMemoryRu, dictJson] = await Promise.all([
      fetchRuFromGoogle(word),
      fetchRuFromMyMemory(word),
      fetchJsonWithTimeout(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
      )
    ]);

    const entries = Array.isArray(dictJson) ? (dictJson as DictionaryEntry[]) : [];
    const first = entries[0];
    const rawMeanings =
      first?.meanings
        ?.flatMap((meaning) =>
          (meaning.definitions ?? []).map((def) => ({
            partOfSpeech: meaning.partOfSpeech ?? "meaning",
            definitionEn: (def.definition ?? "").trim(),
            exampleEn: (def.example ?? "").trim() || undefined
          }))
        )
        .filter((item) => item.definitionEn.length > 0)
        .slice(0, 5) ?? [];
    const localVariants = local?.variants ?? [];
    const localParts = local?.parts ?? [];
    const mergedVariants = preferCyrillic(
      [...localVariants, ...googleRu.variants, ...myMemoryRu],
      8
    );
    const ruVariants =
      mergedVariants.length > 0 ? mergedVariants : ["перевод временно недоступен"];
    const ruDictionary = localParts.length > 0 ? localParts : googleRu.dictionary;

    const meanings = rawMeanings.map((item) => ({
      partOfSpeech: item.partOfSpeech,
      definitionEn: item.definitionEn,
      exampleEn: item.exampleEn
    }));

    const response: WordMeaningResponse = {
      word,
      phonetic: first?.phonetic,
      ruVariants,
      ruDictionary,
      meanings:
        meanings.length > 0
          ? meanings
          : [
              {
                partOfSpeech: "word",
                definitionEn: word
              }
            ]
    };
    setCached(word, response);

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
