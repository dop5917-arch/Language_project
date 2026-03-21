import { NextRequest, NextResponse } from "next/server";
import { buildCardFromSentenceSchema } from "@/lib/validations";

const BANNED_META = [
  "english",
  "word",
  "vocabulary",
  "dictionary",
  "translate",
  "translation",
  "learn",
  "study",
  "language"
];

type DictionaryEntry = {
  phonetic?: string;
  phonetics?: Array<{ text?: string; audio?: string }>;
  meanings?: Array<{
    partOfSpeech?: string;
    definitions?: Array<{
      definition?: string;
      example?: string;
    }>;
  }>;
};

function normalizeWord(value: string) {
  return value.trim().toLowerCase();
}

function normalizeSentence(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function tokenize(value: string): string[] {
  return (value.toLowerCase().match(/[a-z']+/g) ?? []).filter(Boolean);
}

function hasMetaWords(text: string): boolean {
  const tokens = tokenize(text);
  return tokens.some((token) => BANNED_META.includes(token));
}

function buildWordForms(word: string): Set<string> {
  const w = word.toLowerCase();
  const forms = new Set<string>([w, `${w}s`, `${w}ed`, `${w}ing`]);
  if (w.endsWith("e")) {
    forms.add(`${w}d`);
    forms.add(`${w.slice(0, -1)}ing`);
  }
  if (/[sxz]$/.test(w) || /(ch|sh)$/.test(w)) {
    forms.add(`${w}es`);
  }
  if (w.endsWith("y") && w.length > 1 && !/[aeiou]y$/.test(w)) {
    forms.add(`${w.slice(0, -1)}ies`);
    forms.add(`${w.slice(0, -1)}ied`);
  }
  return forms;
}

function hasTargetWord(text: string, word: string): boolean {
  const normalized = word.toLowerCase();
  if (/\s|-/.test(normalized)) {
    const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(text);
  }
  const forms = buildWordForms(normalized);
  return tokenize(text).some((token) => forms.has(token));
}

function similarity(a: string, b: string): number {
  const aSet = new Set(tokenize(a));
  const bSet = new Set(tokenize(b));
  if (aSet.size === 0 || bSet.size === 0) return 0;
  let same = 0;
  for (const token of aSet) {
    if (bSet.has(token)) same += 1;
  }
  return same / Math.max(Math.min(aSet.size, bSet.size), 1);
}

function shortenDefinition(definition: string, maxLength = 120): string {
  const oneLine = definition.trim().replace(/\s+/g, " ");
  if (oneLine.length <= maxLength) return oneLine;
  return `${oneLine.slice(0, maxLength - 1).trim()}…`;
}

function buildFallbackBackExample(word: string): string {
  return `People use ${word} in daily life, especially in practical situations.`;
}

function buildFallbackWhy(definition: string): string {
  const base = definition
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .slice(0, 6)
    .join(" ");
  return `because here it shows ${base || "the intended meaning clearly"}`;
}

async function fetchDictionaryData(word: string): Promise<{
  phonetic?: string;
  audioUrl?: string;
  definition?: string;
  backExample?: string;
}> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return {};
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data) || data.length === 0) return {};
    const entries = data as DictionaryEntry[];

    let phonetic: string | undefined;
    let audioUrl: string | undefined;
    let definition: string | undefined;
    let backExample: string | undefined;

    for (const entry of entries) {
      if (!phonetic && entry.phonetic?.trim()) phonetic = entry.phonetic.trim();
      if ((!phonetic || !audioUrl) && entry.phonetics?.length) {
        for (const p of entry.phonetics) {
          if (!phonetic && p.text?.trim()) phonetic = p.text.trim();
          if (!audioUrl && p.audio?.trim()) {
            const raw = p.audio.trim();
            audioUrl = raw.startsWith("//") ? `https:${raw}` : raw;
          }
        }
      }

      for (const meaning of entry.meanings ?? []) {
        for (const def of meaning.definitions ?? []) {
          if (!definition && def.definition?.trim()) {
            definition = def.definition.trim();
          }
          if (!backExample && def.example?.trim()) {
            backExample = def.example.trim();
          }
          if (definition && backExample) break;
        }
        if (definition && backExample) break;
      }
      if (definition && backExample) break;
    }

    return { phonetic, audioUrl, definition, backExample };
  } catch {
    return {};
  }
}

async function fetchLlmBackExample(word: string, frontSentence: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Generate one natural English sentence for a flashcard back side. Output JSON only with key back_sentence."
          },
          {
            role: "user",
            content: `Target word: "${word}"\nFront sentence: "${frontSentence}"\nGenerate a different context sentence, 8-18 words, no language-learning terms.`
          }
        ]
      })
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as { back_sentence?: string };
    if (!parsed.back_sentence) return null;
    return normalizeSentence(parsed.back_sentence);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = buildCardFromSentenceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const word = normalizeWord(parsed.data.word);
    const frontSentence = normalizeSentence(parsed.data.frontSentence);

    if (!hasTargetWord(frontSentence, word) || hasMetaWords(frontSentence)) {
      return NextResponse.json({ error: "Front sentence is invalid for this word" }, { status: 400 });
    }

    const dictionary = await fetchDictionaryData(word);
    const shortDefinition = shortenDefinition(dictionary.definition ?? "common everyday meaning");

    let backSentence = dictionary.backExample ? normalizeSentence(dictionary.backExample) : "";
    const invalidBack =
      !backSentence ||
      !hasTargetWord(backSentence, word) ||
      hasMetaWords(backSentence) ||
      similarity(frontSentence, backSentence) >= 0.7;

    if (invalidBack) {
      const llmBack = await fetchLlmBackExample(word, frontSentence);
      if (
        llmBack &&
        hasTargetWord(llmBack, word) &&
        !hasMetaWords(llmBack) &&
        similarity(frontSentence, llmBack) < 0.7
      ) {
        backSentence = llmBack;
      }
    }

    if (!backSentence) {
      backSentence = buildFallbackBackExample(word);
    }

    const whyThisWordHere = buildFallbackWhy(shortDefinition);
    const backText = [
      `Word: ${word}`,
      `Definition (EN): ${shortDefinition}`,
      `Example: ${backSentence}`,
      `Why this word here: ${whyThisWordHere}`
    ].join("\n");

    return NextResponse.json({
      targetWord: word,
      phonetic: dictionary.phonetic,
      audioUrl: dictionary.audioUrl,
      shortDefinition,
      backSentence,
      whyThisWordHere,
      backText
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
