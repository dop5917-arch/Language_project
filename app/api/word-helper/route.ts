import { NextRequest, NextResponse } from "next/server";
import { wordHelperSchema } from "@/lib/validations";

const sentenceTemplates = [
  "I use {word} every day when I study English.",
  "She learned the word {word} from a short story.",
  "Can you use {word} in a simple sentence?",
  "He wrote {word} in his notebook to remember it later.",
  "We practiced {word} in class today."
];

const definitionTemplates = [
  "{word} — a common English word you can use in daily conversation.",
  "{word} — a word to learn and practice in real-life context.",
  "{word} — an English word with meaning best remembered through examples."
];

function titleCaseWord(word: string) {
  return word.trim().toLowerCase();
}

type DictionaryApiDefinition = {
  definition?: string;
  example?: string;
};

type DictionaryApiMeaning = {
  partOfSpeech?: string;
  definitions?: DictionaryApiDefinition[];
};

type DictionaryApiEntry = {
  word?: string;
  phonetic?: string;
  phonetics?: Array<{ text?: string; audio?: string }>;
  meanings?: DictionaryApiMeaning[];
};

type PixabayHit = {
  id: number;
  tags?: string;
  webformatURL?: string;
  largeImageURL?: string;
};

type PixabayResponse = {
  hits?: PixabayHit[];
};

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

function extractDefinitionKeyword(definition: string): string | null {
  const words = (definition.match(/[A-Za-z']+/g) ?? [])
    .map((w) => w.toLowerCase())
    .filter(
      (w) =>
        w.length > 3 &&
        ![
          "that",
          "with",
          "from",
          "into",
          "this",
          "word",
          "used",
          "use",
          "your",
          "have",
          "been",
          "written"
        ].includes(w)
    );
  return words[0] ?? null;
}

function buildPixabayQueries(word: string, partOfSpeech?: string, definition?: string) {
  const queries: Array<{ q: string; label: string }> = [];
  queries.push({ q: word, label: "Word" });

  if (partOfSpeech === "verb") {
    queries.push({ q: `${word} action person`, label: "Action" });
  } else if (partOfSpeech === "adjective") {
    queries.push({ q: `${word} emotion face`, label: "Emotion" });
  } else {
    queries.push({ q: `${word} object`, label: "Object" });
  }

  queries.push({ q: `${word} illustration`, label: "Illustration" });

  const keyword = definition ? extractDefinitionKeyword(definition) : null;
  if (keyword && keyword !== word) {
    queries.push({ q: `${word} ${keyword}`, label: "Meaning" });
  }

  queries.push({ q: `${word} concept`, label: "Concept" });

  const seen = new Set<string>();
  return queries.filter((item) => {
    const key = item.q.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchPixabayImageOptions(
  word: string,
  partOfSpeech?: string,
  definition?: string
) {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) return null;

  const queries = buildPixabayQueries(word, partOfSpeech, definition).slice(0, 5);
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
      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      if (!res.ok) continue;

      const data = (await res.json()) as PixabayResponse;
      for (const hit of data.hits ?? []) {
        const imageUrl = hit.webformatURL || hit.largeImageURL;
        if (!imageUrl || seenUrls.has(imageUrl)) continue;
        seenUrls.add(imageUrl);
        results.push({
          id: `pixabay-${hit.id}`,
          label: query.label,
          url: imageUrl
        });
        if (results.length >= 8) break;
      }
    } catch {
      // Fallback below if Pixabay fails
    }
  }

  return results.length >= 5 ? results : results.length > 0 ? results : null;
}

async function fetchDictionaryDraft(word: string) {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store"
  });

  if (!res.ok) {
    return null;
  }

  const data = (await res.json()) as unknown;
  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const entries = data as DictionaryApiEntry[];
  let selectedDefinition: DictionaryApiDefinition | null = null;
  let selectedPartOfSpeech: string | undefined;
  let phoneticText: string | undefined;
  let audioUrl: string | undefined;
  const examples: string[] = [];
  const definitionOptionsRaw: Array<{ definition: string; partOfSpeech?: string }> = [];

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
        if (def?.definition) {
          selectedDefinition = def;
          selectedPartOfSpeech = meaning.partOfSpeech;
          if (def.example) {
            examples.push(def.example);
          }
          definitionOptionsRaw.push({
            definition: def.definition,
            partOfSpeech: meaning.partOfSpeech
          });
        }
        if (examples.length >= 3) break;
      }
    }
  }

  if (!selectedDefinition?.definition) {
    return null;
  }

  const firstExample = selectedDefinition.example?.trim();
  const definitionText = selectedDefinition.definition.trim();
  const exampleOptions = uniqueStrings([
    ...examples,
    firstExample
  ]).slice(0, 3);
  const definitionOptions = uniqueStrings(
    definitionOptionsRaw.map((item) =>
      `${word}${item.partOfSpeech ? ` (${item.partOfSpeech})` : ""} — ${item.definition.trim()}`
    )
  ).slice(0, 3);

  return {
    targetWord: word,
    phonetic: phoneticText,
    audioUrl,
    partOfSpeech: selectedPartOfSpeech,
    definitionText,
    frontText: firstExample && firstExample.length > 0 ? firstExample : null,
    backText: `${word}${selectedPartOfSpeech ? ` (${selectedPartOfSpeech})` : ""} — ${definitionText}`,
    exampleOptions,
    definitionOptions
  };
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

    const rawWord = titleCaseWord(parsed.data.word);
    const variant = Number(req.nextUrl.searchParams.get("variant") ?? "0") || 0;

    const dictionaryDraft = await fetchDictionaryDraft(rawWord);

    const fallbackExamples = [
      sentenceTemplates[Math.abs(variant) % sentenceTemplates.length].replaceAll("{word}", rawWord),
      sentenceTemplates[(Math.abs(variant) + 1) % sentenceTemplates.length].replaceAll("{word}", rawWord),
      sentenceTemplates[(Math.abs(variant) + 2) % sentenceTemplates.length].replaceAll("{word}", rawWord)
    ];
    const exampleOptions = uniqueStrings([
      ...(dictionaryDraft?.exampleOptions ?? []),
      ...fallbackExamples
    ]).slice(0, 3);
    const sentence = exampleOptions[0];
    const definition =
      dictionaryDraft?.backText ??
      definitionTemplates[Math.abs(variant) % definitionTemplates.length].replaceAll("{word}", rawWord);
    const definitionOptions = uniqueStrings([
      ...(dictionaryDraft?.definitionOptions ?? []),
      definition,
      definitionTemplates[(Math.abs(variant) + 1) % definitionTemplates.length].replaceAll("{word}", rawWord),
      definitionTemplates[(Math.abs(variant) + 2) % definitionTemplates.length].replaceAll("{word}", rawWord)
    ]).slice(0, 3);
    const pixabayImageOptions = await fetchPixabayImageOptions(
      rawWord,
      dictionaryDraft?.partOfSpeech,
      dictionaryDraft?.definitionText
    );
    const fallbackImageOptions = buildFallbackImageOptions(rawWord);
    const imageOptions = [
      ...(pixabayImageOptions ?? []),
      ...fallbackImageOptions.filter(
        (fallback) => !(pixabayImageOptions ?? []).some((item) => item.url === fallback.url)
      )
    ].slice(0, 8);

    return NextResponse.json({
      draft: {
        word: rawWord,
        targetWord: dictionaryDraft?.targetWord ?? rawWord,
        phonetic: dictionaryDraft?.phonetic,
        audioUrl: dictionaryDraft?.audioUrl,
        frontText: sentence,
        exampleOptions,
        backText: definitionOptions[0] ?? definition,
        definitionOptions,
        imageUrl: imageOptions[0]?.url,
        imageOptions,
        tags: `smart-add,vocab,${rawWord}`,
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
