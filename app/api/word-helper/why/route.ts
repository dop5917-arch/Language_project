import { NextRequest, NextResponse } from "next/server";
import { whyThisWordSchema } from "@/lib/validations";

const BANNED_META = [
  "word",
  "vocabulary",
  "dictionary",
  "translation",
  "language",
  "english"
];

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function tokenize(value: string): string[] {
  return (value.toLowerCase().match(/[a-z']+/g) ?? []).filter(Boolean);
}

function hasBannedMeta(text: string): boolean {
  const tokens = tokenize(text);
  return tokens.some((token) => BANNED_META.includes(token));
}

function isValidWhy(valueRaw: string): boolean {
  const value = normalizeText(valueRaw);
  if (!value) return false;
  const wc = tokenize(value).length;
  if (wc < 6 || wc > 12) return false;
  if (hasBannedMeta(value)) return false;
  if (/^the word means\b/i.test(value)) return false;
  if (/https?:\/\//i.test(value)) return false;
  if (/[{}[\]|<>]/.test(value)) return false;
  return true;
}

function fallbackWhy(definitionEn?: string, ruMeaning?: string): string {
  const source = normalizeText(definitionEn || ruMeaning || "this meaning in a real situation");
  const short = source.split(" ").slice(0, 6).join(" ");
  const fallback = `because here it means ${short || "this in context"}`;
  const safe = normalizeText(fallback);
  const wc = tokenize(safe).length;
  if (wc >= 6 && wc <= 12 && !hasBannedMeta(safe)) return safe;
  return "because this context shows the intended meaning clearly";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = whyThisWordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
        { status: 400 }
      );
    }

    const word = parsed.data.word.trim().toLowerCase();
    const sentence = normalizeText(parsed.data.sentence);
    const ruMeaning = normalizeText(parsed.data.ruMeaning ?? "");
    const definitionEn = normalizeText(parsed.data.definitionEn ?? "");

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        why: fallbackWhy(definitionEn, ruMeaning)
      });
    }

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
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Write a very short plain-English context explanation for one sentence. Output JSON only: {\"why\":\"...\"}."
          },
          {
            role: "user",
            content: `Target word: "${word}"
Sentence: "${sentence}"
Russian meaning hint: "${ruMeaning || "none"}"
Definition hint: "${definitionEn || "none"}"

Rules:
- 6 to 12 words
- simple English
- explain why the target word fits this sentence
- not a dictionary definition
- do not start with "the word means"
- do not use: word, vocabulary, dictionary, translation, language, English
- prefer starting with "because"

Output JSON only: {"why":"..."}`
          }
        ]
      })
    });

    if (!res.ok) {
      return NextResponse.json({
        why: fallbackWhy(definitionEn, ruMeaning)
      });
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({
        why: fallbackWhy(definitionEn, ruMeaning)
      });
    }

    let parsedWhy = "";
    try {
      const obj = JSON.parse(content) as { why?: string };
      parsedWhy = normalizeText(obj.why ?? "");
    } catch {
      parsedWhy = "";
    }

    const why = isValidWhy(parsedWhy) ? parsedWhy : fallbackWhy(definitionEn, ruMeaning);
    return NextResponse.json({ why });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      { status: 500 }
    );
  }
}
