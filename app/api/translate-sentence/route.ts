import { NextRequest, NextResponse } from "next/server";
import { sentenceTranslateSchema } from "@/lib/validations";

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function hasCyrillic(value: string): boolean {
  return /[А-Яа-яЁё]/.test(value);
}

function hasLatin(value: string): boolean {
  return /[A-Za-z]/.test(value);
}

function looksWeakTranslation(source: string, translated: string): boolean {
  const s = normalizeText(source).toLowerCase();
  const t = normalizeText(translated).toLowerCase();
  if (!t) return true;
  if (s === t) return true;
  if (!hasCyrillic(t)) return true;
  // If mostly Latin remains, translation is likely poor/translit.
  if (hasLatin(t) && t.length > 8) return true;
  return false;
}

async function translateViaLlm(source: string, sourceLang: string, targetLang: string): Promise<string | null> {
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
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a precise sentence translator. Return only JSON: {\"translation\":\"...\"}. Keep natural spoken style."
          },
          {
            role: "user",
            content: `Translate from ${sourceLang} to ${targetLang}: "${source}"`
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
    const parsed = JSON.parse(content) as { translation?: string };
    const translation = normalizeText(parsed.translation ?? "");
    return translation || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = sentenceTranslateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const text = normalizeText(parsed.data.text);
    const sl = parsed.data.sourceLang || "en";
    const tl = parsed.data.targetLang || "ru";

    const url = new URL("https://translate.googleapis.com/translate_a/single");
    url.searchParams.set("client", "gtx");
    url.searchParams.set("sl", sl);
    url.searchParams.set("tl", tl);
    url.searchParams.set("dt", "t");
    url.searchParams.set("dt", "bd");
    url.searchParams.set("dj", "1");
    url.searchParams.set("q", text);

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ error: "Translation service unavailable" }, { status: 502 });
    }

    const data = (await res.json()) as unknown;
    let translation = "";

    if (data && typeof data === "object" && "sentences" in data) {
      const dj = data as { sentences?: Array<{ trans?: string }> };
      translation = normalizeText((dj.sentences ?? []).map((s) => s.trans ?? "").join(""));
    } else if (Array.isArray(data) && Array.isArray(data[0])) {
      const chunks = data[0] as Array<[string]>;
      translation = normalizeText(chunks.map((item) => item[0] ?? "").join(""));
    }

    if (!translation) {
      const llmOnly = await translateViaLlm(text, sl, tl);
      if (!llmOnly) {
        return NextResponse.json({ error: "Empty translation" }, { status: 502 });
      }
      return NextResponse.json({
        source: text,
        translation: llmOnly,
        sourceLang: sl,
        targetLang: tl,
        provider: "llm-fallback"
      });
    }

    if (looksWeakTranslation(text, translation)) {
      const llmBetter = await translateViaLlm(text, sl, tl);
      if (llmBetter) {
        return NextResponse.json({
          source: text,
          translation: llmBetter,
          sourceLang: sl,
          targetLang: tl,
          provider: "llm-fallback"
        });
      }
    }

    return NextResponse.json({
      source: text,
      translation,
      sourceLang: sl,
      targetLang: tl,
      provider: "google"
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
