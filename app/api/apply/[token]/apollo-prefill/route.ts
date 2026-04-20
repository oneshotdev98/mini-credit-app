import { db } from "@/db";
import { creditApplications } from "@/db/schema";
import {
  apolloSearchOrganizations,
  mapApolloOrganization,
} from "@/lib/apollo-prefill";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ token: string }> }
) {
  const { token } = await props.params;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const body = json as { businessName?: unknown };
  const businessName =
    typeof body.businessName === "string" ? body.businessName.trim() : "";
  if (!businessName) {
    return NextResponse.json(
      { error: "Business name is required." },
      { status: 400 }
    );
  }

  const app = await db.query.creditApplications.findFirst({
    where: eq(creditApplications.accessToken, token),
  });

  if (!app) {
    return NextResponse.json(
      { error: "Invalid or expired application link." },
      { status: 404 }
    );
  }

  if (app.status !== "sent") {
    return NextResponse.json(
      { error: "This application is not open for updates." },
      { status: 409 }
    );
  }

  const apiKey = process.env.APOLLO_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({
      matched: false as const,
      source: "none" as const,
      data: {
        companyName: businessName,
        dba: null,
        countryOfIncorporation: null,
        websiteUrl: null,
        revenueBand: null,
      },
    });
  }

  const search = await apolloSearchOrganizations(apiKey, businessName);
  if ("error" in search) {
    return NextResponse.json(
      { error: search.error },
      { status: 502 }
    );
  }

  const first = search.organizations[0];
  if (process.env.NODE_ENV === "development") {
    if (!first) {
      console.warn(
        "[apollo-prefill] No organization in results for query:",
        businessName
      );
    }
  }
  const mapped = first
    ? mapApolloOrganization(first)
    : {
        companyName: null as string | null,
        dba: null as string | null,
        countryOfIncorporation: null as string | null,
        websiteUrl: null as string | null,
        revenueBand: null,
      };

  const resolvedCompanyName =
    typeof mapped.companyName === "string" && mapped.companyName.trim() !== ""
      ? mapped.companyName.trim()
      : businessName;

  const data = {
    companyName: resolvedCompanyName,
    dba: mapped.dba,
    countryOfIncorporation: mapped.countryOfIncorporation,
    websiteUrl: mapped.websiteUrl,
    revenueBand: mapped.revenueBand,
  };

  if (process.env.NODE_ENV === "development" && first && data.countryOfIncorporation == null) {
    console.warn(
      "[apollo-prefill] Matched org has no country after mapping — inspect topMatch in DB or keys:",
      Object.keys(first).slice(0, 48)
    );
  }

  try {
    await db
      .update(creditApplications)
      .set({
        apolloPrefillPayload: {
          searchedName: businessName,
          topMatch: first ?? null,
          pagination: (search.raw as { pagination?: unknown })?.pagination,
        },
        updatedAt: new Date(),
      })
      .where(eq(creditApplications.id, app.id));
  } catch (e) {
    console.error("Apollo prefill persist error:", e);
  }

  return NextResponse.json({
    matched: !!first,
    source: "apollo" as const,
    data,
  });
}
