import { serviceSubmitApplication } from "@/services/credit-application-service";
import { zodErrorMessage } from "@/lib/api-parse";
import { buildRecipientSubmitBodySchema } from "@/lib/schemas/application";
import { listCustomFieldDefinitions } from "@/lib/custom-field-definitions";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ token: string }> }
) {
  const { token } = await props.params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const defs = await listCustomFieldDefinitions();
  const requiredCustomSlugs = defs.map((d) => d.slug);
  const parsed = buildRecipientSubmitBodySchema(requiredCustomSlugs).safeParse(
    json
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: zodErrorMessage(parsed.error) },
      { status: 400 }
    );
  }

  const result = await serviceSubmitApplication(token, parsed.data);
  if (!result.ok) {
    const status =
      result.error === "Invalid or expired application link." ? 404 : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  revalidatePath("/applications");
  revalidatePath(`/applications/${result.data.applicationId}`);
  return NextResponse.json({ ok: true as const, success: "submitted" as const });
}
