import { serviceEnsureAiRecommendationSummary } from "@/services/ai-advisory-service";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;

  let refresh = false;
  try {
    const json = (await request.json()) as { refresh?: unknown };
    refresh = json.refresh === true;
  } catch {
    refresh = false;
  }

  const result = await serviceEnsureAiRecommendationSummary(id, { refresh });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  const { summary, unavailableReason } = result.data;
  if (summary) {
    revalidatePath("/applications");
    revalidatePath(`/applications/${id}`);
  }

  return NextResponse.json({
    summary,
    unavailableReason,
  });
}
