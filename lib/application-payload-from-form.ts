import type {
  ApplicationBody,
  VendorDraftApplicationBody,
} from "@/lib/schemas/application";

/** Use snapshot text as placeholder hint; otherwise show a generic example. */
export function suggestedPlaceholder(
  suggested: string | null | undefined,
  example: string
): string {
  const s = suggested?.trim();
  return s && s.length > 0 ? s : example;
}

/** Server / upload / Apollo snapshot merged when the user leaves a field empty (placeholder UX). */
export type ApplicationFormSnapshot = {
  companyName?: string | null;
  dba?: string | null;
  countryOfIncorporation?: string | null;
  websiteUrl?: string | null;
  creditAmountRequested?: string | null;
  creditTermRequested?: string | null;
  revenueBand?: string | null;
  billingContactName?: string | null;
  billingContactEmail?: string | null;
  tradeRef1?: {
    businessName?: string | null;
    engagementStart?: string | null;
    engagementEnd?: string | null;
    contactName?: string | null;
    contactEmail?: string | null;
    contactPosition?: string | null;
  };
  tradeRef2?: {
    businessName?: string | null;
    engagementStart?: string | null;
    engagementEnd?: string | null;
    contactName?: string | null;
    contactEmail?: string | null;
    contactPosition?: string | null;
  };
  customFieldValues?: Record<string, string>;
};

function field(fd: FormData, key: string): string | undefined {
  const v = fd.get(key);
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t === "" ? undefined : t;
}

/** Prefer non-empty form value; otherwise snapshot from draft / prefill. */
function fieldOrSnapshot(
  fd: FormData,
  key: string,
  snapshot: string | null | undefined
): string | undefined {
  const fromForm = field(fd, key);
  if (fromForm !== undefined) return fromForm;
  if (snapshot != null && String(snapshot).trim() !== "") {
    return String(snapshot).trim();
  }
  return undefined;
}

function fieldOrSnapshotDate(
  fd: FormData,
  key: string,
  snapshot: string | null | undefined
): string | undefined {
  return fieldOrSnapshot(fd, key, snapshot);
}

/** Reads `customField__{slug}` with snapshot fallback for empty fields. */
export function customFieldValuesFromFormData(
  fd: FormData,
  slugs: string[],
  snapshot?: Record<string, string> | null
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const slug of slugs) {
    const v = fd.get(`customField__${slug}`);
    const typed = typeof v === "string" ? v.trim() : "";
    if (typed) {
      out[slug] = typed;
    } else if (snapshot?.[slug]?.trim()) {
      out[slug] = snapshot[slug]!.trim();
    } else {
      out[slug] = "";
    }
  }
  return out;
}

function tradeRefFromForm(
  fd: FormData,
  slot: 1 | 2,
  snapshot?: ApplicationFormSnapshot | null
) {
  const prefix = `tradeRef${slot}_`;
  const snap = slot === 1 ? snapshot?.tradeRef1 : snapshot?.tradeRef2;
  const fromForm = fd.get(`${prefix}businessName`);
  const businessName =
    typeof fromForm === "string" && fromForm.trim()
      ? fromForm.trim()
      : snap?.businessName?.trim() ?? "";
  if (!businessName) return undefined;
  return {
    businessName,
    engagementStart:
      fieldOrSnapshotDate(
        fd,
        `${prefix}engagementStart`,
        snap?.engagementStart
      ) ?? null,
    engagementEnd:
      fieldOrSnapshotDate(
        fd,
        `${prefix}engagementEnd`,
        snap?.engagementEnd
      ) ?? null,
    contactName:
      fieldOrSnapshot(fd, `${prefix}contactName`, snap?.contactName) ?? null,
    contactEmail:
      fieldOrSnapshot(fd, `${prefix}contactEmail`, snap?.contactEmail) ?? null,
    contactPosition:
      fieldOrSnapshot(fd, `${prefix}contactPosition`, snap?.contactPosition) ??
      null,
  };
}

/** Vendor draft create/update — empty company name allowed (recipient completes). */
export function vendorDraftBodyFromFormData(
  fd: FormData,
  customFieldSlugs: string[] = [],
  snapshot?: ApplicationFormSnapshot | null
): VendorDraftApplicationBody {
  const companyName = fieldOrSnapshot(fd, "companyName", snapshot?.companyName);
  return {
    companyName: companyName ?? null,
    dba: fieldOrSnapshot(fd, "dba", snapshot?.dba) ?? null,
    countryOfIncorporation:
      fieldOrSnapshot(fd, "countryOfIncorporation", snapshot?.countryOfIncorporation) ??
      null,
    websiteUrl: fieldOrSnapshot(fd, "websiteUrl", snapshot?.websiteUrl) ?? null,
    creditAmountRequested:
      fieldOrSnapshot(fd, "creditAmountRequested", snapshot?.creditAmountRequested) ??
      null,
    creditTermRequested:
      (fieldOrSnapshot(
        fd,
        "creditTermRequested",
        snapshot?.creditTermRequested
      ) as VendorDraftApplicationBody["creditTermRequested"]) ?? null,
    revenueBand:
      (fieldOrSnapshot(
        fd,
        "revenueBand",
        snapshot?.revenueBand
      ) as VendorDraftApplicationBody["revenueBand"]) ?? null,
    billingContactName:
      fieldOrSnapshot(fd, "billingContactName", snapshot?.billingContactName) ??
      null,
    billingContactEmail:
      fieldOrSnapshot(fd, "billingContactEmail", snapshot?.billingContactEmail) ??
      null,
    tradeRef1: tradeRefFromForm(fd, 1, snapshot) ?? null,
    tradeRef2: tradeRefFromForm(fd, 2, snapshot) ?? null,
    customFieldValues: customFieldValuesFromFormData(
      fd,
      customFieldSlugs,
      snapshot?.customFieldValues
    ),
  };
}

/** Recipient submit — company name required. */
export function applicationBodyFromFormData(
  fd: FormData,
  customFieldSlugs: string[] = [],
  snapshot?: ApplicationFormSnapshot | null
): ApplicationBody {
  const companyName =
    fieldOrSnapshot(fd, "companyName", snapshot?.companyName) ?? "";
  return {
    companyName,
    dba: fieldOrSnapshot(fd, "dba", snapshot?.dba) ?? null,
    countryOfIncorporation:
      fieldOrSnapshot(fd, "countryOfIncorporation", snapshot?.countryOfIncorporation) ??
      null,
    websiteUrl: fieldOrSnapshot(fd, "websiteUrl", snapshot?.websiteUrl) ?? null,
    creditAmountRequested:
      fieldOrSnapshot(fd, "creditAmountRequested", snapshot?.creditAmountRequested) ??
      null,
    creditTermRequested:
      (fieldOrSnapshot(
        fd,
        "creditTermRequested",
        snapshot?.creditTermRequested
      ) as ApplicationBody["creditTermRequested"]) ?? null,
    revenueBand:
      (fieldOrSnapshot(
        fd,
        "revenueBand",
        snapshot?.revenueBand
      ) as ApplicationBody["revenueBand"]) ?? null,
    billingContactName:
      fieldOrSnapshot(fd, "billingContactName", snapshot?.billingContactName) ??
      null,
    billingContactEmail:
      fieldOrSnapshot(fd, "billingContactEmail", snapshot?.billingContactEmail) ??
      null,
    tradeRef1: tradeRefFromForm(fd, 1, snapshot) ?? null,
    tradeRef2: tradeRefFromForm(fd, 2, snapshot) ?? null,
    customFieldValues: customFieldValuesFromFormData(
      fd,
      customFieldSlugs,
      snapshot?.customFieldValues
    ),
  };
}
