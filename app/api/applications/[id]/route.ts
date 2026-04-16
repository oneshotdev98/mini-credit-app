import { serviceUpdateApplication } from "@/services/credit-application-service";
import { zodErrorMessage } from "@/lib/api-parse";
import { vendorDraftApplicationBodySchema } from "@/lib/schemas/application";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = vendorDraftApplicationBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: zodErrorMessage(parsed.error) },
      { status: 400 }
    );
  }

  const result = await serviceUpdateApplication(id, parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  revalidatePath("/applications");
  revalidatePath(`/applications/${id}`);
  return NextResponse.json({ ok: true as const });
}
