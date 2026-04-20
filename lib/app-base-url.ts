function normalizeBase(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export function appBaseUrl(): string {
  const appUrl = process.env.APP_URL?.trim() || process.env.SITE_URL?.trim();
  if (appUrl) {
    return normalizeBase(appUrl);
  }
  const nextPublic = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (nextPublic) {
    return normalizeBase(nextPublic);
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    return `https://${host}`;
  }
  return "http://localhost:3000";
}
