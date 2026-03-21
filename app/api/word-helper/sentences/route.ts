import { NextRequest, NextResponse } from "next/server";
import { sentenceOptionsSchema } from "@/lib/validations";

const BANNED_META = [
  "english",
  "word",
  "vocabulary",
  "dictionary",
  "translate",
  "translation",
  "learn",
  "study",
  "language",
  "grammar"
];

const GENERIC_PATTERNS = [
  /^i saw a\b/i,
  /^i saw an\b/i,
  /^this is a\b/i,
  /^this is an\b/i,
  /^he likes\b/i,
  /^she likes\b/i,
  /^they like\b/i,
  /^he is\b/i,
  /^she is\b/i,
  /^it is\b/i,
  /^there is\b/i,
  /^there are\b/i
];

const BANNED_STYLE_PATTERNS = [
  /\bthis sentence\b/i,
  /\bvery useful\b/i,
  /\bi (learn|study)\b/i,
  /\bthe meaning of\b/i,
  /\bexample sentence\b/i
];

const CONTEXT_CUES: Record<string, string[]> = {
  home: ["kitchen", "bathroom", "bedroom", "house", "home", "fridge", "sofa", "door"],
  street: ["street", "corner", "crosswalk", "traffic", "sidewalk", "bus stop"],
  work: ["office", "manager", "meeting", "coworker", "desk", "shift", "client"],
  conversation: ["said", "asked", "told", "replied", "whispered", "shouted", "texted"],
  friends: ["friend", "friends", "buddy", "teammate"],
  family: ["mom", "dad", "mother", "father", "sister", "brother", "kids", "children"],
  travel: ["airport", "flight", "hotel", "station", "train", "bus", "trip", "passport"],
  shopping: ["store", "shop", "cashier", "receipt", "market", "cart", "checkout"],
  daily: ["morning", "evening", "today", "tonight", "yesterday", "lunch", "dinner", "coffee"]
};

type DictionaryEntry = {
  meanings?: Array<{
    partOfSpeech?: string;
    definitions?: Array<{
      example?: string;
      definition?: string;
    }>;
  }>;
};

type SemanticCategory =
  | "physical object"
  | "action / verb"
  | "personality trait"
  | "emotion"
  | "abstract concept"
  | "event"
  | "profession"
  | "place";

function normalizeWord(value: string) {
  return value.trim().toLowerCase();
}

function normalizeSentence(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function tokenize(value: string): string[] {
  return (value.toLowerCase().match(/[a-z']+/g) ?? []).filter(Boolean);
}

function countWords(value: string): number {
  return tokenize(value).length;
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

function hasMetaWords(text: string): boolean {
  const tokens = tokenize(text);
  return tokens.some((token) => BANNED_META.includes(token));
}

function isGoodSentence(textRaw: string, word: string, relaxed = false): boolean {
  const text = normalizeSentence(textRaw);
  if (!text) return false;
  if (!hasTargetWord(text, word)) return false;
  if (hasMetaWords(text)) return false;
  if (BANNED_STYLE_PATTERNS.some((re) => re.test(text))) return false;
  if (!relaxed && GENERIC_PATTERNS.some((re) => re.test(text))) return false;
  if (/https?:\/\//i.test(text)) return false;
  if (/[{}[\]|<>]/.test(text)) return false;
  if ((text.match(/,/g) ?? []).length > 1) return false;
  const wc = countWords(text);
  if (!relaxed && (wc < 8 || wc > 14)) return false;
  if (relaxed && (wc < 5 || wc > 18)) return false;
  return true;
}

function detectContext(text: string): string {
  const tokens = new Set(tokenize(text));
  for (const [context, cues] of Object.entries(CONTEXT_CUES)) {
    if (cues.some((cue) => tokens.has(cue))) return context;
  }
  return "other";
}

function sentenceQualityScore(text: string): number {
  const wc = countWords(text);
  const targetLen = 11;
  const lengthPenalty = Math.abs(wc - targetLen) * 1.2;
  const genericPenalty = GENERIC_PATTERNS.some((re) => re.test(text)) ? 9 : 0;
  const stylePenalty = BANNED_STYLE_PATTERNS.some((re) => re.test(text)) ? 8 : 0;
  const punctuationPenalty = /[;:]/.test(text) ? 3 : 0;
  const pronounStartPenalty = /^(it|this|that)\b/i.test(text) ? 2 : 0;
  const contextBonus = detectContext(text) !== "other" ? 2 : 0;
  return lengthPenalty + genericPenalty + stylePenalty + punctuationPenalty + pronounStartPenalty - contextBonus;
}

function dedupeBySimilarity(values: string[], threshold = 0.68): string[] {
  const out: string[] = [];
  for (const item of values) {
    if (out.some((existing) => similarity(existing, item) >= threshold)) continue;
    out.push(item);
  }
  return out;
}

function pickTopFive(values: string[]): string[] {
  const ranked = [...values].sort((a, b) => sentenceQualityScore(a) - sentenceQualityScore(b));
  const selected: string[] = [];
  const usedContexts = new Set<string>();

  for (const item of ranked) {
    if (selected.length >= 5) break;
    const ctx = detectContext(item);
    if (ctx !== "other" && usedContexts.has(ctx) && ranked.length > 6) continue;
    if (selected.some((s) => similarity(s, item) >= 0.68)) continue;
    selected.push(item);
    if (ctx !== "other") usedContexts.add(ctx);
  }

  if (selected.length < 5) {
    for (const item of ranked) {
      if (selected.length >= 5) break;
      if (selected.includes(item)) continue;
      if (selected.some((s) => similarity(s, item) >= 0.72)) continue;
      selected.push(item);
    }
  }

  return selected.slice(0, 5);
}

function uniqueSentences(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const v = normalizeSentence(value);
    const key = v.toLowerCase();
    if (!v || seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

async function fetchDictionaryData(word: string): Promise<{
  examples: string[];
  partOfSpeech?: string;
  definitions: string[];
}> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return { examples: [], definitions: [] };
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) return { examples: [], definitions: [] };
    const entries = data as DictionaryEntry[];
    const examples: string[] = [];
    const definitions: string[] = [];
    let partOfSpeech: string | undefined;
    for (const entry of entries) {
      for (const meaning of entry.meanings ?? []) {
        if (!partOfSpeech && meaning.partOfSpeech) partOfSpeech = meaning.partOfSpeech;
        for (const def of meaning.definitions ?? []) {
          if (def.example?.trim()) examples.push(def.example.trim());
          if (def.definition?.trim()) definitions.push(def.definition.trim());
        }
      }
    }
    return { examples: uniqueSentences(examples), partOfSpeech, definitions: uniqueSentences(definitions) };
  } catch {
    return { examples: [], definitions: [] };
  }
}

function detectSemanticCategory(
  word: string,
  partOfSpeech?: string,
  definitions?: string[],
  translationHint?: string
): SemanticCategory {
  const pos = (partOfSpeech ?? "").toLowerCase();
  const definitionText = (definitions ?? []).join(" ").toLowerCase();
  const hint = (translationHint ?? "").toLowerCase();
  const signal = `${word.toLowerCase()} ${definitionText} ${hint}`;

  if (pos === "verb") return "action / verb";
  if (/\b(person who|someone who|occupation|job|profession|worker)\b/.test(signal)) return "profession";
  if (/\b(place|location|area|building|city|country|region|room|space)\b/.test(signal)) return "place";
  if (/\b(event|occasion|ceremony|festival|incident|accident)\b/.test(signal)) return "event";
  if (/\b(feeling|emotion|mood|fear|anger|joy|sadness|anxiety)\b/.test(signal)) return "emotion";
  if (/\b(personality|character|trait|attitude|behavior pattern)\b/.test(signal)) return "personality trait";
  if (
    /\b(idea|concept|quality|process|state|influence|control|power|method|system)\b/.test(signal) ||
    /(tion|sion|ment|ness|ity|ism|ship|ance|ence|hood|acy|ure)$/.test(word.toLowerCase())
  ) {
    return "abstract concept";
  }
  if (pos === "adjective") {
    if (/\b(kind|rude|honest|stubborn|patient|selfish|calm|polite)\b/.test(signal)) return "personality trait";
    return "emotion";
  }
  return "physical object";
}

function getCategoryContexts(category: SemanticCategory): string[] {
  if (category === "abstract concept") return ["psychology", "relationships", "politics", "influence"];
  if (category === "action / verb") return ["home", "work", "daily routine", "conversation"];
  if (category === "personality trait") return ["family", "friends", "workplace", "conflicts"];
  if (category === "emotion") return ["family", "conversation", "stressful moments", "daily life"];
  if (category === "event") return ["work", "travel", "school", "community"];
  if (category === "profession") return ["work", "service", "public places", "daily routines"];
  if (category === "place") return ["travel", "city life", "meeting people", "everyday movement"];
  return ["home", "street", "shopping", "travel", "daily life"];
}

function violatesCategorySemantics(text: string, word: string, category: SemanticCategory): boolean {
  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (category === "abstract concept" || category === "emotion" || category === "personality trait") {
    const physicalTemplate = new RegExp(
      `\\b(pack|put|carry|find|found|grab|drop|hold|pass|buy|bought|sell|sold|left|forgot)\\s+(my|your|his|her|our|their|the|a|an)?\\s*${escapedWord}\\b`,
      "i"
    );
    if (physicalTemplate.test(text)) return true;
  }
  return false;
}

function buildFallbackExamples(word: string, category: SemanticCategory): string[] {
  const bankByCategory: Record<SemanticCategory, string[]> = {
    "physical object": [
      `I left my ${word} on the kitchen table this morning.`,
      `She grabbed her ${word} before running out the door.`,
      `Can you pass me the ${word} near the window?`,
      `He bought a new ${word} at the market yesterday.`,
      `We found the ${word} under the car seat.`
    ],
    "action / verb": [
      `I had to ${word} the plan before the meeting.`,
      `She will ${word} him as soon as she gets home.`,
      `They ${word} their options before making a decision.`,
      `He tried to ${word} the issue on the phone.`,
      `We can ${word} this problem after lunch.`
    ],
    "personality trait": [
      `Her ${word} attitude made group work much harder today.`,
      `People avoid him because he can be too ${word}.`,
      `His ${word} behavior caused another argument at dinner.`,
      `She sounded ${word} and refused to change her mind.`,
      `The team struggled with his ${word} response to feedback.`
    ],
    emotion: [
      `She felt ${word} after reading the message from home.`,
      `His voice became ${word} when he heard the news.`,
      `I looked ${word} before my interview this morning.`,
      `The kids were ${word} when the lights went out.`,
      `He seemed ${word} during the long wait at the station.`
    ],
    "abstract concept": [
      `The manager used ${word} to control the team.`,
      `She realized his kindness was actually ${word}.`,
      `The article explained how ${word} can influence voters.`,
      `They accused the company of ${word} in the report.`,
      `His speech relied on ${word} instead of clear facts.`
    ],
    event: [
      `The ${word} started late because of heavy traffic.`,
      `Everyone talked about the ${word} during lunch.`,
      `We planned around the ${word} for the whole week.`,
      `She missed the ${word} after her train was delayed.`,
      `The ${word} brought people from several nearby towns.`
    ],
    profession: [
      `She works as a ${word} at the city hospital.`,
      `The ${word} explained the problem in simple terms.`,
      `We called a ${word} to fix the issue quickly.`,
      `That ${word} helped us choose the right option.`,
      `My cousin became a ${word} last year.`
    ],
    place: [
      `We met near the ${word} before going to dinner.`,
      `The bus stopped right in front of the ${word}.`,
      `She moved to a quiet ${word} outside the city.`,
      `Tourists filled the ${word} by early afternoon.`,
      `I spent two hours at the ${word} yesterday.`
    ]
  };

  return bankByCategory[category].map((s) => normalizeSentence(s));
}

function extractJsonArray(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) return trimmed;
  const first = trimmed.indexOf("[");
  const last = trimmed.lastIndexOf("]");
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
}

async function fetchLlmExamples(
  word: string,
  category: SemanticCategory,
  contexts: string[],
  exclude: string[],
  translationHint?: string,
  relaxed = false
): Promise<string[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return [];

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
        temperature: 0.8,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Generate natural everyday English example sentences for one target word. Use real-life scenes, avoid textbook tone. Output JSON only with key 'sentences' as array."
          },
          {
            role: "user",
            content: `Target word: "${word}"
Semantic category: "${category}"
Preferred contexts: "${contexts.join(", ")}"
Meaning in Russian (hint): "${translationHint ?? "none"}"
Generate ${relaxed ? 24 : 20} different sentences.
Rules:
- sentence length: ${relaxed ? "6-18" : "8-14"} words
- natural spoken English, concrete situations
- avoid school-style or template tone
- keep contexts appropriate for the semantic category
- no phrases about learning language
- avoid overly simple patterns like "He is ${word}."
- avoid semantic mismatch (for abstract/emotion/trait words: never "pack/put/carry/find ${word} in a bag/pocket/on a table")
Forbidden words: English, word, vocabulary, dictionary, translate, translation, learn, study, language, grammar.
Avoid these sentences: ${exclude.join(" || ") || "none"}
Output JSON only: {"sentences":["..."]}`
          }
        ]
      })
    });

    if (!res.ok) return [];
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return [];
    const parsed = JSON.parse(content) as { sentences?: string[] };
    if (Array.isArray(parsed.sentences)) return uniqueSentences(parsed.sentences);

    const maybeArray = JSON.parse(extractJsonArray(content)) as string[];
    return Array.isArray(maybeArray) ? uniqueSentences(maybeArray) : [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = sentenceOptionsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const word = normalizeWord(parsed.data.word);
    const exclude = uniqueSentences(parsed.data.exclude ?? []);
    const translationHint = parsed.data.translationHint?.trim();
    const excludedSet = new Set(exclude.map((s) => s.toLowerCase()));

    const dictionaryData = await fetchDictionaryData(word);
    const category = detectSemanticCategory(
      word,
      dictionaryData.partOfSpeech,
      dictionaryData.definitions,
      translationHint
    );
    const contexts = getCategoryContexts(category);
    const llmExamplesStrict = await fetchLlmExamples(
      word,
      category,
      contexts,
      exclude,
      translationHint,
      false
    );

    const strictPool = dedupeBySimilarity(
      uniqueSentences([...llmExamplesStrict, ...dictionaryData.examples]).filter((s) =>
        isGoodSentence(s, word, false) && !violatesCategorySemantics(s, word, category)
      )
    );
    let nonExcluded = strictPool.filter((s) => !excludedSet.has(s.toLowerCase()));
    let sentences = pickTopFive(nonExcluded);

    if (sentences.length < 5) {
      const relaxedExclude = uniqueSentences([...exclude, ...sentences]);
      const llmExamplesRelaxed = await fetchLlmExamples(
        word,
        category,
        contexts,
        relaxedExclude,
        translationHint,
        true
      );
      const fallbackExamples = buildFallbackExamples(word, category);
      const relaxedPool = dedupeBySimilarity(
        uniqueSentences([
          ...sentences,
          ...llmExamplesRelaxed,
          ...dictionaryData.examples,
          ...fallbackExamples
        ]).filter((s) => isGoodSentence(s, word, true) && !violatesCategorySemantics(s, word, category))
      );
      nonExcluded = relaxedPool.filter((s) => !excludedSet.has(s.toLowerCase()));
      sentences = pickTopFive(nonExcluded);
    }

    if (sentences.length < 5) {
      return NextResponse.json(
        {
          error:
            "Could not generate 5 high-quality examples for this word. Try another word.",
          sentences: []
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      sentences,
      front_sentence_options: sentences,
      back_sentence_options: sentences,
      semantic_category: category
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
