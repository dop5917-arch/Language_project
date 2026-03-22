"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type Props = {
  deckId: string;
};

type WordMeaningResponse = {
  ruVariants?: string[];
  meanings?: Array<{
    partOfSpeech: string;
    definitionEn: string;
  }>;
  phonetic?: string;
};

type SentencesResponse = {
  sentences?: string[];
  error?: string;
};

type DefinitionsResponse = {
  definitions?: string[];
  error?: string;
};

type WhyResponse = {
  why?: string;
  error?: string;
};

type WordCard = {
  word: string;
  ruMeaningOptions: string[];
  selectedRuMeaning: string[];
  definitionOptions: string[];
  selectedDefinition: string;
  frontOptions: string[];
  selectedFront: string;
  frontExpanded: boolean;
  backOptions: string[];
  selectedBack: string;
  backExpanded: boolean;
  whyThisWordHere: string;
  frontExclude: string[];
  backExclude: string[];
  definitionExclude: string[];
  phonetic?: string;
  loadingMeta: boolean;
  loadingFront: boolean;
  loadingBack: boolean;
  loadingDefinitions: boolean;
  loadingWhy: boolean;
  saving: boolean;
  saved: boolean;
  savedCardId?: string;
  error?: string;
};

type TranslateResponse = {
  translation?: string;
  error?: string;
};

type AiCardPayload = {
  word: string;
  front_sentence?: string;
  front_hint?: string;
  definition_en_main?: string;
  back_sentence?: string;
  why_this_word_here?: string;
  ru_meanings?: string[];
  ru_meaning?: string | string[];
  meanings_ru?: string[];
  definitions_en?: string[];
  definition_en?: string;
  front_sentence_options?: string[];
  back_sentence_options?: string[];
  front?: string;
  back?: string;
};

type AiCardsResponse = {
  cards?: AiCardPayload[];
};

const AI_MODEL_LINKS = [
  { label: "ChatGPT", href: "https://chatgpt.com/" },
  { label: "Gemini", href: "https://gemini.google.com/" },
  { label: "Claude", href: "https://claude.ai/" },
  { label: "DeepSeek", href: "https://chat.deepseek.com/" }
];

function buildExternalAiPrompt(words: string[]): string {
  const wordsList = words.join(", ");
  return `You are creating production-ready English vocabulary flashcards for a learner app.

Critical requirement:
- You MUST return exactly one card for each input item.
- Do NOT skip words.
- If an input looks misspelled, infer the most likely intended English word and still create a card.
- If confidence is high, normalize to the corrected common form in "word".
- If confidence is medium/low, still produce the best guess and continue.
- Never output fewer cards than input words.

Task for each target word/item:
1) Pick ONE best front sentence (natural, common, recognizable, real-life).
2) Add a useful front hint that explains why this word fits this sentence.
3) Provide ONE main learner-friendly English definition.
4) Provide 4-7 common Russian meanings (popular + context-applicable, not one).
5) Provide ONE second example sentence for back side (different scene from front).
6) Add a short "why this word here" explanation. This should match the front hint logic.

Target words:
${wordsList || "(no words provided)"}

Quality rules:
- Natural modern everyday English only
- Realistic, concrete, visual situations
- No robotic or template phrasing
- Front sentence length: 8-14 words preferred
- Back sentence length: 8-16 words preferred
- Back sentence must be a different context from front
- No school-style meta language
- Never mention: English, word, vocabulary, dictionary, translate, translation, learn, study, language, grammar
- "front_hint" must be short (6-14 words), concrete, and context-based
- "front_hint" should explain the role of the word in this exact sentence
- avoid vague hints like "common word", "real conversation", "everyday use"
- bad hint example: "heard this in real conversation yesterday"
- good hint example: "he speaks quietly so other people cannot hear him"
- "definition_en_main" should be the most common meaning for learners
- "ru_meanings" must contain several meanings, ordered by relevance for this context
- include only common and actually used Russian meanings (no rare/obsolete senses)
- "why_this_word_here" must be short (6-12 words), contextual, not dictionary-like
- if source has typo, still generate full card from best inferred word

Return strict JSON only in this shape:
{
  "cards": [
    {
      "word": "whisper",
      "front_sentence": "He whispered my name so nobody else could hear.",
      "front_hint": "very quiet speech so others cannot hear",
      "definition_en_main": "to speak very quietly so only nearby people hear",
      "ru_meanings": ["шептать", "прошептать", "говорить шепотом"],
      "back_sentence": "She whispered the address while they stood near the door.",
      "why_this_word_here": "because he speaks quietly to avoid being overheard"
    }
  ]
}`;
}

function extractJsonPayload(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const fenced = trimmed.match(/```[^\n]*\n([\s\S]*?)```/i);
  if (fenced?.[1]) {
    const inside = fenced[1].trim();
    const firstBrace = inside.indexOf("{");
    const lastBrace = inside.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return inside.slice(firstBrace, lastBrace + 1);
    }
    const firstBracket = inside.indexOf("[");
    const lastBracket = inside.lastIndexOf("]");
    if (firstBracket >= 0 && lastBracket > firstBracket) {
      return inside.slice(firstBracket, lastBracket + 1);
    }
    return inside;
  }
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
}

function toStrictJson(candidate: string): string {
  const prepared = candidate
    .replace(/^\uFEFF/, "")
    .replace(/^\s*json\s*\n/i, "")
    .trim();

  const wrapped =
    prepared.startsWith("{") || prepared.startsWith("[")
      ? prepared
      : /(?:^|\n)\s*cards\s*:/i.test(prepared)
        ? `{${prepared}}`
        : prepared;

  return wrapped
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g, "$1\"$2\"$3")
    .replace(/:\s*([A-Za-z_][A-Za-z0-9_./-]*)(\s*[,}\]])/g, (_m, g1: string, g2: string) => {
      const lower = g1.toLowerCase();
      if (["true", "false", "null"].includes(lower)) {
        return `: ${lower}${g2}`;
      }
      return `: "${g1}"${g2}`;
    })
    .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_m, g1: string) => {
      const escaped = g1.replace(/"/g, "\\\"");
      return `"${escaped}"`;
    });
}

function parseAiJson(input: string): unknown {
  const raw = extractJsonPayload(input);
  if (!raw) {
    throw new Error("Вставь JSON от AI");
  }

  try {
    return JSON.parse(raw);
  } catch {
    const strict = toStrictJson(raw);
    try {
      return JSON.parse(strict);
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown parse error";
      throw new Error(message.startsWith("JSON Parse error:") ? message : `JSON Parse error: ${message}`);
    }
  }
}

function ensureArray(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) return [value];
  return [];
}

function normalizeWord(value: string): string {
  return value
    .trim()
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function parseWords(text: string): string[] {
  const raw = text
    .split(/[\n,;]+/g)
    .map((item) => normalizeWord(item))
    .filter(Boolean);

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const word of raw) {
    if (!/^[a-z][a-z' -]*$/.test(word)) continue;
    if (seen.has(word)) continue;
    seen.add(word);
    unique.push(word);
  }
  return unique.slice(0, 100);
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const clean = normalizeText(value);
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }
  return out;
}

function looksLikeHeaderCell(value: string): boolean {
  const v = normalizeWord(value);
  return ["word", "words", "слово", "translation", "english"].includes(v);
}

function isEnglishStudyWord(value: string): boolean {
  const v = normalizeWord(value);
  return /^[a-z][a-z' -]*$/.test(v);
}

function parseCsvRows(csvText: string): string[][] {
  const text = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === "\"") {
      if (inQuotes && next === "\"") {
        cell += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if (ch === "\n" && !inQuotes) {
      row.push(cell);
      if (row.some((v) => v.trim().length > 0)) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += ch;
  }

  row.push(cell);
  if (row.some((v) => v.trim().length > 0)) rows.push(row);
  return rows.map((r) => r.map((v) => (typeof v === "string" ? v : "")));
}

function detectEnglishColumn(rows: string[][]): number {
  const maxColumns = rows.reduce((max, row) => Math.max(max, row.length), 0);
  let bestCol = 2;
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

function extractWordsFromDetectedColumn(rows: string[][], columnIndex: number): string[] {
  const values: string[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    const raw = (rows[i]?.[columnIndex] ?? "").trim();
    if (!raw) continue;
    if (i === 0 && looksLikeHeaderCell(raw)) continue;
    if (!isEnglishStudyWord(raw)) continue;
    values.push(normalizeWord(raw));
  }
  return parseWords(values.join("\n"));
}

function tokenize(value: string): string[] {
  return (value.toLowerCase().match(/[a-z']+/g) ?? []).filter(Boolean);
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

function createWordCard(word: string): WordCard {
  return {
    word,
    ruMeaningOptions: [],
    selectedRuMeaning: [],
    definitionOptions: [],
    selectedDefinition: "",
    frontOptions: [],
    selectedFront: "",
    frontExpanded: true,
    backOptions: [],
    selectedBack: "",
    backExpanded: true,
    whyThisWordHere: "",
    frontExclude: [],
    backExclude: [],
    definitionExclude: [],
    loadingMeta: false,
    loadingFront: false,
    loadingBack: false,
    loadingDefinitions: false,
    loadingWhy: false,
    saving: false,
    saved: false
  };
}

export default function SmartAddClient({ deckId }: Props) {
  const router = useRouter();
  const [wordInput, setWordInput] = useState("");
  const [cards, setCards] = useState<WordCard[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [aiJsonInput, setAiJsonInput] = useState("");
  const [creatingFromAiJson, setCreatingFromAiJson] = useState(false);

  const aiWords = useMemo(() => cards.map((card) => card.word), [cards]);
  const aiPrompt = useMemo(() => buildExternalAiPrompt(aiWords), [aiWords]);

  function updateCard(word: string, updater: (prev: WordCard) => WordCard) {
    setCards((prev) => prev.map((item) => (item.word === word ? updater(item) : item)));
  }

  function buildWordList() {
    const words = parseWords(wordInput);
    if (words.length === 0) {
      setGlobalError("Add at least one English word");
      return;
    }
    setCards(words.map((word) => createWordCard(word)));
    setGlobalError(null);
    setGlobalSuccess(`Prepared ${words.length} words`);
  }

  function parseAiCardsFromInput(input: string): AiCardPayload[] {
    const parsedUnknown = parseAiJson(input);
    const parsed = parsedUnknown as AiCardsResponse & { data?: AiCardsResponse };
    const cardsRaw = Array.isArray(parsedUnknown)
      ? parsedUnknown
      : Array.isArray(parsed.cards)
        ? parsed.cards
        : Array.isArray(parsed.data?.cards)
          ? parsed.data.cards
          : [];
    if (!Array.isArray(cardsRaw) || cardsRaw.length === 0) {
      throw new Error("Неверный формат: нужен cards[] или массив карточек []");
    }

    const cleaned: AiCardPayload[] = [];
    const seen = new Set<string>();
    for (const item of cardsRaw as AiCardPayload[]) {
      const word = normalizeWord(item.word ?? "");
      if (!word || !/^[a-z][a-z' -]*$/.test(word)) continue;
      if (seen.has(word)) continue;
      seen.add(word);
      cleaned.push({
        word,
        front_sentence: normalizeText(item.front_sentence ?? item.front ?? ""),
        front_hint: normalizeText(item.front_hint ?? item.why_this_word_here ?? ""),
        definition_en_main: normalizeText(item.definition_en_main ?? item.definition_en ?? ""),
        back_sentence: normalizeText(item.back_sentence ?? item.back ?? ""),
        why_this_word_here: normalizeText(item.why_this_word_here ?? item.front_hint ?? ""),
        ru_meanings: uniqueStrings([
          ...ensureArray(item.ru_meanings),
          ...ensureArray(item.ru_meaning),
          ...ensureArray(item.meanings_ru)
        ]),
        definitions_en: uniqueStrings([
          ...ensureArray(item.definitions_en),
          ...ensureArray(item.definition_en),
          ...ensureArray(item.definition_en_main)
        ]),
        front_sentence_options: uniqueStrings([
          ...ensureArray(item.front_sentence_options),
          ...ensureArray(item.front_sentence),
          ...ensureArray(item.front)
        ]),
        back_sentence_options: uniqueStrings([
          ...ensureArray(item.back_sentence_options),
          ...ensureArray(item.back_sentence),
          ...ensureArray(item.back)
        ])
      });
    }
    if (cleaned.length === 0) {
      throw new Error("No valid cards in JSON");
    }
    return cleaned.slice(0, 100);
  }

  async function createCardsFromAiJson() {
    setCreatingFromAiJson(true);
    setGlobalError(null);
    setGlobalSuccess(null);
    try {
      const aiCards: AiCardPayload[] = parseAiCardsFromInput(aiJsonInput);
      let created = 0;
      let errors = 0;
      const errorSamples: string[] = [];

      for (const item of aiCards) {
        const definition = uniqueStrings([
          ...(item.definition_en_main ? [item.definition_en_main] : []),
          ...(item.definitions_en ?? [])
        ])[0] ?? "";
        const frontBase = uniqueStrings([
          ...(item.front ? [item.front] : []),
          ...(item.front_sentence ? [item.front_sentence] : []),
          ...(item.front_sentence_options ?? [])
        ])[0] ?? "";
        const frontHint = normalizeText(item.front_hint ?? item.why_this_word_here ?? "");
        const front = frontHint ? `${frontBase}\n\nHint: ${frontHint}` : frontBase;
        const backExample = uniqueStrings([
          ...(item.back ? [item.back] : []),
          ...(item.back_sentence ? [item.back_sentence] : []),
          ...(item.back_sentence_options ?? [])
        ])[0] ?? "";
        const ruMeanings = uniqueStrings(item.ru_meanings ?? []);
        if (!front || !backExample || !definition) {
          errors += 1;
          if (errorSamples.length < 8) {
            errorSamples.push(`${item.word}: missing front/back/definition`);
          }
          continue;
        }

        const backLines = [`Word: ${item.word}`, `Definition (EN): ${definition}`];
        if (ruMeanings.length > 0) {
          backLines.push(`RU meanings: ${ruMeanings.join(" | ")}`);
        }
        backLines.push(`Example: ${backExample}`);
        const backText = backLines.join("\n");

        const res = await fetch(`/api/decks/${deckId}/smart-add`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            frontText: front,
            backText,
            targetWord: item.word,
            phonetic: "",
            audioUrl: "",
            imageUrl: "",
            tags: `smart-add,vocab,${item.word}`,
            level: 1
          })
        });
        const data = (await res.json()) as { cardId?: string; error?: string };
        if (res.ok) {
          created += 1;
        } else {
          errors += 1;
          if (errorSamples.length < 8) {
            errorSamples.push(`${item.word}: ${data.error ?? "save failed"}`);
          }
        }
      }

      if (created === 0) {
        throw new Error(
          `No cards created from AI JSON${errorSamples.length > 0 ? ` • ${errorSamples.join(" | ")}` : ""}`
        );
      }
      setWordInput("");
      setAiJsonInput("");
      setGlobalSuccess(
        `Created ${created} cards${errors > 0 ? `, errors: ${errors}${errorSamples.length > 0 ? ` • ${errorSamples.join(" | ")}` : ""}` : ""}`
      );
      router.push(`/decks/${deckId}`);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Could not create cards from AI JSON");
    } finally {
      setCreatingFromAiJson(false);
    }
  }

  async function copyAiPrompt() {
    try {
      await navigator.clipboard.writeText(aiPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 1800);
    } catch {
      setGlobalError("Could not copy prompt");
    }
  }

  async function importWordsFromFile(file: File) {
    setGlobalError(null);
    setGlobalSuccess(null);
    try {
      const text = await file.text();
      const lowerName = file.name.toLowerCase();
      const words = lowerName.endsWith(".csv")
        ? extractWordsFromDetectedColumn(parseCsvRows(text), detectEnglishColumn(parseCsvRows(text)))
        : parseWords(text);
      if (words.length === 0) {
        throw new Error("No English words found in file");
      }
      setWordInput(words.join("\n"));
      setCards(words.map((word) => createWordCard(word)));
      setGlobalSuccess(`Loaded ${words.length} words`);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "File import failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white p-4">
        <h2 className="text-lg font-semibold">Шаг 1. Добавь слова</h2>
        <p className="mt-1 text-sm text-slate-600">
          Введи одно слово или вставь список слов (каждое с новой строки).
        </p>
        <textarea
          value={wordInput}
          onChange={(e) => setWordInput(e.target.value)}
          rows={5}
          className="mt-3 w-full rounded border px-3 py-2"
          placeholder={"whisper\nborrow\numbrella\nstubborn"}
        />
        <div className="mt-3">
          <label className="mb-1 block text-sm font-medium">Импорт из файла (.csv/.txt)</label>
          <input
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void importWordsFromFile(file);
              e.currentTarget.value = "";
            }}
            className="block w-full text-sm"
          />
        </div>
        <button
          type="button"
          onClick={buildWordList}
          className="mt-3 rounded bg-slate-900 px-4 py-2 text-white"
        >
          Начать настройку карточек
        </button>
      </div>

      {cards.length > 0 ? (
        <div className="rounded-lg border bg-white p-4">
          <h2 className="text-lg font-semibold">Создание карточек с AI</h2>
          <p className="mt-1 text-sm text-slate-600">Пройди шаги по порядку, чтобы быстро получить готовые карточки.</p>

          <div className="mt-3 rounded border bg-slate-50 p-3">
            <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Слова для карточек</p>
            <div className="flex flex-wrap gap-2">
              {aiWords.map((word) => (
                <span key={`ai-word-${word}`} className="rounded border bg-white px-2 py-1 text-sm">
                  {word}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/40 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-base font-semibold text-blue-900">Шаг 2. Скопируй промпт</p>
            </div>
            <textarea
              readOnly
              value={aiPrompt}
              rows={16}
              className="w-full rounded border bg-slate-50 px-3 py-2 font-mono text-xs"
            />
            <div className="mt-2 flex items-center justify-start">
              <button
                type="button"
                onClick={() => void copyAiPrompt()}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {copiedPrompt ? "Скопировано" : "Скопировать промпт"}
              </button>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50/40 p-4">
            <p className="mb-2 text-base font-semibold text-violet-900">Шаг 3. Выбери AI и получи ответ</p>
            <p className="mb-3 text-sm text-slate-700">Открой любую модель, которой ты пользуешься, вставь промпт и получи данные.</p>
            <div className="flex flex-wrap gap-2">
            {AI_MODEL_LINKS.map((model) => (
              <a
                key={model.label}
                href={model.href}
                target="_blank"
                rel="noreferrer"
                  className="rounded-lg border border-violet-300 bg-white px-3 py-2 text-sm font-medium hover:bg-violet-50"
              >
                {model.label}
              </a>
            ))}
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
            <p className="text-base font-semibold text-emerald-900">Шаг 4. Вставь ответ AI и создай карточки</p>
            <p className="mt-1 text-sm text-slate-700">Вставь ответ AI в поле ниже и нажми «Создать карточки».</p>
            <textarea
              value={aiJsonInput}
              onChange={(e) => setAiJsonInput(e.target.value)}
              rows={12}
                className="mt-2 w-full rounded-lg border px-3 py-2 font-mono text-xs"
              placeholder='{"cards":[{"word":"whisper","front_sentence":"He whispered my name so nobody else could hear.","front_hint":"very quiet speech so others cannot hear","definition_en_main":"to speak very quietly so only nearby people hear","ru_meanings":["шептать","говорить шепотом"],"back_sentence":"She whispered the address while they stood near the door.","why_this_word_here":"because he speaks quietly to avoid being overheard"}]}'
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void createCardsFromAiJson()}
                disabled={creatingFromAiJson}
                className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {creatingFromAiJson ? "Создаем..." : "Создать карточки"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {globalError ? <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{globalError}</p> : null}
      {globalSuccess ? (
        <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">{globalSuccess}</p>
      ) : null}

    </div>
  );
}
