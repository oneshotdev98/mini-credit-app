import { db } from "@/db";
import { creditApplications, tradeReferences } from "@/db/schema";
import { eq } from "drizzle-orm";
import type {
  DecisionBody,
  RecipientSubmitBody,
  SendBody,
  VendorDraftApplicationBody,
} from "@/lib/schemas/application";
import { generateToken } from "@/lib/utils";
import {
  notifyRecipientInvite,
  notifyVendorSubmission,
} from "@/services/mailer";

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; error: string };
type Result<T> = Ok<T> | Err;

export async function serviceCreateApplication(
  body: VendorDraftApplicationBody
): Promise<Result<{ id: string }>> {
  try {
    const result = await db.transaction(async (tx) => {
      const [app] = await tx
        .insert(creditApplications)
        .values({
          companyName: body.companyName?.trim() || null,
          dba: body.dba?.trim() || null,
          countryOfIncorporation: body.countryOfIncorporation || null,
          websiteUrl: body.websiteUrl?.trim() || null,
          creditAmountRequested: body.creditAmountRequested?.trim() || null,
          creditTermRequested: body.creditTermRequested ?? null,
          revenueBand: body.revenueBand ?? null,
          billingContactName: body.billingContactName?.trim() || null,
          billingContactEmail: body.billingContactEmail?.trim() || null,
        })
        .returning();

      for (const slot of [1, 2] as const) {
        const ref = slot === 1 ? body.tradeRef1 : body.tradeRef2;
        if (!ref?.businessName?.trim()) continue;
        await tx.insert(tradeReferences).values({
          applicationId: app.id,
          slot,
          businessName: ref.businessName.trim(),
          engagementStart: ref.engagementStart || null,
          engagementEnd: ref.engagementEnd || null,
          contactName: ref.contactName?.trim() || null,
          contactEmail: ref.contactEmail?.trim() || null,
          contactPosition: ref.contactPosition?.trim() || null,
        });
      }

      return app;
    });

    return { ok: true, data: { id: result.id } };
  } catch (e) {
    console.error("Create application error:", e);
    return { ok: false, error: "Failed to create application. Please try again." };
  }
}

export async function serviceUpdateApplication(
  applicationId: string,
  body: VendorDraftApplicationBody
): Promise<Result<{ id: string }>> {
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(creditApplications)
        .set({
          companyName: body.companyName?.trim() || null,
          dba: body.dba?.trim() || null,
          countryOfIncorporation: body.countryOfIncorporation || null,
          websiteUrl: body.websiteUrl?.trim() || null,
          creditAmountRequested: body.creditAmountRequested?.trim() || null,
          creditTermRequested: body.creditTermRequested ?? null,
          revenueBand: body.revenueBand ?? null,
          billingContactName: body.billingContactName?.trim() || null,
          billingContactEmail: body.billingContactEmail?.trim() || null,
          updatedAt: new Date(),
        })
        .where(eq(creditApplications.id, applicationId));

      await tx
        .delete(tradeReferences)
        .where(eq(tradeReferences.applicationId, applicationId));

      for (const slot of [1, 2] as const) {
        const ref = slot === 1 ? body.tradeRef1 : body.tradeRef2;
        if (!ref?.businessName?.trim()) continue;
        await tx.insert(tradeReferences).values({
          applicationId,
          slot,
          businessName: ref.businessName.trim(),
          engagementStart: ref.engagementStart || null,
          engagementEnd: ref.engagementEnd || null,
          contactName: ref.contactName?.trim() || null,
          contactEmail: ref.contactEmail?.trim() || null,
          contactPosition: ref.contactPosition?.trim() || null,
        });
      }
    });

    return { ok: true, data: { id: applicationId } };
  } catch (e) {
    console.error("Update application error:", e);
    return { ok: false, error: "Failed to update application. Please try again." };
  }
}

export async function serviceSendApplication(
  applicationId: string,
  send: SendBody
): Promise<
  Result<{ recipientEmail: string; emailDeliveredBySmtp: boolean }>
> {
  const token = generateToken();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const applyUrl = `${baseUrl}/apply/${token}`;

  try {
    await db
      .update(creditApplications)
      .set({
        status: "sent",
        recipientName: send.recipientName.trim(),
        recipientEmail: send.recipientEmail.trim(),
        accessToken: token,
        sentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(creditApplications.id, applicationId));

    const { deliveredBySmtp } = await notifyRecipientInvite({
      recipientName: send.recipientName.trim(),
      recipientEmail: send.recipientEmail.trim(),
      applyUrl,
    });

    return {
      ok: true,
      data: {
        recipientEmail: send.recipientEmail.trim(),
        emailDeliveredBySmtp: deliveredBySmtp,
      },
    };
  } catch (e) {
    console.error("Send application error:", e);
    return { ok: false, error: "Failed to send application. Please try again." };
  }
}

export async function serviceSubmitApplication(
  token: string,
  body: RecipientSubmitBody
): Promise<Result<{ applicationId: string }>> {
  const app = await db.query.creditApplications.findFirst({
    where: eq(creditApplications.accessToken, token),
  });

  if (!app) {
    return { ok: false, error: "Invalid or expired application link." };
  }

  if (app.status !== "sent") {
    return { ok: false, error: "This application has already been submitted." };
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(creditApplications)
        .set({
          status: "submitted",
          companyName: body.companyName.trim(),
          dba: body.dba?.trim() || null,
          countryOfIncorporation: body.countryOfIncorporation || null,
          websiteUrl: body.websiteUrl?.trim() || null,
          creditAmountRequested: body.creditAmountRequested?.trim() || null,
          creditTermRequested: body.creditTermRequested ?? null,
          revenueBand: body.revenueBand ?? null,
          billingContactName: body.billingContactName?.trim() || null,
          billingContactEmail: body.billingContactEmail?.trim() || null,
          submittedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(creditApplications.id, app.id));

      await tx
        .delete(tradeReferences)
        .where(eq(tradeReferences.applicationId, app.id));

      for (const slot of [1, 2] as const) {
        const ref = slot === 1 ? body.tradeRef1 : body.tradeRef2;
        if (!ref) continue;
        await tx.insert(tradeReferences).values({
          applicationId: app.id,
          slot,
          businessName: ref.businessName,
          engagementStart: ref.engagementStart || null,
          engagementEnd: ref.engagementEnd || null,
          contactName: ref.contactName?.trim() || null,
          contactEmail: ref.contactEmail?.trim() || null,
          contactPosition: ref.contactPosition?.trim() || null,
        });
      }
    });

    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const reviewUrl = `${baseUrl}/applications/${app.id}`;
    await notifyVendorSubmission({
      companyName: body.companyName.trim(),
      reviewUrl,
    });

    return { ok: true, data: { applicationId: app.id } };
  } catch (e) {
    console.error("Submit application error:", e);
    return { ok: false, error: "Failed to submit application. Please try again." };
  }
}

export async function serviceDecisionApplication(
  applicationId: string,
  body: DecisionBody
): Promise<Result<{ message: string }>> {
  const revisedAmount =
    body.decision === "approved_with_adjustments"
      ? body.revisedAmount?.trim() || null
      : null;
  const revisedTerm =
    body.decision === "approved_with_adjustments"
      ? body.revisedTerm ?? null
      : null;

  try {
    await db
      .update(creditApplications)
      .set({
        status: body.decision,
        decidedAt: new Date(),
        decisionRevisedCreditAmount: revisedAmount,
        decisionRevisedCreditTerm: revisedTerm,
        updatedAt: new Date(),
      })
      .where(eq(creditApplications.id, applicationId));

    const message =
      body.decision === "approved"
        ? "Application approved."
        : body.decision === "approved_with_adjustments"
          ? "Application approved with adjustments."
          : "Application rejected.";

    return { ok: true, data: { message } };
  } catch (e) {
    console.error("Decision error:", e);
    return { ok: false, error: "Failed to record decision. Please try again." };
  }
}
