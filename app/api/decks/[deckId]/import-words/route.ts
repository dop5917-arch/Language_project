import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildPublicUrl } from "@/lib/request-url";

type Context = {
  params: { deckId: string };
};

type SmartDraftResponse = {
  draft?: {
    word: string;
    targetWord?: string;
    phonetic?: string;
    audioUrl?: string;
    frontText: string;
    backText: string;
    imageUrl?: string;
    tags?: string;
    level?: number;
  };
  error?: string;
};

type SmartDraft = NonNullable<SmartDraftResponse["draft"]>;

type DictionaryApiEntry = {
  meanings?: Array<{
    partOfSpeech?: string;
    definitions?: Array<{
      definition?: string;
      example?: string;
    }>;
  }>;
};

function buildSentenceFallback(word: string, partOfSpeech?: string) {
  const pos = (partOfSpeech ?? "").toLowerCase();
  const isAbstractNoun =
    pos === "noun" &&
    /(tion|sion|ment|ness|ity|ism|ship|ance|ence|hood|acy|ure)$/i.test(word);
  if (pos === "noun" && isAbstractNoun) {
    return {
      front: `People online criticized the ad for ${word}.`,
      back: `The manager called it ${word} and ended the discussion.`
    };
  }
  if (pos === "verb") {
    return {
      front: `I had to ${word} the plan before the meeting.`,
      back: `She will ${word} him as soon as she gets home.`
    };
  }
  if (pos === "adjective") {
    return {
      front: `The room felt ${word} after everyone left.`,
      back: `His message sounded ${word} during the call.`
    };
  }
  if (pos === "adverb") {
    return {
      front: `She answered ${word} when the manager asked.`,
      back: `He spoke ${word} so everyone could follow him.`
    };
  }
  return {
    front: `People discussed ${word} during lunch at the office.`,
    back: `She brought up ${word} in a call with her friend.`
  };
}

function buildFallbackWhy(sentence: string): string {
  const short = sentence.trim().replace(/\s+/g, " ").split(" ").slice(0, 6).join(" ");
  return `because this context uses it as ${short.toLowerCase()}`;
}

function normalizeWord(value: string) {
  return value
    .trim()
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function looksLikeHeaderCell(value: string) {
  const v = normalizeWord(value);
  return ["word", "words", "слово", "translation", "english"].includes(v);
}

function isEnglishStudyWord(value: string) {
  const v = normalizeWord(value);
  return /^[a-z][a-z' -]*$/.test(v);
}

function parseCsvRows(csvText: string): string[][] {
  const parsed = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: true
  });

  if (parsed.errors.length > 0) {
    throw new Error(`CSV parse error: ${parsed.errors[0].message}`);
  }

  return parsed.data.map((row) => row.map((cell) => (typeof cell === "string" ? cell : "")));
}

function detectEnglishColumn(rows: string[][]): number {
  const maxColumns = rows.reduce((max, row) => Math.max(max, row.length), 0);
  let bestCol = 2; // fallback to C
  let bestScore = -1;

  for (let col = 0; col < maxColumns; col += 1) {
    let englishCount = 0;
    let nonEmptyCount = 0;

    for (let i = 0; i < rows.length; i += 1) {
      const raw = (rows[i]?.[col] ?? "").trim();
      if (!raw) continue;
      if (i === 0 && looksLikeHeaderCell(raw)) continue;
      nonEmptyCount += 1;
      if (isEnglishStudyWord(raw)) englishCount += 1;
    }

    const score = nonEmptyCount === 0 ? -1 : englishCount * 10 - (nonEmptyCount - englishCount);
    if (score > bestScore) {
      bestScore = score;
      bestCol = col;
    }
  }

  return bestCol;
}

function extractWordsFromDetectedColumn(rows: string[][], columnIndex: number) {
  const wordsRaw: string[] = [];
  const skippedNonEnglish: string[] = [];

  rows.forEach((row, index) => {
    const rawCell = (row?.[columnIndex] ?? "").trim();
    const value = normalizeWord(rawCell);
    if (!value) return;

    if (index === 0 && looksLikeHeaderCell(value)) return;
    if (!isEnglishStudyWord(value)) {
      skippedNonEnglish.push(rawCell);
      return;
    }
    wordsRaw.push(value);
  });

  const seen = new Set<string>();
  const words: string[] = [];
  const skippedDuplicatesInFile: string[] = [];
  for (const word of wordsRaw) {
    const key = normalizeWord(word);
    if (!key) continue;
    if (seen.has(key)) {
      skippedDuplicatesInFile.push(word.trim());
      continue;
    }
    seen.add(key);
    words.push(word.trim());
  }
  return {
    words,
    skippedNonEnglish,
    skippedDuplicatesInFile
  };
}

async function fetchSmartDraft(req: NextRequest, word: string): Promise<SmartDraft> {
  const url = new URL("/api/word-helper", req.url);
  url.searchParams.set("mode", "import");
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ word }),
    cache: "no-store"
  });

  const data = (await res.json()) as SmartDraftResponse;
  if (!res.ok || !data.draft) {
    throw new Error(data.error ?? `Failed to generate draft for "${word}"`);
  }

  return data.draft;
}

async function fetchDictionaryFallbackDraft(word: string): Promise<SmartDraft | null> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store"
      }
    );
    if (!res.ok) return null;

    const data = (await res.json()) as unknown;
    if (!Array.isArray(data) || data.length === 0) return null;
    const entries = data as DictionaryApiEntry[];

    const examples: string[] = [];
    let definition: string | undefined;
    let partOfSpeech: string | undefined;

    for (const entry of entries) {
      for (const meaning of entry.meanings ?? []) {
        for (const def of meaning.definitions ?? []) {
          if (!definition && def.definition?.trim()) {
            definition = def.definition.trim();
            partOfSpeech = meaning.partOfSpeech?.trim();
          }
          if (def.example?.trim()) examples.push(def.example.trim());
          if (examples.length >= 2 && definition) break;
        }
        if (examples.length >= 2 && definition) break;
      }
      if (examples.length >= 2 && definition) break;
    }

    const fallback = buildSentenceFallback(word, partOfSpeech);
    const frontText = examples[0] ?? fallback.front;
    const backSentence = examples[1] ?? fallback.back;
    const backText = [
      `Word: ${word}`,
      ...(definition ? [`Definition (EN): ${definition}`] : []),
      `Example: ${backSentence}`,
      `Why this word here: ${buildFallbackWhy(backSentence)}`
    ].join("\n");

    return {
      word,
      targetWord: word,
      frontText,
      backText,
      tags: `smart-add,vocab,${word}`,
      level: 1
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest, { params }: Context) {
  const formData = await req.formData();
  const file = formData.get("file");
  const limitRaw = formData.get("limit");
  const limit =
    typeof limitRaw === "string" && limitRaw.trim()
      ? Math.max(1, Math.min(200, Number(limitRaw) || 50))
      : 50;

  const redirectUrl = buildPublicUrl(req, `/decks/${params.deckId}/import-words`);

  try {
    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Please upload a CSV file");
    }

    const csvText = await file.text();
    const rows = parseCsvRows(csvText);
    const detectedColumnIndex = detectEnglishColumn(rows);
    const detectedColumnLabel = String.fromCharCode(65 + detectedColumnIndex);
    const { words: extractedWords, skippedNonEnglish, skippedDuplicatesInFile } =
      extractWordsFromDetectedColumn(rows, detectedColumnIndex);
    const words = extractedWords.slice(0, limit);

    if (words.length === 0) {
      throw new Error(`No English words found (detected column: ${detectedColumnLabel})`);
    }

    const deck = await prisma.deck.findUnique({ where: { id: params.deckId } });
    if (!deck) {
      throw new Error("Deck not found");
    }

    const existingCards = await prisma.card.findMany({
      where: { deckId: params.deckId },
      select: { id: true, targetWord: true, frontText: true }
    });
    const existingWords = new Set(
      existingCards
        .map((card) => normalizeWord(card.targetWord ?? ""))
        .filter(Boolean)
    );

    let imported = 0;
    let skipped = skippedNonEnglish.length + skippedDuplicatesInFile.length;
    let errors = 0;
    const skippedSamples: string[] = [
      ...skippedNonEnglish.map((w) => `${w} (not English)`),
      ...skippedDuplicatesInFile.map((w) => `${w} (duplicate in file)`)
    ];
    const errorSamples: string[] = [];
    const importedSamples: string[] = [];

    for (const word of words) {
      const normalized = normalizeWord(word);
      if (existingWords.has(normalized)) {
        skipped += 1;
        if (skippedSamples.length < 10) skippedSamples.push(`${word} (already in deck)`);
        continue;
      }

      try {
        let draft: SmartDraft | null = null;
        try {
          draft = await fetchSmartDraft(req, word);
        } catch {
          draft = await fetchDictionaryFallbackDraft(word);
        }
        if (!draft) throw new Error(`Empty draft for "${word}"`);
        await prisma.card.create({
          data: {
            deckId: params.deckId,
            targetWord: draft.targetWord ?? draft.word ?? word,
            phonetic: draft.phonetic,
            audioUrl: draft.audioUrl,
            frontText: draft.frontText,
            backText: draft.backText,
            // For automatic import, keep cards image-free by default.
            imageUrl: null,
            tags: draft.tags ?? `smart-add,vocab,${normalized}`,
            level: draft.level ?? 1
          }
        });
        existingWords.add(normalized);
        imported += 1;
        if (importedSamples.length < 10) importedSamples.push(word);
      } catch {
        errors += 1;
        if (errorSamples.length < 10) errorSamples.push(word);
      }
    }

    revalidatePath(`/decks/${params.deckId}`);
    revalidatePath(`/decks/${params.deckId}/today`);
    revalidatePath(`/decks/${params.deckId}/review-all`);

    redirectUrl.searchParams.set("imported", String(imported));
    redirectUrl.searchParams.set("skipped", String(skipped));
    if (errors > 0) redirectUrl.searchParams.set("errors", String(errors));
    redirectUrl.searchParams.set("column", detectedColumnLabel);
    if (importedSamples.length > 0) {
      redirectUrl.searchParams.set("imported_examples", importedSamples.join(" | "));
    }
    if (skippedSamples.length > 0) {
      redirectUrl.searchParams.set("skipped_examples", skippedSamples.slice(0, 10).join(" | "));
    }
    if (errorSamples.length > 0) {
      redirectUrl.searchParams.set("error_examples", errorSamples.join(" | "));
    }
  } catch (error) {
    redirectUrl.searchParams.set("error", error instanceof Error ? error.message : "Import failed");
  }

  return NextResponse.redirect(redirectUrl, { status: 303 });
}
