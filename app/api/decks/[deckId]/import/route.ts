import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { importCardsFromCsvText } from "@/lib/import-csv";
import { buildPublicUrl } from "@/lib/request-url";

type Context = {
  params: { deckId: string };
};

export async function POST(req: NextRequest, { params }: Context) {
  const formData = await req.formData();
  const file = formData.get("file");
  const csvTextInput = formData.get("csvText");

  let csvText = "";
  if (typeof csvTextInput === "string" && csvTextInput.trim().length > 0) {
    csvText = csvTextInput;
  } else if (file instanceof File && file.size > 0) {
    csvText = await file.text();
  }

  const url = buildPublicUrl(req, `/decks/${params.deckId}/import`);

  try {
    if (!csvText.trim()) {
      throw new Error("Provide a CSV file or paste CSV text");
    }

    const result = await importCardsFromCsvText(params.deckId, csvText);
    revalidatePath(`/decks/${params.deckId}`);
    revalidatePath(`/decks/${params.deckId}/today`);
    url.searchParams.set("imported", String(result.created));
  } catch (error) {
    url.searchParams.set("error", error instanceof Error ? error.message : "Import failed");
  }

  return NextResponse.redirect(url, { status: 303 });
}
