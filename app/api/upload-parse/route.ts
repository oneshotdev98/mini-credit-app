import { NextRequest, NextResponse } from "next/server";
import { extractPdfText } from "@/lib/extract-pdf-text";

export const runtime = "nodejs";

const CREDIT_TERMS = ["net_10", "net_20", "net_30"] as const;
const REVENUE_BANDS = [
  "1_10m",
  "10_100m",
  "100_250m",
  "250_500m",
  "other",
] as const;

type CreditTerm = (typeof CREDIT_TERMS)[number];
type RevenueBand = (typeof REVENUE_BANDS)[number];

const EXTRACTION_SYSTEM_PROMPT = `You are a data extraction assistant. Extract credit application fields from the provided document text.
Return ONLY a valid JSON object with these exact fields (use null for missing values):
{
  "companyName": string | null,
  "dba": string | null,
  "countryOfIncorporation": string | null,
  "websiteUrl": string | null,
  "creditAmountRequested": string | null,
  "creditTermRequested": "net_10" | "net_20" | "net_30" | null,
  "revenueBand": "1_10m" | "10_100m" | "100_250m" | "250_500m" | "other" | null,
  "billingContactName": string | null,
  "billingContactEmail": string | null,
  "tradeRef1": { "businessName": string | null, "contactName": string | null, "contactEmail": string | null, "contactPosition": string | null, "engagementStart": "YYYY-MM-DD" | null, "engagementEnd": "YYYY-MM-DD" | null } | null,
  "tradeRef2": { "businessName": string | null, "contactName": string | null, "contactEmail": string | null, "contactPosition": string | null, "engagementStart": "YYYY-MM-DD" | null, "engagementEnd": "YYYY-MM-DD" | null } | null,
  "droppedFields": string[]
}
For "droppedFields", list human-readable labels for document content that does not map to the fields above (e.g. "Bank reference section", "Personal guarantor name").
For creditAmountRequested, return digits only as a string (e.g. "50000") with no currency symbols or commas.
Return ONLY the JSON object, no markdown fences or explanation.`;

function toNullableString(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v !== "string") return String(v).trim() || null;
  const t = v.trim();
  return t.length ? t : null;
}

function pickEnum<T extends string>(
  v: unknown,
  allowed: readonly T[]
): T | null {
  const s = toNullableString(v);
  if (!s) return null;
  return (allowed as readonly string[]).includes(s) ? (s as T) : null;
}

function normalizeCreditTerm(v: unknown): CreditTerm | null {
  const direct = pickEnum(v, CREDIT_TERMS);
  if (direct) return direct;
  const raw = toNullableString(v)?.toLowerCase();
  if (!raw) return null;
  const compact = raw.replace(/\s+/g, "").replace(/-/g, "_");
  if (compact === "net10" || compact === "n10") return "net_10";
  if (compact === "net20" || compact === "n20") return "net_20";
  if (compact === "net30" || compact === "n30") return "net_30";
  return null;
}

function normalizeRevenueBand(v: unknown): RevenueBand | null {
  return pickEnum(v, REVENUE_BANDS);
}

function normalizeTradeRef(v: unknown) {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const slot = {
    businessName: toNullableString(o.businessName),
    engagementStart: toNullableString(o.engagementStart),
    engagementEnd: toNullableString(o.engagementEnd),
    contactName: toNullableString(o.contactName),
    contactEmail: toNullableString(o.contactEmail),
    contactPosition: toNullableString(o.contactPosition),
  };
  const hasAny = Object.values(slot).some((x) => x != null);
  return hasAny ? slot : null;
}

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

function buildResponseFromParsed(parsed: Record<string, unknown>) {
  const droppedRaw = parsed.droppedFields;
  const droppedFields = Array.isArray(droppedRaw)
    ? droppedRaw.filter((x): x is string => typeof x === "string")
    : [];

  return NextResponse.json({
    data: {
      companyName: toNullableString(parsed.companyName),
      dba: toNullableString(parsed.dba),
      countryOfIncorporation: toNullableString(parsed.countryOfIncorporation),
      websiteUrl: toNullableString(parsed.websiteUrl),
      creditAmountRequested: toNullableString(parsed.creditAmountRequested),
      creditTermRequested: normalizeCreditTerm(parsed.creditTermRequested),
      revenueBand: normalizeRevenueBand(parsed.revenueBand),
      billingContactName: toNullableString(parsed.billingContactName),
      billingContactEmail: toNullableString(parsed.billingContactEmail),
      tradeRef1: normalizeTradeRef(parsed.tradeRef1),
      tradeRef2: normalizeTradeRef(parsed.tradeRef2),
    },
    droppedFields,
    source: "ai",
  });
}

async function extractDocumentText(file: File): Promise<string> {
  const lowerName = file.name.toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());

  if (lowerName.endsWith(".pdf") || file.type === "application/pdf") {
    return extractPdfText(buf);
  }

  if (
    lowerName.endsWith(".docx") ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer: buf });
    return value.trim();
  }

  if (lowerName.endsWith(".doc")) {
    throw new Error(
      "The legacy .doc format is not supported. Save as PDF or DOCX and upload again."
    );
  }

  if (
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".csv") ||
    (file.type && file.type.startsWith("text/"))
  ) {
    return buf.toString("utf8").trim();
  }

  return buf.toString("utf8").replace(/\0/g, "").trim();
}

async function parseWithGroq(text: string, filename: string, apiKey: string) {
  const model =
    process.env.GROQ_MODEL?.trim() || "llama-3.1-8b-instant";
  const userContent = `Parse this credit application document (filename: ${filename}):\n\n${text.slice(0, 120_000)}`;

  const baseBody = {
    model,
    temperature: 0.1,
    max_tokens: 4096,
    messages: [
      { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
  };

  let res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      ...baseBody,
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
      body: JSON.stringify(baseBody),
    });
  }

  if (!res.ok) {
    const err = await res.text();
    console.error("Groq API error:", res.status, err);
    return parseBasic(text);
  }

  const result = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = result.choices?.[0]?.message?.content ?? "";
  if (!content) {
    return parseBasic(text);
  }

  try {
    const parsed = parseModelJson(content);
    return buildResponseFromParsed(parsed);
  } catch (e) {
    console.error("Groq JSON parse error:", e, content.slice(0, 500));
    return parseBasic(text);
  }
}

function parseBasic(text: string) {
  const data: Record<string, string | null> = {
    companyName: null,
    dba: null,
    countryOfIncorporation: null,
    websiteUrl: null,
    creditAmountRequested: null,
    creditTermRequested: null,
    revenueBand: null,
    billingContactName: null,
    billingContactEmail: null,
  };

  const companyMatch = text.match(
    /(?:company\s*name|business\s*name|applicant)\s*[:\-]?\s*(.+)/i
  );
  if (companyMatch) data.companyName = companyMatch[1].trim();

  const dbaMatch = text.match(/(?:dba|doing\s*business\s*as)\s*[:\-]?\s*(.+)/i);
  if (dbaMatch) data.dba = dbaMatch[1].trim();

  const urlMatch = text.match(
    /(?:website|url|web)\s*[:\-]?\s*(https?:\/\/[^\s]+)/i
  );
  if (urlMatch) data.websiteUrl = urlMatch[1].trim();

  const emailMatch = text.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  if (emailMatch) data.billingContactEmail = emailMatch[0];

  const amountMatch = text.match(
    /(?:credit\s*(?:amount|limit|requested)|amount)\s*[:\-]?\s*\$?([\d,]+)/i
  );
  if (amountMatch)
    data.creditAmountRequested = amountMatch[1].replace(/,/g, "");

  const countryMatch = text.match(
    /(?:country|incorporation|incorporated)\s*[:\-]?\s*(.+)/i
  );
  if (countryMatch) data.countryOfIncorporation = countryMatch[1].trim();

  return NextResponse.json({
    data,
    droppedFields: [] as string[],
    source: "basic",
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    let text: string;
    try {
      text = await extractDocumentText(file);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not read file";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (!text) {
      return NextResponse.json(
        {
          error:
            "No readable text was found in this file. Scanned or image-only PDFs need a text export or OCR before upload.",
        },
        { status: 422 }
      );
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      return await parseWithGroq(text, file.name, groqKey);
    }

    return parseBasic(text);
  } catch (e: unknown) {
    console.error("Upload parse error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to parse file: " + message },
      { status: 500 }
    );
  }
}
