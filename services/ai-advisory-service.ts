import { db } from "@/db";
import { creditApplications } from "@/db/schema";
import { listCustomFieldDefinitions } from "@/lib/custom-field-definitions";
import { formatCreditTerm, formatCurrency, formatRevenueBand } from "@/lib/utils";
import { eq } from "drizzle-orm";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: string };
type Result<T> = Ok<T> | Err;

function parseModelJson(content: string): Record<string, unknown> {
  let s = content.trim();
  const fence = /^```(?:json)?\s*\r?\n?([\s\S]*?)\r?\n?```$/im;
  const m = s.match(fence);
  if (m) s = m[1].trim();
  const parsed = JSON.parse(s) as unknown;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Model returned non-object JSON");
  }
  return parsed as Record<string, unknown>;
}

function toStr(v: unknown): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t.length ? t : null;
}

const ADVISORY_SYSTEM = `You are a cautious credit underwriting assistant helping a vendor review a B2B credit application.
The vendor makes the final decision. Your output is advisory only and must not read like a binding approval.

Return ONLY a JSON object (no markdown fences) with:
{
  "stance": "approve" | "reject" | "adjust_terms",
  "headline": string (one short sentence, e.g. "Lean toward approval with standard monitoring"),
  "bullets": string[] (2–5 short evidence-based bullets referencing the application facts),
  "adjustmentNote": string | null (if stance is adjust_terms, briefly suggest amount/term direction; otherwise null)
}

Rules:
- Prefer "adjust_terms" when requested exposure looks high relative to stated scale or references look thin.
- Prefer "reject" only when there are clear red flags (e.g. contradictory amounts, missing critical trade reference data combined with very high ask).
- Never invent facts; only use fields provided in the user message.
- Use neutral, professional language.`;

export async function serviceEnsureAiRecommendationSummary(
  applicationId: string,
  options?: { refresh?: boolean }
): Promise<
  Result<{
    summary: string | null;
    unavailableReason: "not_submitted" | "no_ai_key" | "none" | null;
  }>
> {
  const app = await db.query.creditApplications.findFirst({
    where: eq(creditApplications.id, applicationId),
    with: { tradeReferences: true },
  });

  if (!app) {
    return { ok: false, error: "Application not found." };
  }

  if (app.status !== "submitted") {
    return {
      ok: true,
      data: { summary: null, unavailableReason: "not_submitted" },
    };
  }

  if (app.aiRecommendationSummary && !options?.refresh) {
    return {
      ok: true,
      data: { summary: app.aiRecommendationSummary, unavailableReason: null },
    };
  }

  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: true,
      data: {
        summary: app.aiRecommendationSummary,
        unavailableReason: app.aiRecommendationSummary ? null : "no_ai_key",
      },
    };
  }

  const defs = await listCustomFieldDefinitions();
  const labelBySlug = new Map(defs.map((d) => [d.slug, d.label]));

  const refs = app.tradeReferences.sort((a, b) => a.slot - b.slot);
  const refLines = refs.map((r) => {
    const parts = [
      `slot ${r.slot}`,
      r.businessName ? `business=${r.businessName}` : null,
      r.contactEmail ? `email=${r.contactEmail}` : null,
      r.engagementStart && r.engagementEnd
        ? `engagement=${r.engagementStart}..${r.engagementEnd}`
        : null,
    ].filter(Boolean);
    return parts.join(", ");
  });

  const customLines = Object.entries(app.customFieldValues ?? {})
    .filter(([, v]) => typeof v === "string" && v.trim().length > 0)
    .map(
      ([slug, v]) =>
        `${labelBySlug.get(slug) ?? slug}=${String(v).trim()}`
    );

  const userPayload = [
    `companyName=${app.companyName ?? ""}`,
    `dba=${app.dba ?? ""}`,
    `country=${app.countryOfIncorporation ?? ""}`,
    `website=${app.websiteUrl ?? ""}`,
    `creditAmountRequested=${app.creditAmountRequested ?? ""}`,
    `creditTermRequested=${app.creditTermRequested ?? ""} (${formatCreditTerm(app.creditTermRequested)})`,
    `revenueBand=${app.revenueBand ?? ""} (${formatRevenueBand(app.revenueBand)})`,
    `billingContact=${app.billingContactName ?? ""} <${app.billingContactEmail ?? ""}>`,
    `tradeReferences:\n- ${refLines.join("\n- ")}`,
    customLines.length
      ? `additionalFields:\n- ${customLines.join("\n- ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const model = process.env.GROQ_MODEL?.trim() || "llama-3.1-8b-instant";

  let res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 1024,
      messages: [
        { role: "system", content: ADVISORY_SYSTEM },
        {
          role: "user",
          content: `Application facts (submitted):\n${userPayload}\n\nRequested amount (formatted): ${formatCurrency(app.creditAmountRequested)}`,
        },
      ],
      response_format: { type: "json_object" as const },
    }),
  });

  if (!res.ok && res.status === 400) {
    res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 1024,
        messages: [
          { role: "system", content: ADVISORY_SYSTEM },
          {
            role: "user",
            content: `Application facts (submitted):\n${userPayload}`,
          },
        ],
      }),
    });
  }

  if (!res.ok) {
    console.error("Groq advisory error:", res.status, await res.text());
    return {
      ok: true,
      data: { summary: null, unavailableReason: "none" },
    };
  }

  const body = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = body.choices?.[0]?.message?.content ?? "";
  if (!content.trim()) {
    return {
      ok: true,
      data: { summary: null, unavailableReason: "none" },
    };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = parseModelJson(content);
  } catch (e) {
    console.error("Advisory JSON parse error:", e, content.slice(0, 400));
    return {
      ok: true,
      data: { summary: null, unavailableReason: "none" },
    };
  }

  const stance = toStr(parsed.stance)?.toLowerCase() ?? "";
  const stanceLabel =
    stance === "approve"
      ? "Approve"
      : stance === "reject"
        ? "Reject"
        : stance === "adjust_terms"
          ? "Adjust terms"
          : "Review";

  const headline = toStr(parsed.headline) ?? "Advisory review";
  const bulletsRaw = parsed.bullets;
  const bullets = Array.isArray(bulletsRaw)
    ? bulletsRaw
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .slice(0, 6)
    : [];
  const adjustmentNote = toStr(parsed.adjustmentNote);

  const lines = [
    `Advisory recommendation: ${stanceLabel}`,
    "",
    headline,
    "",
    ...bullets.map((b) => `• ${b}`),
  ];
  if (adjustmentNote) {
    lines.push("", `Possible adjustment: ${adjustmentNote}`);
  }
  lines.push(
    "",
    "This text is generated by AI for discussion only. The vendor decides the outcome."
  );

  const summary = lines.join("\n");

  try {
    await db
      .update(creditApplications)
      .set({
        aiRecommendationSummary: summary,
        updatedAt: new Date(),
      })
      .where(eq(creditApplications.id, applicationId));
  } catch (e) {
    console.error("Persist AI summary error:", e);
    return { ok: false, error: "Failed to save advisory summary." };
  }

  return {
    ok: true,
    data: { summary, unavailableReason: null },
  };
}
