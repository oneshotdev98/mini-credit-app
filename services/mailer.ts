import nodemailer from "nodemailer";

let transporterCache: nodemailer.Transporter | null | undefined;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function logRecipientInviteConsole(
  recipientName: string,
  recipientEmail: string,
  applyUrl: string
) {
  console.log("\n" + "=".repeat(60));
  console.log("RECIPIENT INVITE (console — set SMTP_HOST to send email)");
  console.log("=".repeat(60));
  console.log(`To: ${recipientName} <${recipientEmail}>`);
  console.log(`Subject: Credit Application — Please Complete`);
  console.log(`\nHi ${recipientName},\n`);
  console.log(`You've been invited to complete a credit application.`);
  console.log(`Please click the link below to fill out the form:\n`);
  console.log(`  ${applyUrl}\n`);
  console.log("=".repeat(60) + "\n");
}

function logVendorSubmittedConsole(companyName: string, reviewUrl: string) {
  console.log("\n" + "=".repeat(60));
  console.log("VENDOR SUBMISSION NOTICE (console)");
  console.log("=".repeat(60));
  console.log(`Subject: Credit Application Submitted — ${companyName}`);
  console.log(`\nA credit application has been submitted by ${companyName}.`);
  console.log(`Review it here:\n`);
  console.log(`  ${reviewUrl}\n`);
  console.log("=".repeat(60) + "\n");
}

function getMailFrom(): string {
  const configured = process.env.MAIL_FROM?.trim();
  if (configured) return configured;
  const user = process.env.SMTP_USER?.trim();
  if (user) return user;
  return '"Mini Credit App" <noreply@localhost>';
}

function getTransporter(): nodemailer.Transporter | null {
  if (transporterCache !== undefined) return transporterCache;
  const host = process.env.SMTP_HOST?.trim();
  if (!host) {
    transporterCache = null;
    return null;
  }
  const port = Number.parseInt(process.env.SMTP_PORT || "587", 10);
  const secure =
    process.env.SMTP_SECURE === "1" ||
    process.env.SMTP_SECURE === "true" ||
    port === 465;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS;
  transporterCache = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });
  return transporterCache;
}

export async function notifyRecipientInvite(params: {
  recipientName: string;
  recipientEmail: string;
  applyUrl: string;
}): Promise<{ deliveredBySmtp: boolean }> {
  const { recipientName, recipientEmail, applyUrl } = params;
  const subject = "Credit Application — Please Complete";
  const text = `Hi ${recipientName},

You've been invited to complete a credit application.

Open this link to fill out the form:
${applyUrl}
`;
  const html = `<p>Hi ${escapeHtml(recipientName)},</p>
<p>You've been invited to complete a credit application.</p>
<p><a href="${escapeHtml(applyUrl)}">Open the application form</a></p>
<p style="color:#64748b;font-size:12px;">If the button does not work, copy this URL:<br>${escapeHtml(applyUrl)}</p>`;

  const transport = getTransporter();
  if (!transport) {
    logRecipientInviteConsole(recipientName, recipientEmail, applyUrl);
    return { deliveredBySmtp: false };
  }

  try {
    await transport.sendMail({
      from: getMailFrom(),
      to: { name: recipientName, address: recipientEmail },
      subject,
      text,
      html,
    });
    return { deliveredBySmtp: true };
  } catch (e) {
    console.error("SMTP failed (recipient invite):", e);
    logRecipientInviteConsole(recipientName, recipientEmail, applyUrl);
    return { deliveredBySmtp: false };
  }
}

export async function notifyVendorSubmission(params: {
  companyName: string;
  reviewUrl: string;
}): Promise<{ deliveredBySmtp: boolean }> {
  const { companyName, reviewUrl } = params;
  const vendorTo = process.env.VENDOR_NOTIFICATION_EMAIL?.trim();
  const subject = `Credit Application Submitted — ${companyName}`;
  const text = `A credit application has been submitted by ${companyName}.

Review it here:
${reviewUrl}
`;
  const html = `<p>A credit application has been submitted by <strong>${escapeHtml(companyName)}</strong>.</p>
<p><a href="${escapeHtml(reviewUrl)}">Review submission</a></p>`;

  const transport = getTransporter();
  if (!transport || !vendorTo) {
    if (transport && !vendorTo) {
      console.warn(
        "SMTP is configured but VENDOR_NOTIFICATION_EMAIL is empty; logging submission notice to console."
      );
    }
    logVendorSubmittedConsole(companyName, reviewUrl);
    return { deliveredBySmtp: false };
  }

  try {
    await transport.sendMail({
      from: getMailFrom(),
      to: vendorTo,
      subject,
      text,
      html,
    });
    return { deliveredBySmtp: true };
  } catch (e) {
    console.error("SMTP failed (vendor submission):", e);
    logVendorSubmittedConsole(companyName, reviewUrl);
    return { deliveredBySmtp: false };
  }
}
