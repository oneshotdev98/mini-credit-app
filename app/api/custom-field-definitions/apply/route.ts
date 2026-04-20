import {
  listCustomFieldDefinitions,
  upsertDefinitionsFromUnmapped,
} from "@/lib/custom-field-definitions";
import { NextRequest, NextResponse } from "next/server";

/**
 * Register only user-selected extra fields (from upload) and return merged
 * definitions + values for the form. Empty selections = no DB writes.
 */
export async function POST(request: NextRequest) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const body = json as { selections?: unknown };
  const raw = body.selections;
  const selections = Array.isArray(raw)
    ? raw.filter(
        (x): x is { label: string; value: string | null | undefined } =>
          !!x &&
          typeof x === "object" &&
          typeof (x as { label?: unknown }).label === "string"
      )
    : [];

  try {
    if (selections.length === 0) {
      const definitions = await listCustomFieldDefinitions();
      return NextResponse.json({
        definitions,
        values: {} as Record<string, string>,
      });
    }

    const { definitions, values } =
      await upsertDefinitionsFromUnmapped(selections);
    return NextResponse.json({ definitions, values });
  } catch (e) {
    console.error("custom-field-definitions apply:", e);
    return NextResponse.json(
      { error: "Failed to save selected fields." },
      { status: 500 }
    );
  }
}
