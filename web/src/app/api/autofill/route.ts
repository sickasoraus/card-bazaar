import { NextResponse } from "next/server";

import { getAutofillSuggestions } from "@/services/autofill";

const COLOR_VALUES = new Set(["W", "U", "B", "R", "G"]);

type AutofillRequestBody = {
  deckId?: string | null;
  deckName?: string | null;
  format?: string | null;
  colors?: unknown;
  cards?: unknown;
  limit?: number;
};

function normalizeColors(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  const normalized = value
    .map((entry) => (typeof entry === "string" ? entry.trim().toUpperCase() : ""))
    .filter((color) => COLOR_VALUES.has(color));
  return normalized.length ? normalized : null;
}

function normalizeCards(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const { cardId, name, quantity, imageUrl } = entry as Record<string, unknown>;
      if (typeof cardId !== "string" || !cardId.trim().length) {
        return null;
      }
      if (typeof name !== "string" || !name.trim().length) {
        return null;
      }
      const parsedQuantity = Number.isFinite(quantity) ? Math.max(0, Math.floor(Number(quantity))) : 0;
      if (!parsedQuantity) {
        return null;
      }
      return {
        cardId: cardId.trim(),
        name: name.trim(),
        quantity: parsedQuantity,
        imageUrl: typeof imageUrl === "string" ? imageUrl : null,
      };
    })
    .filter(Boolean) as Array<{ cardId: string; name: string; quantity: number; imageUrl: string | null }>;
}

export async function POST(request: Request) {
  let json: AutofillRequestBody;
  try {
    json = (await request.json()) as AutofillRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const cards = normalizeCards(json.cards);
  if (!cards.length) {
    return NextResponse.json({ error: "Autofill request requires mainboard cards." }, { status: 400 });
  }

  const colors = normalizeColors(json.colors);
  const format = typeof json.format === "string" && json.format.trim().length ? json.format.trim().toLowerCase() : null;
  const deckId = typeof json.deckId === "string" && json.deckId.trim().length ? json.deckId.trim() : null;
  const deckName = typeof json.deckName === "string" && json.deckName.trim().length ? json.deckName.trim() : "Untitled Deck";
  const limit = json.limit && Number.isFinite(json.limit) ? Math.max(1, Math.floor(json.limit)) : 10;

  try {
    const suggestions = await getAutofillSuggestions({
      deckId,
      deckName,
      format,
      colors,
      cards,
      limit,
    });

    return NextResponse.json(
      {
        data: suggestions,
        meta: {
          deckId,
          deckName,
          format,
          colors: colors ? Array.from(colors) : null,
          count: suggestions.length,
        },
      },
      { status: 200 },
    );
  } catch (unknownError) {
    console.error("Autofill suggestion failed", unknownError);
    return NextResponse.json({ error: "Unable to compute autofill suggestions." }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-static";
export const revalidate = 0;






