import { NextRequest, NextResponse } from "next/server";
import { wordHelperSchema } from "@/lib/validations";

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

const CONCRETE_CUES = [
  "door",
  "bus",
  "train",
  "kitchen",
  "office",
  "street",
  "shop",
  "table",
  "wallet",
  "keys",
  "phone",
  "ticket",
  "coffee",
  "lunch",
  "rain",
  "window",
  "bag",
  "kettle",
  "fridge",
  "desk"
];

const GENERIC_PATTERNS = [
  /^i saw a\b/i,
  /^i saw an\b/i,
  /^this is a\b/i,
  /^this is an\b/i,
  /^he likes\b/i,
  /^she likes\b/i,
  /^they like\b/i
];

const SENTENCE_GENERATION_SYSTEM_PROMPT = `You create high-quality example sentences for English vocabulary flashcards.

Your task is to generate exactly two different natural English sentences for one target word:

1) front_sentence
- short and clear
- concrete everyday situation
- helps infer meaning from context
- avoid vague and generic scenes

2) back_sentence
- also contains the target word
- natural and idiomatic
- reinforces meaning with a different context from front_sentence
- do not repeat the same structure or scene

Strict rules:
- Do not mention learning English, vocabulary, translation, dictionaries, words, or studying.
- Do not define the word directly.
- Use modern everyday English.
- Keep CEFR-friendly simplicity.
- Use the target word exactly as requested unless inflection is needed for grammar.
- Output valid JSON only.
- No markdown or extra keys.

JSON format:
{
  "front_sentence": "...",
  "back_sentence": "..."
}`;

type DictionaryApiDefinition = {
  definition?: string;
  example?: string;
};

type DictionaryApiMeaning = {
  partOfSpeech?: string;
  definitions?: DictionaryApiDefinition[];
};

type DictionaryApiEntry = {
  phonetic?: string;
  phonetics?: Array<{ text?: string; audio?: string }>;
  meanings?: DictionaryApiMeaning[];
};

type PixabayHit = {
  id: number;
  webformatURL?: string;
  largeImageURL?: string;
};

type PixabayResponse = {
  hits?: PixabayHit[];
};

type SentencePair = {
  front: string;
  back: string;
  source: "llm" | "dictionary";
};

type DictionaryDraft = {
  phonetic?: string;
  audioUrl?: string;
  examples: string[];
};

function buildFallbackWhyFromSentence(sentence: string): string {
  const normalized = sentence.trim().replace(/\s+/g, " ");
  const wc = normalized.split(" ").slice(0, 6).join(" ");
  return `because this context uses it as ${wc.toLowerCase()}`;
}

function normalizeWord(word: string) {
  return word.trim().toLowerCase();
}

async function fetchJsonWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs = 2200
): Promise<unknown | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...(init ?? {}), signal: controller.signal });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeSentence(value: string): string {
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";
  return /^[A-Z]/.test(cleaned) ? cleaned : `${cleaned[0].toUpperCase()}${cleaned.slice(1)}`;
}

function tokenize(value: string): string[] {
  return (value.toLowerCase().match(/[a-z']+/g) ?? []).filter(Boolean);
}

function uniqueStrings(items: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const value = item?.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function countWords(value: string): number {
  return tokenize(value).length;
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

function containsTargetWordForm(text: string, word: string): boolean {
  const normalizedWord = word.toLowerCase().trim();
  if (/\s|-/.test(normalizedWord)) {
    const escaped = normalizedWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped}\\b`, "i").test(text);
  }
  const forms = buildWordForms(word);
  return tokenize(text).some((token) => forms.has(token));
}

function hasMetaWords(text: string): boolean {
  const tokens = tokenize(text);
  return tokens.some((token) => BANNED_META.includes(token));
}

function isTooGeneric(text: string): boolean {
  return GENERIC_PATTERNS.some((re) => re.test(text.trim()));
}

function sentenceSimilarity(a: string, b: string): number {
  const aSet = new Set(tokenize(a));
  const bSet = new Set(tokenize(b));
  if (aSet.size === 0 || bSet.size === 0) return 0;
  let overlap = 0;
  for (const token of aSet) {
    if (bSet.has(token)) overlap += 1;
  }
  return overlap / Math.max(Math.min(aSet.size, bSet.size), 1);
}

function extractContextCues(text: string): string[] {
  const tokens = new Set(tokenize(text));
  return CONCRETE_CUES.filter((cue) => tokens.has(cue));
}

function validateSentence(
  sentenceRaw: string,
  word: string,
  minWords: number,
  maxWords: number,
  requireConcreteCue: boolean,
  relaxed = false
): boolean {
  const sentence = normalizeSentence(sentenceRaw);
  if (!sentence) return false;
  if (!containsTargetWordForm(sentence, word)) return false;
  if (hasMetaWords(sentence)) return false;
  if (isTooGeneric(sentence)) return false;
  if (/https?:\/\//i.test(sentence)) return false;
  if (/[{}[\]|<>]/.test(sentence)) return false;
  if (/[;:]/.test(sentence)) return false;
  if ((sentence.match(/,/g) ?? []).length > 1) return false;
  const wc = countWords(sentence);
  if (wc < minWords || wc > maxWords) return false;
  if (requireConcreteCue && !relaxed && extractContextCues(sentence).length === 0) return false;
  if (!relaxed && /\b(and|but|while|although|because)\b/i.test(sentence)) return false;
  return true;
}

function validatePair(
  frontRaw: string,
  backRaw: string,
  word: string,
  relaxed = false
): SentencePair | null {
  const front = normalizeSentence(frontRaw);
  const back = normalizeSentence(backRaw);
  if (!validateSentence(front, word, 6, 14, true, relaxed)) return null;
  if (!validateSentence(back, word, 8, 18, true, relaxed)) return null;
  if (sentenceSimilarity(front, back) >= 0.7) return null;

  const frontCues = extractContextCues(front);
  const backCues = extractContextCues(back);
  const sameCues =
    frontCues.length > 0 &&
    backCues.length > 0 &&
    frontCues.every((cue) => backCues.includes(cue)) &&
    backCues.every((cue) => frontCues.includes(cue));
  if (sameCues) return null;

  return { front, back, source: "dictionary" };
}

function rankSentence(sentence: string): number {
  const wc = countWords(sentence);
  const ideal = 11;
  const lengthPenalty = Math.abs(wc - ideal);
  const genericPenalty = isTooGeneric(sentence) ? 8 : 0;
  return lengthPenalty + genericPenalty;
}

function chooseDictionaryPair(
  candidates: string[],
  word: string,
  relaxed = false
): SentencePair | null {
  const normalized = uniqueStrings(candidates.map(normalizeSentence));
  const fronts = normalized
    .filter((s) => validateSentence(s, word, 6, 14, true, relaxed))
    .sort((a, b) => rankSentence(a) - rankSentence(b));

  for (const front of fronts) {
    const backs = normalized
      .filter((s) => s !== front)
      .filter((s) => validateSentence(s, word, 8, 18, true, relaxed))
      .filter((s) => sentenceSimilarity(front, s) < 0.7)
      .sort((a, b) => rankSentence(a) - rankSentence(b));
    const back = backs[0];
    if (!back) continue;
    return { front, back, source: "dictionary" };
  }
  return null;
}

async function fetchDictionaryDraft(word: string): Promise<DictionaryDraft | null> {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
  const data = await fetchJsonWithTimeout(
    url,
    {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store"
    },
    1800
  );
  if (!Array.isArray(data) || data.length === 0) return null;

  const entries = data as DictionaryApiEntry[];
  let phoneticText: string | undefined;
  let audioUrl: string | undefined;
  const examples: string[] = [];

  for (const entry of entries) {
    if (!phoneticText && entry.phonetic?.trim()) {
      phoneticText = entry.phonetic.trim();
    }
    if ((!phoneticText || !audioUrl) && entry.phonetics?.length) {
      for (const phon of entry.phonetics) {
        if (!phoneticText && phon.text?.trim()) phoneticText = phon.text.trim();
        if (!audioUrl && phon.audio?.trim()) {
          const rawAudio = phon.audio.trim();
          audioUrl = rawAudio.startsWith("//") ? `https:${rawAudio}` : rawAudio;
        }
      }
    }
    for (const meaning of entry.meanings ?? []) {
      for (const def of meaning.definitions ?? []) {
        if (def.example) examples.push(def.example);
      }
    }
  }

  return {
    phonetic: phoneticText,
    audioUrl,
    examples: uniqueStrings(examples)
  };
}

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
}

async function fetchLlmPair(word: string, relaxed = false): Promise<SentencePair | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
    const dataRaw = await fetchJsonWithTimeout(
      `${baseUrl.replace(/\/$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          temperature: 0.5,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SENTENCE_GENERATION_SYSTEM_PROMPT },
            {
              role: "user",
              content: `Target word: "${word}"\nOutput JSON only.`
            }
          ]
        })
      },
      2600
    );
    if (!dataRaw || typeof dataRaw !== "object") return null;
    const data = dataRaw as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(extractJsonObject(content)) as {
      front_sentence?: string;
      back_sentence?: string;
    };
    if (!parsed.front_sentence || !parsed.back_sentence) return null;

    const checked = validatePair(parsed.front_sentence, parsed.back_sentence, word, relaxed);
    if (!checked) return null;
    return { ...checked, source: "llm" };
  } catch {
    return null;
  }
}

function buildFallbackImageOptions(word: string) {
  const combos = [
    { query: word, label: "Word" },
    { query: `${word},object`, label: "Object" },
    { query: `${word},concept`, label: "Concept" },
    { query: `${word},illustration`, label: "Illustration" },
    { query: `${word},symbol`, label: "Symbol" }
  ];

  return combos.map((combo, index) => ({
    id: `img-${index + 1}`,
    label: combo.label,
    url: `https://loremflickr.com/640/360/${encodeURIComponent(combo.query)}?lock=${index + 1}`
  }));
}

async function fetchPixabayImageOptions(word: string) {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) return null;

  const queries = [
    { q: word, label: "Word" },
    { q: `${word} object`, label: "Object" },
    { q: `${word} concept`, label: "Concept" },
    { q: `${word} illustration`, label: "Illustration" }
  ];

  const results: Array<{ id: string; label: string; url: string }> = [];
  const seenUrls = new Set<string>();

  for (const query of queries) {
    if (results.length >= 8) break;
    const url = new URL("https://pixabay.com/api/");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("q", query.q);
    url.searchParams.set("image_type", "photo");
    url.searchParams.set("safesearch", "true");
    url.searchParams.set("per_page", "8");
    url.searchParams.set("orientation", "horizontal");

    try {
      const dataRaw = await fetchJsonWithTimeout(
        url.toString(),
        { headers: { Accept: "application/json" }, cache: "no-store" },
        1400
      );
      if (!dataRaw || typeof dataRaw !== "object") continue;
      const data = dataRaw as PixabayResponse;
      for (const hit of data.hits ?? []) {
        const imageUrl = hit.webformatURL || hit.largeImageURL;
        if (!imageUrl || seenUrls.has(imageUrl)) continue;
        seenUrls.add(imageUrl);
        results.push({ id: `pixabay-${hit.id}`, label: query.label, url: imageUrl });
        if (results.length >= 8) break;
      }
    } catch {
      // ignore single provider errors
    }
  }

  return results.length > 0 ? results : null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = wordHelperSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid word" },
        { status: 400 }
      );
    }

    const word = normalizeWord(parsed.data.word);
    const mode = (req.nextUrl.searchParams.get("mode") ?? "default").toLowerCase();
    const relaxed = mode === "import";
    const dictionaryDraft = await fetchDictionaryDraft(word);
    const dictionaryPair = chooseDictionaryPair(dictionaryDraft?.examples ?? [], word, relaxed);
    const llmPair = dictionaryPair ? null : await fetchLlmPair(word, relaxed);
    const chosen = dictionaryPair ?? llmPair;
    if (!chosen) {
      return NextResponse.json(
        {
          error:
            "No high-quality example sentences found for this word. Try another word or enter sentences manually."
        },
        { status: 422 }
      );
    }

    const alternatePairs = [dictionaryPair, llmPair]
      .filter((p): p is SentencePair => Boolean(p))
      .filter((p) => p.front !== chosen.front || p.back !== chosen.back);
    const frontOptions = uniqueStrings([chosen.front, ...alternatePairs.map((p) => p.front)]).slice(
      0,
      3
    );
    const backOptions = uniqueStrings([chosen.back, ...alternatePairs.map((p) => p.back)]).slice(0, 3);

    const fallbackImageOptions = buildFallbackImageOptions(word);
    const imageOptions = fallbackImageOptions.slice(0, 8);

    return NextResponse.json({
      output: {
        front_sentence: chosen.front,
        back_sentence: chosen.back
      },
      draft: {
        word,
        targetWord: word,
        phonetic: dictionaryDraft?.phonetic,
        audioUrl: dictionaryDraft?.audioUrl,
        frontText: chosen.front,
        backText: [
          `Word: ${word}`,
          `Example: ${chosen.back}`,
          `Why this word here: ${buildFallbackWhyFromSentence(chosen.back)}`
        ].join("\n"),
        exampleOptions: frontOptions,
        backSentenceOptions: backOptions,
        imageUrl: undefined,
        imageOptions,
        tags: `smart-add,vocab,${word}`,
        level: 1
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
