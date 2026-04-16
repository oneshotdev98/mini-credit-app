import { serviceDecisionApplication } from "@/services/credit-application-service";
import { zodErrorMessage } from "@/lib/api-parse";
import { decisionBodySchema } from "@/lib/schemas/application";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
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

  const parsed = decisionBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: zodErrorMessage(parsed.error) },
      { status: 400 }
    );
  }

  const result = await serviceDecisionApplication(id, parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  revalidatePath("/applications");
  revalidatePath(`/applications/${id}`);
  return NextResponse.json({
    ok: true as const,
    message: result.data.message,
  });
}
