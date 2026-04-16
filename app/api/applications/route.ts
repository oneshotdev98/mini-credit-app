import { serviceCreateApplication } from "@/services/credit-application-service";
import { zodErrorMessage } from "@/lib/api-parse";
import { vendorDraftApplicationBodySchema } from "@/lib/schemas/application";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
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

  const result = await serviceCreateApplication(parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  revalidatePath("/applications");
  revalidatePath(`/applications/${result.data.id}`);
  return NextResponse.json({ id: result.data.id }, { status: 201 });
}
