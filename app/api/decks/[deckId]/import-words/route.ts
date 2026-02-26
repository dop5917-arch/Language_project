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
        const draft = await fetchSmartDraft(req, word);
        if (!draft) {
          throw new Error(`Empty draft for "${word}"`);
        }
        await prisma.card.create({
          data: {
            deckId: params.deckId,
            targetWord: draft.targetWord ?? draft.word ?? word,
            phonetic: draft.phonetic,
            audioUrl: draft.audioUrl,
            frontText: draft.frontText,
            backText: draft.backText,
            imageUrl: draft.imageUrl,
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
