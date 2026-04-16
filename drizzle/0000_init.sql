CREATE TYPE "public"."application_status" AS ENUM('draft', 'sent', 'submitted', 'approved', 'approved_with_adjustments', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."credit_term" AS ENUM('net_10', 'net_20', 'net_30');--> statement-breakpoint
CREATE TYPE "public"."revenue_band" AS ENUM('1_10m', '10_100m', '100_250m', '250_500m', 'other');--> statement-breakpoint
CREATE TABLE "credit_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "application_status" DEFAULT 'draft' NOT NULL,
	"company_name" text,
	"dba" text,
	"country_of_incorporation" text,
	"website_url" text,
	"billing_contact_name" text,
	"billing_contact_email" text,
	"credit_amount_requested" text,
	"credit_term_requested" "credit_term",
	"revenue_band" "revenue_band",
	"recipient_name" text,
	"recipient_email" text,
	"access_token" text,
	"sent_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"decision_revised_credit_amount" text,
	"decision_revised_credit_term" "credit_term",
	"upload_original_filename" text,
	"upload_storage_key" text,
	"upload_parse_dropped_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ai_recommendation_summary" text,
	"apollo_prefill_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"slot" smallint NOT NULL,
	"business_name" text,
	"engagement_start" date,
	"engagement_end" date,
	"contact_name" text,
	"contact_email" text,
	"contact_position" text,
	CONSTRAINT "trade_references_slot_chk" CHECK ("trade_references"."slot" in (1, 2)),
	CONSTRAINT "trade_references_engagement_dates_chk" CHECK (("trade_references"."engagement_start" is null and "trade_references"."engagement_end" is null) or ("trade_references"."engagement_start" is not null and "trade_references"."engagement_end" is not null and "trade_references"."engagement_end" >= "trade_references"."engagement_start"))
);
--> statement-breakpoint
ALTER TABLE "trade_references" ADD CONSTRAINT "trade_references_application_id_credit_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."credit_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "credit_applications_access_token_uidx" ON "credit_applications" USING btree ("access_token") WHERE "credit_applications"."access_token" is not null;--> statement-breakpoint
CREATE INDEX "credit_applications_status_idx" ON "credit_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "credit_applications_created_at_idx" ON "credit_applications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "credit_applications_recipient_email_idx" ON "credit_applications" USING btree ("recipient_email");--> statement-breakpoint
CREATE UNIQUE INDEX "trade_references_application_slot_uidx" ON "trade_references" USING btree ("application_id","slot");--> statement-breakpoint
CREATE INDEX "trade_references_application_id_idx" ON "trade_references" USING btree ("application_id");