export function formatCurrency(amount: string | number | null | undefined): string {
  if (!amount) return "—";
  const num = typeof amount === "string" ? parseFloat(amount.replace(/[^0-9.-]/g, "")) : amount;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function formatStatus(status: string): string {
  const map: Record<string, string> = {
    draft: "Draft",
    sent: "Sent",
    submitted: "Submitted",
    approved: "Approved",
    approved_with_adjustments: "Approved w/ Adjustments",
    rejected: "Rejected",
  };
  return map[status] || status;
}

export function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 48; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function formatCreditTerm(term: string | null | undefined): string {
  if (!term) return "—";
  const map: Record<string, string> = {
    net_10: "Net 10",
    net_20: "Net 20",
    net_30: "Net 30",
  };
  return map[term] || term;
}

export function formatRevenueBand(band: string | null | undefined): string {
  if (!band) return "—";
  const map: Record<string, string> = {
    "1_10m": "$1M – $10M",
    "10_100m": "$10M – $100M",
    "100_250m": "$100M – $250M",
    "250_500m": "$250M – $500M",
    other: "Other",
  };
  return map[band] || band;
}

export const COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Germany",
  "France",
  "Australia",
  "Japan",
  "Singapore",
  "Netherlands",
  "Switzerland",
  "Sweden",
  "Ireland",
  "India",
  "Brazil",
  "Mexico",
  "South Korea",
  "Spain",
  "Italy",
  "Israel",
  "Other",
] as const;

export const CREDIT_TERMS = [
  { value: "net_10", label: "Net 10" },
  { value: "net_20", label: "Net 20" },
  { value: "net_30", label: "Net 30" },
] as const;

export const REVENUE_BANDS = [
  { value: "1_10m", label: "$1M – $10M" },
  { value: "10_100m", label: "$10M – $100M" },
  { value: "100_250m", label: "$100M – $250M" },
  { value: "250_500m", label: "$250M – $500M" },
  { value: "other", label: "Other" },
] as const;
