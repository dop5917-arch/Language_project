"use client";

import Papa from "papaparse";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

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

Task for each target word:
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
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
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
  const [activeIndex, setActiveIndex] = useState(0);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);
  const [translationModalOpen, setTranslationModalOpen] = useState(false);
  const [translationLoading, setTranslationLoading] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [translationSource, setTranslationSource] = useState("");
  const [translationText, setTranslationText] = useState("");
  const [translationCache, setTranslationCache] = useState<Record<string, string>>({});
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [aiJsonInput, setAiJsonInput] = useState("");
  const [applyingAiJson, setApplyingAiJson] = useState(false);
  const [creatingFromAiJson, setCreatingFromAiJson] = useState(false);
  const autoMetaRequestedRef = useRef<Set<string>>(new Set());
  const autoFrontRequestedRef = useRef<Set<string>>(new Set());
  const autoBackRequestedRef = useRef<Set<string>>(new Set());
  const autoWhyRequestedRef = useRef<Set<string>>(new Set());

  const activeCard = cards[activeIndex];

  const progressText = useMemo(() => {
    if (cards.length === 0) return "";
    return `Word ${activeIndex + 1} of ${cards.length}`;
  }, [activeIndex, cards.length]);

  const aiWords = useMemo(() => cards.map((card) => card.word), [cards]);
  const aiPrompt = useMemo(() => buildExternalAiPrompt(aiWords), [aiWords]);

  useEffect(() => {
    if (!activeCard) return;
    const word = activeCard.word;

    if (!autoMetaRequestedRef.current.has(word)) {
      autoMetaRequestedRef.current.add(word);
      void loadMeta(word);
      return;
    }

    if (
      activeCard.selectedRuMeaning.length > 0 &&
      activeCard.frontOptions.length === 0 &&
      !activeCard.loadingFront &&
      !autoFrontRequestedRef.current.has(word)
    ) {
      autoFrontRequestedRef.current.add(word);
      void generateFront(word, false);
    }
  }, [
    activeCard?.word,
    activeCard?.selectedRuMeaning.join("|"),
    activeCard?.frontOptions.length,
    activeCard?.loadingFront
  ]);

  useEffect(() => {
    if (!activeCard) return;
    if (!activeCard.selectedFront) return;
    if (activeCard.loadingBack) return;
    if (activeCard.backOptions.length > 0) return;

    const backKey = `${activeCard.word}::${activeCard.selectedFront}`;
    if (autoBackRequestedRef.current.has(backKey)) return;
    autoBackRequestedRef.current.add(backKey);
    void generateBack(activeCard.word, false);
  }, [
    activeCard?.word,
    activeCard?.selectedFront,
    activeCard?.loadingBack,
    activeCard?.backOptions.length
  ]);

  useEffect(() => {
    if (!activeCard) return;
    if (!activeCard.selectedFront) return;
    if (activeCard.loadingWhy) return;
    if (activeCard.whyThisWordHere) return;

    const whyKey = `${activeCard.word}::${activeCard.selectedFront}`;
    if (autoWhyRequestedRef.current.has(whyKey)) return;
    autoWhyRequestedRef.current.add(whyKey);
    void generateWhy(activeCard.word);
  }, [
    activeCard?.word,
    activeCard?.selectedFront,
    activeCard?.loadingWhy,
    activeCard?.whyThisWordHere
  ]);

  function updateCard(word: string, updater: (prev: WordCard) => WordCard) {
    setCards((prev) => prev.map((item) => (item.word === word ? updater(item) : item)));
  }

  async function loadMeta(word: string) {
    updateCard(word, (prev) => ({ ...prev, loadingMeta: true, error: undefined }));
    try {
      const res = await fetch(`/api/word-meaning?word=${encodeURIComponent(word)}`);
      const data = (await res.json()) as WordMeaningResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Could not load meanings");
      }

      const ruMeaningOptions = uniqueStrings(data.ruVariants ?? []).slice(0, 5);
      const definitionOptions = uniqueStrings((data.meanings ?? []).map((m) => m.definitionEn)).slice(0, 4);

      updateCard(word, (prev) => ({
        ...prev,
        loadingMeta: false,
        ruMeaningOptions,
        selectedRuMeaning:
          prev.selectedRuMeaning.length > 0
            ? prev.selectedRuMeaning
            : ruMeaningOptions[0]
              ? [ruMeaningOptions[0]]
              : [],
        definitionOptions,
        selectedDefinition: prev.selectedDefinition || definitionOptions[0] || "",
        definitionExclude: uniqueStrings([...prev.definitionExclude, ...definitionOptions]),
        phonetic: data.phonetic || prev.phonetic
      }));
    } catch (err) {
      updateCard(word, (prev) => ({
        ...prev,
        loadingMeta: false,
        error: err instanceof Error ? err.message : "Failed to load meanings"
      }));
    }
  }

  async function generateFront(word: string, more = false) {
    const card = cards.find((item) => item.word === word);
    if (!card) return;
    updateCard(word, (prev) => ({ ...prev, loadingFront: true, error: undefined }));

    try {
      const res = await fetch("/api/word-helper/sentences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word,
          exclude: more ? card.frontExclude : [],
          translationHint:
            card.selectedRuMeaning.length > 0 ? card.selectedRuMeaning.join(", ") : undefined
        })
      });
      const data = (await res.json()) as SentencesResponse;
      if (!res.ok || !data.sentences || data.sentences.length === 0) {
        throw new Error(data.error ?? "Could not generate front sentences");
      }
      const frontOptions = uniqueStrings(data.sentences).slice(0, 5);
      updateCard(word, (prev) => ({
        ...prev,
        loadingFront: false,
        frontOptions,
        selectedFront: prev.selectedFront && frontOptions.includes(prev.selectedFront) ? prev.selectedFront : frontOptions[0],
        frontExpanded: true,
        frontExclude: uniqueStrings([...(more ? prev.frontExclude : []), ...frontOptions]),
        backOptions: more ? prev.backOptions : [],
        selectedBack: more ? prev.selectedBack : "",
        saved: false
      }));
    } catch (err) {
      updateCard(word, (prev) => ({
        ...prev,
        loadingFront: false,
        error: err instanceof Error ? err.message : "Failed to generate front sentences"
      }));
    }
  }

  async function generateBack(word: string, more = false) {
    const card = cards.find((item) => item.word === word);
    if (!card || !card.selectedFront) {
      updateCard(word, (prev) => ({
        ...prev,
        error: "Choose sentence for front first"
      }));
      return;
    }

    updateCard(word, (prev) => ({ ...prev, loadingBack: true, error: undefined }));
    try {
      const res = await fetch("/api/word-helper/sentences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word,
          exclude: uniqueStrings([
            card.selectedFront,
            ...(more ? card.backExclude : [])
          ]),
          translationHint:
            card.selectedRuMeaning.length > 0 ? card.selectedRuMeaning.join(", ") : undefined
        })
      });
      const data = (await res.json()) as SentencesResponse;
      if (!res.ok || !data.sentences || data.sentences.length === 0) {
        throw new Error(data.error ?? "Could not generate back sentences");
      }

      const options = uniqueStrings(data.sentences).filter(
        (item) => similarity(card.selectedFront, item) < 0.7
      ).slice(0, 5);

      updateCard(word, (prev) => ({
        ...prev,
        loadingBack: false,
        backOptions: options,
        selectedBack: prev.selectedBack && options.includes(prev.selectedBack) ? prev.selectedBack : options[0] || "",
        backExpanded: true,
        backExclude: uniqueStrings([...(more ? prev.backExclude : []), ...options]),
        saved: false
      }));
    } catch (err) {
      updateCard(word, (prev) => ({
        ...prev,
        loadingBack: false,
        error: err instanceof Error ? err.message : "Failed to generate back sentences"
      }));
    }
  }

  async function generateDefinitions(word: string, more = false) {
    const card = cards.find((item) => item.word === word);
    if (!card) return;
    updateCard(word, (prev) => ({ ...prev, loadingDefinitions: true, error: undefined }));
    try {
      const res = await fetch("/api/word-helper/definitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word,
          exclude: more ? card.definitionExclude : [],
          translationHint:
            card.selectedRuMeaning.length > 0 ? card.selectedRuMeaning.join(", ") : undefined
        })
      });
      const data = (await res.json()) as DefinitionsResponse;
      if (!res.ok || !data.definitions || data.definitions.length === 0) {
        throw new Error(data.error ?? "Could not generate definitions");
      }
      const definitionOptions = uniqueStrings(data.definitions).slice(0, 4);
      updateCard(word, (prev) => ({
        ...prev,
        loadingDefinitions: false,
        definitionOptions,
        selectedDefinition:
          prev.selectedDefinition && definitionOptions.includes(prev.selectedDefinition)
            ? prev.selectedDefinition
            : definitionOptions[0],
        definitionExclude: uniqueStrings([...(more ? prev.definitionExclude : []), ...definitionOptions]),
        saved: false
      }));
    } catch (err) {
      updateCard(word, (prev) => ({
        ...prev,
        loadingDefinitions: false,
        error: err instanceof Error ? err.message : "Failed to generate definitions"
      }));
    }
  }

  async function generateWhy(word: string): Promise<string | null> {
    const card = cards.find((item) => item.word === word);
    if (!card || !card.selectedFront) return null;

    updateCard(word, (prev) => ({ ...prev, loadingWhy: true, error: undefined }));
    try {
      const res = await fetch("/api/word-helper/why", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word,
          sentence: card.selectedFront,
          ruMeaning: card.selectedRuMeaning.join(", "),
          definitionEn: card.selectedDefinition
        })
      });
      const data = (await res.json()) as WhyResponse;
      if (!res.ok || !data.why) {
        throw new Error(data.error ?? "Could not generate context explanation");
      }
      updateCard(word, (prev) => ({
        ...prev,
        loadingWhy: false,
        whyThisWordHere: data.why ?? "",
        saved: false
      }));
      return data.why ?? null;
    } catch (err) {
      updateCard(word, (prev) => ({
        ...prev,
        loadingWhy: false,
        error: err instanceof Error ? err.message : "Failed to generate context explanation"
      }));
      return null;
    }
  }

  async function saveCard(word: string) {
    const card = cards.find((item) => item.word === word);
    if (!card) return;

    if (!card.selectedDefinition || !card.selectedFront || !card.selectedBack) {
      updateCard(word, (prev) => ({
        ...prev,
        error: "Please choose definition, front and back"
      }));
      return;
    }

    updateCard(word, (prev) => ({ ...prev, saving: true, error: undefined }));
    try {
      const hintValue = normalizeText(card.whyThisWordHere);
      const frontText = hintValue && !/\bHint:/i.test(card.selectedFront)
        ? `${card.selectedFront}\n\nHint: ${hintValue}`
        : card.selectedFront;

      const backText = [
        `Word: ${word}`,
        `Definition (EN): ${card.selectedDefinition}`,
        `Example: ${card.selectedBack}`
      ].join("\n");

      const res = await fetch(`/api/decks/${deckId}/smart-add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frontText,
          backText,
          targetWord: word,
          phonetic: card.phonetic ?? "",
          audioUrl: "",
          imageUrl: "",
          tags: `smart-add,vocab,${word}`,
          level: 1
        })
      });
      const data = (await res.json()) as { error?: string; cardId?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to save card");

      updateCard(word, (prev) => ({
        ...prev,
        saving: false,
        saved: true,
        savedCardId: data.cardId
      }));
      setWordInput("");
      setGlobalSuccess(`Card "${word}" saved`);
      if (data.cardId) {
        router.push(`/decks/${deckId}/cards/${data.cardId}/edit`);
        return;
      }
    } catch (err) {
      updateCard(word, (prev) => ({
        ...prev,
        saving: false,
        error: err instanceof Error ? err.message : "Failed to save card"
      }));
    }
  }

  async function openSentenceTranslation(sentence: string) {
    const key = normalizeText(sentence);
    if (!key) return;
    setTranslationSource(key);
    setTranslationModalOpen(true);
    setTranslationError(null);

    const cached = translationCache[key];
    if (cached) {
      setTranslationText(cached);
      return;
    }

    setTranslationLoading(true);
    setTranslationText("");
    try {
      const res = await fetch("/api/translate-sentence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: key,
          sourceLang: "en",
          targetLang: "ru"
        })
      });
      const data = (await res.json()) as TranslateResponse;
      if (!res.ok || !data.translation) {
        throw new Error(data.error ?? "Empty translation");
      }
      setTranslationText(data.translation);
      setTranslationCache((prev) => ({ ...prev, [key]: data.translation as string }));
    } catch (err) {
      setTranslationError(err instanceof Error ? err.message : "Translation failed");
    } finally {
      setTranslationLoading(false);
    }
  }

  function buildWordList() {
    const words = parseWords(wordInput);
    if (words.length === 0) {
      setGlobalError("Add at least one English word");
      return;
    }
    setCards(words.map((word) => createWordCard(word)));
    setActiveIndex(0);
    setGlobalError(null);
    setGlobalSuccess(`Prepared ${words.length} words`);
  }

  function parseAiCardsFromInput(input: string): AiCardPayload[] {
    const raw = extractJsonPayload(input);
    if (!raw) throw new Error("Paste AI JSON first");
    const parsed = JSON.parse(raw) as AiCardsResponse;
    if (!parsed.cards || !Array.isArray(parsed.cards) || parsed.cards.length === 0) {
      throw new Error("Invalid JSON: cards[] is required");
    }

    const cleaned: AiCardPayload[] = [];
    const seen = new Set<string>();
    for (const item of parsed.cards) {
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

  function buildWordCardFromAi(item: AiCardPayload): WordCard {
    const card = createWordCard(item.word);
    const ruMeaningOptions = uniqueStrings(item.ru_meanings ?? []);
    const definitionOptions = uniqueStrings([
      ...(item.definition_en_main ? [item.definition_en_main] : []),
      ...(item.definitions_en ?? [])
    ]);
    const frontOptions = uniqueStrings([
      ...(item.front_sentence ? [item.front_sentence] : []),
      ...(item.front_sentence_options ?? [])
    ]).slice(0, 5);
    const backOptions = uniqueStrings([
      ...(item.back_sentence ? [item.back_sentence] : []),
      ...(item.back_sentence_options ?? [])
    ]).slice(0, 5);
    const frontHint = normalizeText(item.front_hint ?? item.why_this_word_here ?? "");
    return {
      ...card,
      ruMeaningOptions,
      selectedRuMeaning: ruMeaningOptions[0] ? [ruMeaningOptions[0]] : [],
      definitionOptions,
      selectedDefinition: definitionOptions[0] ?? "",
      frontOptions: frontHint && frontOptions[0]
        ? uniqueStrings([`${frontOptions[0]}\n\nHint: ${frontHint}`, ...frontOptions])
        : frontOptions,
      selectedFront:
        frontHint && frontOptions[0]
          ? `${frontOptions[0]}\n\nHint: ${frontHint}`
          : frontOptions[0] ?? "",
      frontExpanded: frontOptions.length > 1,
      backOptions,
      selectedBack: backOptions[0] ?? "",
      backExpanded: backOptions.length > 1,
      whyThisWordHere: normalizeText(item.front_hint ?? item.why_this_word_here ?? ""),
      loadingMeta: false
    };
  }

  async function applyAiJsonToSetup() {
    setApplyingAiJson(true);
    setGlobalError(null);
    setGlobalSuccess(null);
    try {
      const aiCards = parseAiCardsFromInput(aiJsonInput);
      const nextCards = aiCards.map((item) => buildWordCardFromAi(item));
      setCards(nextCards);
      setWordInput(nextCards.map((item) => item.word).join("\n"));
      setActiveIndex(0);
      setGlobalSuccess(`Applied AI JSON: ${nextCards.length} words ready`);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "Could not apply AI JSON");
    } finally {
      setApplyingAiJson(false);
    }
  }

  async function createCardsFromAiJson() {
    setCreatingFromAiJson(true);
    setGlobalError(null);
    setGlobalSuccess(null);
    try {
      const aiCards = parseAiCardsFromInput(aiJsonInput);
      let created = 0;
      let errors = 0;
      let firstCreatedCardId: string | null = null;
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
        if (!front || !backExample || !definition) {
          errors += 1;
          if (errorSamples.length < 8) {
            errorSamples.push(`${item.word}: missing front/back/definition`);
          }
          continue;
        }

        const backText = [
          `Word: ${item.word}`,
          `Definition (EN): ${definition}`,
          `Example: ${backExample}`
        ].join("\n");

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
          if (!firstCreatedCardId && data.cardId) {
            firstCreatedCardId = data.cardId;
          }
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
      if (firstCreatedCardId) {
        router.push(`/decks/${deckId}/cards/${firstCreatedCardId}/edit`);
      }
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
      setActiveIndex(0);
      setGlobalSuccess(`Loaded ${words.length} words`);
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : "File import failed");
    }
  }

  function addCustomFront() {
    if (!activeCard) return;
    const text = normalizeText(activeCard.selectedFront);
    if (!text) return;
    updateCard(activeCard.word, (prev) => ({
      ...prev,
      frontOptions: uniqueStrings([...prev.frontOptions, text]),
      selectedFront: text,
      saved: false
    }));
  }

  function addCustomBack() {
    if (!activeCard) return;
    const text = normalizeText(activeCard.selectedBack);
    if (!text) return;
    updateCard(activeCard.word, (prev) => ({
      ...prev,
      backOptions: uniqueStrings([...prev.backOptions, text]),
      selectedBack: text,
      saved: false
    }));
  }

  function addCustomDefinition() {
    if (!activeCard) return;
    const text = normalizeText(activeCard.selectedDefinition);
    if (!text) return;
    updateCard(activeCard.word, (prev) => ({
      ...prev,
      definitionOptions: uniqueStrings([...prev.definitionOptions, text]),
      selectedDefinition: text,
      saved: false
    }));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white p-4">
        <h2 className="text-lg font-semibold">Step 1. Enter Words</h2>
        <p className="mt-1 text-sm text-slate-600">
          Enter one word or paste multiple words (one per line).
        </p>
        <textarea
          value={wordInput}
          onChange={(e) => setWordInput(e.target.value)}
          rows={5}
          className="mt-3 w-full rounded border px-3 py-2"
          placeholder={"whisper\nborrow\numbrella\nstubborn"}
        />
        <div className="mt-3">
          <label className="mb-1 block text-sm font-medium">Import from document (.csv/.txt)</label>
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
          Start Card Setup
        </button>
      </div>

      {cards.length > 0 ? (
        <div className="rounded-lg border bg-white p-4">
          <h2 className="text-lg font-semibold">Generate Flashcards with AI</h2>
          <p className="mt-1 text-sm text-slate-600">
            Copy this prompt and paste it into any model. The model will generate card data for your words.
          </p>

          <div className="mt-3 rounded border bg-slate-50 p-3">
            <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Words</p>
            <div className="flex flex-wrap gap-2">
              {aiWords.map((word) => (
                <span key={`ai-word-${word}`} className="rounded border bg-white px-2 py-1 text-sm">
                  {word}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-3 rounded border p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Generated prompt</p>
              <button
                type="button"
                onClick={() => void copyAiPrompt()}
                className="rounded border px-3 py-1 text-sm"
              >
                {copiedPrompt ? "Copied" : "Copy prompt"}
              </button>
            </div>
            <textarea
              readOnly
              value={aiPrompt}
              rows={16}
              className="w-full rounded border bg-slate-50 px-3 py-2 font-mono text-xs"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {AI_MODEL_LINKS.map((model) => (
              <a
                key={model.label}
                href={model.href}
                target="_blank"
                rel="noreferrer"
                className="rounded border px-3 py-2 text-sm hover:bg-slate-50"
              >
                {model.label}
              </a>
            ))}
          </div>

          <div className="mt-4 rounded border p-3">
            <p className="text-sm font-semibold">Paste AI JSON</p>
            <p className="mt-1 text-xs text-slate-500">
              Paste model output, then apply to setup or create cards directly.
            </p>
            <textarea
              value={aiJsonInput}
              onChange={(e) => setAiJsonInput(e.target.value)}
              rows={12}
              className="mt-2 w-full rounded border px-3 py-2 font-mono text-xs"
              placeholder='{"cards":[{"word":"whisper","front_sentence":"He whispered my name so nobody else could hear.","front_hint":"very quiet speech so others cannot hear","definition_en_main":"to speak very quietly so only nearby people hear","ru_meanings":["шептать","говорить шепотом"],"back_sentence":"She whispered the address while they stood near the door.","why_this_word_here":"because he speaks quietly to avoid being overheard"}]}'
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void applyAiJsonToSetup()}
                disabled={applyingAiJson}
                className="rounded border px-3 py-2 text-sm disabled:opacity-50"
              >
                {applyingAiJson ? "Applying..." : "Apply AI JSON to setup"}
              </button>
              <button
                type="button"
                onClick={() => void createCardsFromAiJson()}
                disabled={creatingFromAiJson}
                className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                {creatingFromAiJson ? "Creating..." : "Create cards from AI JSON"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {cards.length > 0 ? (
        <div className="rounded-lg border bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-600">{progressText}</span>
            <button
              type="button"
              onClick={() => setActiveIndex((prev) => Math.max(0, prev - 1))}
              disabled={activeIndex === 0}
              className="rounded border px-3 py-1 text-sm disabled:opacity-50"
            >
              Previous word
            </button>
            <button
              type="button"
              onClick={() => setActiveIndex((prev) => Math.min(cards.length - 1, prev + 1))}
              disabled={activeIndex >= cards.length - 1}
              className="rounded border px-3 py-1 text-sm disabled:opacity-50"
            >
              Next word
            </button>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {cards.map((card, idx) => (
              <button
                key={card.word}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`rounded border px-2 py-1 text-xs ${
                  idx === activeIndex ? "border-blue-600 bg-blue-50 text-blue-700" : ""
                }`}
              >
                {card.word}
                {card.saved ? " ✓" : ""}
              </button>
            ))}
          </div>

          {activeCard ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-slate-50 p-4">
                <h3 className="text-3xl font-semibold">{activeCard.word}</h3>
                <p className="mt-2 text-sm text-slate-600">
                  {activeCard.loadingMeta
                    ? "Loading meaning + definition..."
                    : "Meaning + definition are loaded automatically."}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <p className="mb-2 text-sm font-semibold">Choose meaning</p>
                {activeCard.ruMeaningOptions.length === 0 ? (
                  <p className="text-sm text-slate-500">Load meaning options first.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {activeCard.ruMeaningOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() =>
                          updateCard(activeCard.word, (prev) => ({
                            ...prev,
                            selectedRuMeaning: prev.selectedRuMeaning.includes(option)
                              ? prev.selectedRuMeaning.filter((item) => item !== option)
                              : [...prev.selectedRuMeaning, option],
                            saved: false
                          }))
                        }
                        className={`rounded border px-2 py-1 text-sm ${
                          activeCard.selectedRuMeaning.includes(option)
                            ? "border-blue-600 bg-blue-50 text-blue-700"
                            : ""
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex flex-wrap gap-2">
                  <p className="text-sm font-semibold">Choose sentence for front</p>
                  {activeCard.loadingFront ? (
                    <span className="rounded border px-2 py-1 text-xs">Generating front...</span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void generateFront(activeCard.word, true)}
                    disabled={activeCard.loadingFront || activeCard.frontOptions.length === 0}
                    className="rounded border px-2 py-1 text-xs disabled:opacity-50"
                  >
                    Generate more front sentences
                  </button>
                </div>
                {activeCard.selectedFront && !activeCard.frontExpanded ? (
                  <div className="space-y-2">
                    <div className="rounded border bg-blue-50 p-3 text-sm text-blue-700">
                      {activeCard.selectedFront}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateCard(activeCard.word, (prev) => ({
                            ...prev,
                            frontExpanded: true
                          }))
                        }
                        className="rounded border px-2 py-1 text-xs"
                      >
                        Change front sentence
                      </button>
                      <button
                        type="button"
                        onClick={() => void openSentenceTranslation(activeCard.selectedFront)}
                        className="rounded border px-2 py-1 text-xs"
                      >
                        Translate
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {activeCard.frontOptions.map((sentence) => (
                        <div key={sentence} className="rounded border p-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateCard(activeCard.word, (prev) => ({
                                ...prev,
                                selectedFront: sentence,
                                frontExpanded: false,
                                saved: false
                              }))
                            }
                            className={`block w-full rounded px-2 py-1 text-left text-sm ${
                              activeCard.selectedFront === sentence ? "bg-blue-50 text-blue-700" : ""
                            }`}
                          >
                            {sentence}
                          </button>
                          <button
                            type="button"
                            onClick={() => void openSentenceTranslation(sentence)}
                            className="mt-1 rounded border px-2 py-1 text-xs"
                          >
                            Translate
                          </button>
                        </div>
                      ))}
                    </div>
                    <textarea
                      value={activeCard.selectedFront}
                      onChange={(e) =>
                        updateCard(activeCard.word, (prev) => ({
                          ...prev,
                          selectedFront: e.target.value,
                          saved: false
                        }))
                      }
                      rows={3}
                      className="mt-3 w-full rounded border px-3 py-2"
                      placeholder="Write your own sentence for front"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        addCustomFront();
                        updateCard(activeCard.word, (prev) => ({ ...prev, frontExpanded: false }));
                      }}
                      className="mt-2 rounded border border-dashed px-3 py-1 text-sm"
                    >
                      Add custom front sentence
                    </button>
                  </>
                )}
              </div>

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex flex-wrap gap-2">
                  <p className="text-sm font-semibold">Choose sentence for back</p>
                  <button
                    type="button"
                    onClick={() => void generateBack(activeCard.word, false)}
                    disabled={activeCard.loadingBack || !activeCard.selectedFront}
                    className="rounded border px-2 py-1 text-xs disabled:opacity-50"
                  >
                    {activeCard.loadingBack ? "Generating..." : "Generate back (5)"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void generateBack(activeCard.word, true)}
                    disabled={activeCard.loadingBack || activeCard.backOptions.length === 0}
                    className="rounded border px-2 py-1 text-xs disabled:opacity-50"
                  >
                    Generate more back sentences
                  </button>
                </div>
                {activeCard.selectedBack && !activeCard.backExpanded ? (
                  <div className="space-y-2">
                    <div className="rounded border bg-indigo-50 p-3 text-sm text-indigo-700">
                      {activeCard.selectedBack}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateCard(activeCard.word, (prev) => ({
                            ...prev,
                            backExpanded: true
                          }))
                        }
                        className="rounded border px-2 py-1 text-xs"
                      >
                        Change back sentence
                      </button>
                      <button
                        type="button"
                        onClick={() => void openSentenceTranslation(activeCard.selectedBack)}
                        className="rounded border px-2 py-1 text-xs"
                      >
                        Translate
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {activeCard.backOptions.map((sentence) => (
                        <div key={sentence} className="rounded border p-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateCard(activeCard.word, (prev) => ({
                                ...prev,
                                selectedBack: sentence,
                                backExpanded: false,
                                whyThisWordHere: "",
                                saved: false
                              }))
                            }
                            className={`block w-full rounded px-2 py-1 text-left text-sm ${
                              activeCard.selectedBack === sentence ? "bg-indigo-50 text-indigo-700" : ""
                            }`}
                          >
                            {sentence}
                          </button>
                          <button
                            type="button"
                            onClick={() => void openSentenceTranslation(sentence)}
                            className="mt-1 rounded border px-2 py-1 text-xs"
                          >
                            Translate
                          </button>
                        </div>
                      ))}
                    </div>
                    <textarea
                      value={activeCard.selectedBack}
                      onChange={(e) =>
                        updateCard(activeCard.word, (prev) => ({
                          ...prev,
                          selectedBack: e.target.value,
                          whyThisWordHere: "",
                          saved: false
                        }))
                      }
                      rows={3}
                      className="mt-3 w-full rounded border px-3 py-2"
                      placeholder="Write your own sentence for back"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        addCustomBack();
                        updateCard(activeCard.word, (prev) => ({ ...prev, backExpanded: false }));
                      }}
                      className="mt-2 rounded border border-dashed px-3 py-1 text-sm"
                    >
                      Add custom back sentence
                    </button>
                  </>
                )}
                <div className="mt-3 rounded border bg-slate-50 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <p className="text-sm font-semibold">Front hint (why this word here)</p>
                    {activeCard.loadingWhy ? (
                      <span className="text-xs text-slate-500">Generating...</span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void generateWhy(activeCard.word)}
                      disabled={activeCard.loadingWhy || !activeCard.selectedBack}
                      className="rounded border px-2 py-1 text-xs disabled:opacity-50"
                    >
                      Regenerate
                    </button>
                  </div>
                  <textarea
                    value={activeCard.whyThisWordHere}
                    onChange={(e) =>
                      updateCard(activeCard.word, (prev) => ({
                        ...prev,
                        whyThisWordHere: e.target.value,
                        saved: false
                      }))
                    }
                    rows={2}
                    className="w-full rounded border px-3 py-2 text-sm"
                    placeholder="Short context clue for the front side"
                  />
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex flex-wrap gap-2">
                  <p className="text-sm font-semibold">Choose definition</p>
                  <button
                    type="button"
                    onClick={() => void generateDefinitions(activeCard.word, false)}
                    disabled={activeCard.loadingDefinitions}
                    className="rounded border px-2 py-1 text-xs disabled:opacity-50"
                  >
                    {activeCard.loadingDefinitions ? "Generating..." : "Generate definitions"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void generateDefinitions(activeCard.word, true)}
                    disabled={activeCard.loadingDefinitions || activeCard.definitionOptions.length === 0}
                    className="rounded border px-2 py-1 text-xs disabled:opacity-50"
                  >
                    Generate more definitions
                  </button>
                </div>
                <div className="space-y-2">
                  {activeCard.definitionOptions.map((definition) => (
                    <button
                      key={definition}
                      type="button"
                      onClick={() =>
                        updateCard(activeCard.word, (prev) => ({
                          ...prev,
                          selectedDefinition: definition,
                          saved: false
                        }))
                      }
                      className={`block w-full rounded border px-3 py-2 text-left text-sm ${
                        activeCard.selectedDefinition === definition
                          ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                          : ""
                      }`}
                    >
                      {definition}
                    </button>
                  ))}
                </div>
                <textarea
                  value={activeCard.selectedDefinition}
                  onChange={(e) =>
                    updateCard(activeCard.word, (prev) => ({
                      ...prev,
                      selectedDefinition: e.target.value,
                      saved: false
                    }))
                  }
                  rows={2}
                  className="mt-3 w-full rounded border px-3 py-2"
                  placeholder="Edit or write your own definition"
                />
                <button
                  type="button"
                  onClick={addCustomDefinition}
                  className="mt-2 rounded border border-dashed px-3 py-1 text-sm"
                >
                  Add custom definition
                </button>
              </div>

              <div className="rounded-lg border bg-slate-50 p-4 text-sm">
                <p><strong>FRONT</strong>: {activeCard.selectedFront || "-"}</p>
                <p className="mt-2 whitespace-pre-line">
                  <strong>BACK</strong>:{" "}
                  {activeCard.selectedDefinition && activeCard.selectedBack
                    ? `Word: ${activeCard.word}\nDefinition (EN): ${activeCard.selectedDefinition}\nExample: ${activeCard.selectedBack}`
                    : "-"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void saveCard(activeCard.word)}
                  disabled={activeCard.saving}
                  className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
                >
                  {activeCard.saving ? "Saving..." : "Save card"}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveIndex((prev) => Math.min(cards.length - 1, prev + 1))}
                  disabled={activeIndex >= cards.length - 1}
                  className="rounded border px-4 py-2 disabled:opacity-50"
                >
                  Next word
                </button>
              </div>
              {activeCard.saved ? <p className="text-sm text-emerald-700">Card saved.</p> : null}
              {activeCard.error ? <p className="text-sm text-red-600">{activeCard.error}</p> : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {globalError ? <p className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{globalError}</p> : null}
      {globalSuccess ? (
        <p className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">{globalSuccess}</p>
      ) : null}

      {translationModalOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[300] bg-black/30"
            onClick={() => setTranslationModalOpen(false)}
            aria-label="Close translation modal"
          />
          <div className="fixed left-1/2 top-1/2 z-[310] w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold">Sentence Translation</h3>
              <button
                type="button"
                onClick={() => setTranslationModalOpen(false)}
                className="rounded border px-3 py-1 text-sm"
              >
                Close
              </button>
            </div>
            <p className="rounded border bg-slate-50 p-3 text-sm">{translationSource}</p>
            {translationLoading ? <p className="mt-3 text-sm text-slate-600">Translating...</p> : null}
            {translationError ? <p className="mt-3 text-sm text-red-600">{translationError}</p> : null}
            {!translationLoading && !translationError && translationText ? (
              <p className="mt-3 rounded border bg-blue-50 p-3 text-sm">{translationText}</p>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
