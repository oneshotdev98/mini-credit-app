import type {
  ApplicationBody,
  VendorDraftApplicationBody,
} from "@/lib/schemas/application";

function field(fd: FormData, key: string): string | undefined {
  const v = fd.get(key);
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t === "" ? undefined : t;
}

function tradeRefFromForm(fd: FormData, slot: 1 | 2) {
  const prefix = `tradeRef${slot}_`;
  const businessName = fd.get(`${prefix}businessName`);
  if (typeof businessName !== "string" || !businessName.trim()) {
    return undefined;
  }
  return {
    businessName: businessName.trim(),
    engagementStart: field(fd, `${prefix}engagementStart`) ?? null,
    engagementEnd: field(fd, `${prefix}engagementEnd`) ?? null,
    contactName: field(fd, `${prefix}contactName`) ?? null,
    contactEmail: field(fd, `${prefix}contactEmail`) ?? null,
    contactPosition: field(fd, `${prefix}contactPosition`) ?? null,
  };
}

/** Vendor draft create/update — empty company name allowed (recipient completes). */
export function vendorDraftBodyFromFormData(
  fd: FormData
): VendorDraftApplicationBody {
  const companyName = field(fd, "companyName");
  return {
    companyName: companyName ?? null,
    dba: field(fd, "dba") ?? null,
    countryOfIncorporation: field(fd, "countryOfIncorporation") ?? null,
    websiteUrl: field(fd, "websiteUrl") ?? null,
    creditAmountRequested: field(fd, "creditAmountRequested") ?? null,
    creditTermRequested:
      (field(fd, "creditTermRequested") as VendorDraftApplicationBody["creditTermRequested"]) ??
      null,
    revenueBand:
      (field(fd, "revenueBand") as VendorDraftApplicationBody["revenueBand"]) ??
      null,
    billingContactName: field(fd, "billingContactName") ?? null,
    billingContactEmail: field(fd, "billingContactEmail") ?? null,
    tradeRef1: tradeRefFromForm(fd, 1) ?? null,
    tradeRef2: tradeRefFromForm(fd, 2) ?? null,
  };
}

/** Recipient submit — company name required. */
export function applicationBodyFromFormData(fd: FormData): ApplicationBody {
  const companyName = field(fd, "companyName") ?? "";
  return {
    companyName,
    dba: field(fd, "dba") ?? null,
    countryOfIncorporation: field(fd, "countryOfIncorporation") ?? null,
    websiteUrl: field(fd, "websiteUrl") ?? null,
    creditAmountRequested: field(fd, "creditAmountRequested") ?? null,
    creditTermRequested:
      (field(fd, "creditTermRequested") as ApplicationBody["creditTermRequested"]) ??
      null,
    revenueBand:
      (field(fd, "revenueBand") as ApplicationBody["revenueBand"]) ?? null,
    billingContactName: field(fd, "billingContactName") ?? null,
    billingContactEmail: field(fd, "billingContactEmail") ?? null,
    tradeRef1: tradeRefFromForm(fd, 1) ?? null,
    tradeRef2: tradeRefFromForm(fd, 2) ?? null,
  };
}
