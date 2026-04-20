import { COUNTRIES } from "@/lib/utils";

export type ApolloPrefillFields = {
  companyName: string | null;
  dba: string | null;
  countryOfIncorporation: string | null;
  websiteUrl: string | null;
  revenueBand:
    | "1_10m"
    | "10_100m"
    | "100_250m"
    | "250_500m"
    | "other"
    | null;
};

const COUNTRY_ALIASES: Record<string, string> = {
  US: "United States",
  USA: "United States",
  "U.S.": "United States",
  "U.S.A.": "United States",
  GB: "United Kingdom",
  UK: "United Kingdom",
  DE: "Germany",
  FR: "France",
  AU: "Australia",
  JP: "Japan",
  SG: "Singapore",
  NL: "Netherlands",
  CH: "Switzerland",
  SE: "Sweden",
  IE: "Ireland",
  IN: "India",
  BR: "Brazil",
  MX: "Mexico",
  KR: "South Korea",
  ES: "Spain",
  IT: "Italy",
  IL: "Israel",
};

function normalizeWebsiteUrl(
  websiteUrl: unknown,
  primaryDomain: unknown
): string | null {
  const raw =
    typeof websiteUrl === "string" && websiteUrl.trim()
      ? websiteUrl.trim()
      : typeof primaryDomain === "string" && primaryDomain.trim()
        ? primaryDomain.trim()
        : null;
  if (!raw) return null;
  let u = raw.replace(/^\/\//, "");
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    const parsed = new URL(u);
    if (!parsed.hostname) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function mapCountryToSelectList(countryRaw: unknown): string | null {
  if (countryRaw == null) return null;
  const s = String(countryRaw).trim();
  if (!s) return null;
  if ((COUNTRIES as readonly string[]).includes(s)) return s;
  const upper = s.toUpperCase();
  if (COUNTRY_ALIASES[upper]) return COUNTRY_ALIASES[upper];
  const lower = s.toLowerCase();
  const hit = (COUNTRIES as readonly string[]).find(
    (c) => c.toLowerCase() === lower
  );
  if (hit) return hit;
  return "Other";
}

/** Apollo sometimes returns country as a string, ISO code, or nested object. */
function countryStringFromUnknown(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    const t = raw.trim();
    return t.length ? t : null;
  }
  if (typeof raw === "object" && !Array.isArray(raw) && raw !== null) {
    const o = raw as Record<string, unknown>;
    const name = o.name ?? o.label ?? o.country_name;
    if (typeof name === "string" && name.trim()) return name.trim();
  }
  return null;
}

function revenueBandFromAnnualUsd(n: number): ApolloPrefillFields["revenueBand"] {
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n < 10_000_000) return "1_10m";
  if (n < 100_000_000) return "10_100m";
  if (n < 250_000_000) return "100_250m";
  if (n < 500_000_000) return "250_500m";
  return "other";
}

function revenueBandFromEmployees(n: number): ApolloPrefillFields["revenueBand"] {
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n < 50) return "1_10m";
  if (n < 500) return "10_100m";
  if (n < 5000) return "100_250m";
  if (n < 25_000) return "250_500m";
  return "other";
}

function readAnnualRevenueUsd(org: Record<string, unknown>): number | null {
  const candidates = [
    org.annual_revenue,
    org.estimated_annual_revenue,
    org.organization_annual_revenue,
    org.organization_revenue,
  ];
  for (const c of candidates) {
    const n = typeof c === "number" ? c : typeof c === "string" ? Number(c) : NaN;
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function readEmployeeCount(org: Record<string, unknown>): number | null {
  const raw =
    org.estimated_num_employees ??
    org.organization_num_employees ??
    org.employee_count;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const n = Number(raw.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function readCountry(org: Record<string, unknown>): string | null {
  const candidates: unknown[] = [
    org.country,
    org.primary_country,
    org.hq_country,
    org.organization_country,
    org.organization_hq_country,
    org.organization_country_name,
    org.sanitized_country,
    org.account_country,
    org.organization_country_code,
    org.country_code,
    org.primary_country_code,
    org.hq_country_code,
  ];

  for (const raw of candidates) {
    const s = countryStringFromUnknown(raw);
    if (!s) continue;
    const mapped = mapCountryToSelectList(s);
    if (mapped) return mapped;
  }

  return null;
}

export function mapApolloOrganization(
  org: Record<string, unknown>
): ApolloPrefillFields {
  const name = typeof org.name === "string" ? org.name.trim() || null : null;
  const websiteUrl = normalizeWebsiteUrl(org.website_url, org.primary_domain);
  const countryOfIncorporation = readCountry(org);
  const revenueUsd = readAnnualRevenueUsd(org);
  const employees = readEmployeeCount(org);
  const revenueBand =
    (revenueUsd != null ? revenueBandFromAnnualUsd(revenueUsd) : null) ??
    (employees != null ? revenueBandFromEmployees(employees) : null);

  return {
    companyName: name,
    dba: null,
    countryOfIncorporation,
    websiteUrl,
    revenueBand,
  };
}

export type ApolloSearchResult = {
  organizations: Record<string, unknown>[];
  raw: unknown;
};

export async function apolloSearchOrganizations(
  apiKey: string,
  businessName: string
): Promise<ApolloSearchResult | { error: string }> {
  const q = businessName.trim();
  if (!q) return { error: "Business name is required." };

  const res = await fetch(
    "https://api.apollo.io/api/v1/mixed_companies/search",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify({
        q_organization_name: q,
        page: 1,
        per_page: 5,
      }),
    }
  );

  const ct = res.headers.get("content-type") ?? "";
  let raw: unknown = {};
  if (ct.includes("application/json")) {
    raw = await res.json().catch(() => ({}));
  } else {
    const text = await res.text().catch(() => "");
    raw = text.trim() ? { message: text.trim() } : {};
  }

  if (!res.ok) {
    const msg =
      typeof raw === "object" &&
      raw &&
      "message" in raw &&
      typeof (raw as { message: unknown }).message === "string"
        ? (raw as { message: string }).message
        : typeof raw === "object" &&
            raw &&
            "error" in raw &&
            typeof (raw as { error: unknown }).error === "string"
          ? (raw as { error: string }).error
          : `Apollo request failed (${res.status})`;
    return { error: msg };
  }

  if (typeof raw !== "object" || !raw) {
    return { error: "Unexpected Apollo response." };
  }

  const organizations = (raw as { organizations?: unknown }).organizations;
  const list = Array.isArray(organizations)
    ? organizations.filter(
        (o): o is Record<string, unknown> =>
          !!o && typeof o === "object" && !Array.isArray(o)
      )
    : [];

  return { organizations: list, raw };
}
