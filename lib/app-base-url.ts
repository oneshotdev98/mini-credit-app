export function appBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    return `https://${host}`;
  }
  return "http://localhost:3000";
}
