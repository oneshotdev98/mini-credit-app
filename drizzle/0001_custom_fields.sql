CREATE TABLE "application_custom_field_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "application_custom_field_definitions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "credit_applications" ADD COLUMN "custom_field_values" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX "application_custom_field_definitions_created_at_idx" ON "application_custom_field_definitions" USING btree ("created_at");