export function labelToSlug(label: string): string {
  const t = label.trim().toLowerCase();
  const slug = t
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
  return slug || "field";
}
