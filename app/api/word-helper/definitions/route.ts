import { NextRequest, NextResponse } from "next/server";
import { definitionOptionsSchema } from "@/lib/validations";

type DictionaryEntry = {
  meanings?: Array<{
    partOfSpeech?: string;
    definitions?: Array<{
      definition?: string;
    }>;
  }>;
};

function normalizeWord(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function uniqueStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const v = normalizeText(value);
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

function isLearnerFriendly(definition: string): boolean {
  const d = normalizeText(definition);
  if (!d) return false;
  if (d.length < 12 || d.length > 180) return false;
  if (/https?:\/\//i.test(d)) return false;
  if (/[{}[\]|<>]/.test(d)) return false;
  return true;
}

async function fetchDictionaryDefinitions(word: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) return [];
    const entries = data as DictionaryEntry[];
    const defs: string[] = [];
    for (const entry of entries) {
      for (const meaning of entry.meanings ?? []) {
        for (const def of meaning.definitions ?? []) {
          if (def.definition?.trim()) {
            const part = meaning.partOfSpeech?.trim();
            const text = def.definition.trim();
            defs.push(part ? `${part}: ${text}` : text);
          }
        }
      }
    }
    return uniqueStrings(defs).filter(isLearnerFriendly);
  } catch {
    return [];
  }
}

async function fetchLlmDefinitions(word: string, exclude: string[], hint?: string): Promise<string[]> {
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
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Generate short learner-friendly English definitions for one word. Output JSON only: {\"definitions\": [\"...\"]}."
          },
          {
            role: "user",
            content: `Word: "${word}"\nMeaning hint in Russian: "${hint ?? "none"}"\nGenerate 6 short clear definitions.\nAvoid these definitions: ${exclude.join(" || ") || "none"}`
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
    const parsed = JSON.parse(content) as { definitions?: string[] };
    if (!Array.isArray(parsed.definitions)) return [];
    return uniqueStrings(parsed.definitions).filter(isLearnerFriendly);
  } catch {
    return [];
  }
}

function buildFallbackDefinitions(word: string, hint?: string): string[] {
  const withHint = hint ? `related to "${hint}"` : "in everyday use";
  return [
    `to use "${word}" in a practical everyday context`,
    `a common meaning of "${word}" ${withHint}`,
    `something people say or do when they use "${word}"`,
    `"${word}" used in a natural real-life situation`
  ];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = definitionOptionsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const word = normalizeWord(parsed.data.word);
    const exclude = uniqueStrings(parsed.data.exclude ?? []);
    const excluded = new Set(exclude.map((item) => item.toLowerCase()));

    const [dict, llm] = await Promise.all([
      fetchDictionaryDefinitions(word),
      fetchLlmDefinitions(word, exclude, parsed.data.translationHint)
    ]);

    const fallback = buildFallbackDefinitions(word, parsed.data.translationHint);
    const definitions = uniqueStrings([...dict, ...llm, ...fallback])
      .filter((item) => !excluded.has(item.toLowerCase()))
      .slice(0, 4);

    if (definitions.length === 0) {
      return NextResponse.json({ error: "No definitions found", definitions: [] }, { status: 422 });
    }

    return NextResponse.json({ definitions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
