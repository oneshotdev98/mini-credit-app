import { z } from "zod";

const creditTermValues = ["net_10", "net_20", "net_30"] as const;
const revenueBandValues = [
  "1_10m",
  "10_100m",
  "100_250m",
  "250_500m",
  "other",
] as const;

export const tradeRefSlotSchema = z.object({
  businessName: z.string().min(1),
  engagementStart: z.string().optional().nullable(),
  engagementEnd: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  contactEmail: z.string().optional().nullable(),
  contactPosition: z.string().optional().nullable(),
});

export const tradeRefSlotDraftSchema = z.object({
  businessName: z.string().optional().nullable(),
  engagementStart: z.string().optional().nullable(),
  engagementEnd: z.string().optional().nullable(),
  contactName: z.string().optional().nullable(),
  contactEmail: z.string().optional().nullable(),
  contactPosition: z.string().optional().nullable(),
});

const customFieldValuesRecordSchema = z.preprocess(
  (v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : {},
  z.record(z.string(), z.string()).default({})
);

export const vendorDraftApplicationBodySchema = z
  .object({
    companyName: z
      .union([z.string(), z.null()])
      .optional()
      .transform((v) =>
        typeof v === "string" && v.trim() ? v.trim() : null
      ),
    dba: z.string().optional().nullable(),
    countryOfIncorporation: z.string().optional().nullable(),
    websiteUrl: z.string().optional().nullable(),
    creditAmountRequested: z.string().optional().nullable(),
    creditTermRequested: z.preprocess(
      (v) =>
        typeof v === "string" && v.trim() !== "" ? v.trim() : undefined,
      z.enum(creditTermValues, {
        message: "Select a credit term (Net 10 / 20 / 30).",
      })
    ),
    revenueBand: z.enum(revenueBandValues).optional().nullable(),
    billingContactName: z.string().optional().nullable(),
    billingContactEmail: z.string().optional().nullable(),
    tradeRef1: tradeRefSlotDraftSchema.optional().nullable(),
    tradeRef2: tradeRefSlotDraftSchema.optional().nullable(),
    customFieldValues: customFieldValuesRecordSchema,
  })
  .superRefine((data, ctx) => {
    const slots = [
      { slot: 1 as const, key: "tradeRef1" as const, ref: data.tradeRef1 },
      { slot: 2 as const, key: "tradeRef2" as const, ref: data.tradeRef2 },
    ];
    for (const { slot, key, ref } of slots) {
      if (!ref?.businessName?.trim()) continue;
      if (!engagementDatesPaired(ref)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Trade reference ${slot}: enter both engagement start and end, or leave both blank.`,
          path: [key, "engagementEnd"],
        });
        continue;
      }
      if (!engagementEndOnOrAfterStart(ref)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Trade reference ${slot}: engagement end must be on or after engagement start.`,
          path: [key, "engagementEnd"],
        });
      }
    }
  });

export type VendorDraftApplicationBody = z.infer<
  typeof vendorDraftApplicationBodySchema
>;

export const applicationBodySchema = z.object({
  companyName: z.string().min(1, "Company name is required."),
  dba: z.string().optional().nullable(),
  countryOfIncorporation: z.string().optional().nullable(),
  websiteUrl: z.string().optional().nullable(),
  creditAmountRequested: z.string().optional().nullable(),
  creditTermRequested: z.enum(creditTermValues).optional().nullable(),
  revenueBand: z.enum(revenueBandValues).optional().nullable(),
  billingContactName: z.string().optional().nullable(),
  billingContactEmail: z.string().optional().nullable(),
  tradeRef1: tradeRefSlotSchema.optional().nullable(),
  tradeRef2: tradeRefSlotSchema.optional().nullable(),
  customFieldValues: customFieldValuesRecordSchema,
});

export type ApplicationBody = z.infer<typeof applicationBodySchema>;

function reasonableUrl(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  try {
    new URL(t.includes("://") ? t : `https://${t}`);
    return true;
  } catch {
    return false;
  }
}

function engagementDatesPaired(ref: {
  engagementStart?: string | null;
  engagementEnd?: string | null;
}): boolean {
  const s = ref.engagementStart?.trim();
  const e = ref.engagementEnd?.trim();
  if (!s && !e) return true;
  return Boolean(s && e);
}

function engagementEndOnOrAfterStart(ref: {
  engagementStart?: string | null;
  engagementEnd?: string | null;
}): boolean {
  const s = ref.engagementStart?.trim();
  const e = ref.engagementEnd?.trim();
  if (!s || !e) return true;
  const ds = Date.parse(s);
  const de = Date.parse(e);
  if (Number.isNaN(ds) || Number.isNaN(de)) return true;
  return de >= ds;
}

function strOrEmpty(v: unknown): string {
  if (v == null) return "";
  return typeof v === "string" ? v : String(v);
}

const emptyTradeRef = (): z.infer<typeof tradeRefSlotSchema> => ({
  businessName: "",
  engagementStart: null,
  engagementEnd: null,
  contactName: null,
  contactEmail: null,
  contactPosition: null,
});

const recipientSubmitBodyFieldsSchema = z.object({
  companyName: z.preprocess(
    strOrEmpty,
    z.string().min(1, "Company name is required.")
  ),
  dba: z.string().optional().nullable(),
  countryOfIncorporation: z.preprocess(
    strOrEmpty,
    z.string().min(1, "Country of incorporation is required.")
  ),
  websiteUrl: z.preprocess(
    strOrEmpty,
    z
      .string()
      .min(1, "Website URL is required.")
      .refine((s) => reasonableUrl(s), "Enter a valid website URL.")
  ),
  creditAmountRequested: z.preprocess(
    strOrEmpty,
    z.string().min(1, "Credit amount requested is required.")
  ),
  creditTermRequested: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined),
    z.enum(creditTermValues, {
      message: "Select a credit term (Net 10 / 20 / 30).",
    })
  ),
  revenueBand: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined),
    z.enum(revenueBandValues, {
      message: "Select a business revenue band.",
    })
  ),
  billingContactName: z.preprocess(
    strOrEmpty,
    z.string().min(1, "Billing contact name is required.")
  ),
  billingContactEmail: z.preprocess(
    strOrEmpty,
    z
      .string()
      .min(1, "Billing contact email is required.")
      .email("Enter a valid billing contact email.")
  ),
  tradeRef1: z.preprocess(
    (v) => (v == null ? emptyTradeRef() : v),
    tradeRefSlotSchema
  ),
  tradeRef2: z.preprocess(
    (v) => (v == null ? emptyTradeRef() : v),
    tradeRefSlotSchema
  ),
  customFieldValues: customFieldValuesRecordSchema,
});

/** Stricter rules when the applicant submits the apply link (client + API). */
export function buildRecipientSubmitBodySchema(requiredCustomSlugs: string[]) {
  return recipientSubmitBodyFieldsSchema.superRefine((data, ctx) => {
    if (!engagementDatesPaired(data.tradeRef1)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Trade reference 1: enter both engagement start and end, or leave both blank.",
        path: ["tradeRef1", "engagementEnd"],
      });
    }
    if (!engagementDatesPaired(data.tradeRef2)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Trade reference 2: enter both engagement start and end, or leave both blank.",
        path: ["tradeRef2", "engagementEnd"],
      });
    }
    if (
      engagementDatesPaired(data.tradeRef1) &&
      !engagementEndOnOrAfterStart(data.tradeRef1)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Trade reference 1: engagement end must be on or after engagement start.",
        path: ["tradeRef1", "engagementEnd"],
      });
    }
    if (
      engagementDatesPaired(data.tradeRef2) &&
      !engagementEndOnOrAfterStart(data.tradeRef2)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Trade reference 2: engagement end must be on or after engagement start.",
        path: ["tradeRef2", "engagementEnd"],
      });
    }
    for (const slug of requiredCustomSlugs) {
      const val = data.customFieldValues[slug];
      if (typeof val !== "string" || !val.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "This field is required.",
          path: ["customFieldValues", slug],
        });
      }
    }
  });
}

export const recipientSubmitBodySchema = buildRecipientSubmitBodySchema([]);

export type RecipientSubmitBody = z.infer<typeof recipientSubmitBodyFieldsSchema>;

export const sendBodySchema = z.object({
  recipientName: z.string().min(1, "Recipient name is required."),
  recipientEmail: z
    .string()
    .min(1)
    .email("A valid recipient email is required."),
});

export const decisionBodySchema = z.object({
  decision: z.enum(["approved", "approved_with_adjustments", "rejected"]),
  revisedAmount: z.string().optional().nullable(),
  revisedTerm: z.enum(creditTermValues).optional().nullable(),
});

export type SendBody = z.infer<typeof sendBodySchema>;
export type DecisionBody = z.infer<typeof decisionBodySchema>;
