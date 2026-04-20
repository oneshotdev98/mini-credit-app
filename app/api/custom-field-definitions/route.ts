import { listCustomFieldDefinitions } from "@/lib/custom-field-definitions";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const definitions = await listCustomFieldDefinitions();
    return NextResponse.json({ definitions });
  } catch (e) {
    console.error("custom-field-definitions GET:", e);
    return NextResponse.json(
      { error: "Failed to load custom field definitions." },
      { status: 500 }
    );
  }
}
