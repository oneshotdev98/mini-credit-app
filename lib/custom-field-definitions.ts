import { db } from "@/db";
import { applicationCustomFieldDefinitions } from "@/db/schema";
import { labelToSlug } from "@/lib/custom-fields";
import { asc, sql } from "drizzle-orm";

export type CustomFieldDefinition = {
  slug: string;
  label: string;
};

export async function listCustomFieldDefinitions(): Promise<
  CustomFieldDefinition[]
> {
  const rows = await db
    .select({
      slug: applicationCustomFieldDefinitions.slug,
      label: applicationCustomFieldDefinitions.label,
    })
    .from(applicationCustomFieldDefinitions)
    .orderBy(asc(applicationCustomFieldDefinitions.label));
  return rows;
}

export async function upsertDefinitionsFromUnmapped(
  items: Array<{ label: string; value: string | null | undefined }>
): Promise<{
  definitions: CustomFieldDefinition[];
  values: Record<string, string>;
}> {
  const slugToLabel = new Map<string, string>();
  const values: Record<string, string> = {};

  for (const item of items) {
    const label = item.label?.trim();
    if (!label) continue;
    const slug = labelToSlug(label);
    if (!slugToLabel.has(slug)) slugToLabel.set(slug, label);
    const raw = item.value;
    const t = typeof raw === "string" ? raw.trim() : "";
    if (t) values[slug] = t;
  }

  for (const [slug, label] of slugToLabel) {
    await db
      .insert(applicationCustomFieldDefinitions)
      .values({ slug, label })
      .onConflictDoUpdate({
        target: applicationCustomFieldDefinitions.slug,
        set: { label: sql`excluded.label` },
      });
  }

  const definitions = await listCustomFieldDefinitions();
  return { definitions, values };
}
