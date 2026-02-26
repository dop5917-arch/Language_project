import Papa from "papaparse";
import { prisma } from "@/lib/prisma";
import { csvImportRowSchema } from "@/lib/validations";

type RawRow = Record<string, string | undefined>;

export async function importCardsFromCsvText(deckId: string, csvText: string) {
  const result = Papa.parse<RawRow>(csvText, {
    header: true,
    skipEmptyLines: true
  });

  if (result.errors.length > 0) {
    throw new Error(`CSV parse error: ${result.errors[0].message}`);
  }

  const rows = result.data.map((row, index) => {
    const levelRaw = row.level?.trim();
    const level =
      levelRaw && levelRaw.length > 0
        ? Number.isInteger(Number(levelRaw))
          ? Number(levelRaw)
          : Number.NaN
        : undefined;

    const parsed = csvImportRowSchema.safeParse({
      front_text: row.front_text ?? "",
      back_text: row.back_text ?? "",
      image_url: row.image_url ?? "",
      tags: row.tags ?? "",
      level
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      throw new Error(`Row ${index + 2}: ${issue?.message ?? "Invalid row"}`);
    }

    return parsed.data;
  });

  if (rows.length === 0) {
    throw new Error("No rows found in CSV");
  }

  await prisma.card.createMany({
    data: rows.map((row) => ({
      deckId,
      targetWord: undefined,
      frontText: row.front_text,
      backText: row.back_text,
      phonetic: undefined,
      audioUrl: undefined,
      imageUrl: row.image_url,
      tags: row.tags,
      level: row.level
    }))
  });

  return { created: rows.length };
}
