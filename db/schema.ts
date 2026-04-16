import { relations, sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const applicationStatusEnum = pgEnum("application_status", [
  "draft",
  "sent",
  "submitted",
  "approved",
  "approved_with_adjustments",
  "rejected",
]);

export const creditTermEnum = pgEnum("credit_term", ["net_10", "net_20", "net_30"]);

export const revenueBandEnum = pgEnum("revenue_band", [
  "1_10m",
  "10_100m",
  "100_250m",
  "250_500m",
  "other",
]);

export const creditApplications = pgTable(
  "credit_applications",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    status: applicationStatusEnum("status").notNull().default("draft"),

    companyName: text("company_name"),
    dba: text("dba"),
    countryOfIncorporation: text("country_of_incorporation"),
    websiteUrl: text("website_url"),

    billingContactName: text("billing_contact_name"),
    billingContactEmail: text("billing_contact_email"),

    creditAmountRequested: text("credit_amount_requested"),
    creditTermRequested: creditTermEnum("credit_term_requested"),
    revenueBand: revenueBandEnum("revenue_band"),

    recipientName: text("recipient_name"),
    recipientEmail: text("recipient_email"),
    accessToken: text("access_token"),
    sentAt: timestamp("sent_at", { withTimezone: true }),

    submittedAt: timestamp("submitted_at", { withTimezone: true }),

    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decisionRevisedCreditAmount: text("decision_revised_credit_amount"),
    decisionRevisedCreditTerm: creditTermEnum("decision_revised_credit_term"),

    uploadOriginalFilename: text("upload_original_filename"),
    uploadStorageKey: text("upload_storage_key"),
    uploadParseDroppedFields: jsonb("upload_parse_dropped_fields")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    aiRecommendationSummary: text("ai_recommendation_summary"),
    apolloPrefillPayload: jsonb("apollo_prefill_payload").$type<Record<string, unknown>>(),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("credit_applications_access_token_uidx")
      .on(t.accessToken)
      .where(sql`${t.accessToken} is not null`),
    index("credit_applications_status_idx").on(t.status),
    index("credit_applications_created_at_idx").on(t.createdAt),
    index("credit_applications_recipient_email_idx").on(t.recipientEmail),
  ],
);

export const tradeReferences = pgTable(
  "trade_references",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => creditApplications.id, { onDelete: "cascade" }),
    slot: smallint("slot").notNull(),

    businessName: text("business_name"),
    engagementStart: date("engagement_start"),
    engagementEnd: date("engagement_end"),
    contactName: text("contact_name"),
    contactEmail: text("contact_email"),
    contactPosition: text("contact_position"),
  },
  (t) => [
    uniqueIndex("trade_references_application_slot_uidx").on(t.applicationId, t.slot),
    index("trade_references_application_id_idx").on(t.applicationId),
    check("trade_references_slot_chk", sql`${t.slot} in (1, 2)`),
    check(
      "trade_references_engagement_dates_chk",
      sql`(${t.engagementStart} is null and ${t.engagementEnd} is null) or (${t.engagementStart} is not null and ${t.engagementEnd} is not null and ${t.engagementEnd} >= ${t.engagementStart})`,
    ),
  ],
);

export const creditApplicationsRelations = relations(creditApplications, ({ many }) => ({
  tradeReferences: many(tradeReferences),
}));

export const tradeReferencesRelations = relations(tradeReferences, ({ one }) => ({
  application: one(creditApplications, {
    fields: [tradeReferences.applicationId],
    references: [creditApplications.id],
  }),
}));
