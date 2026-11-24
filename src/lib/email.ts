import "server-only";
import { Resend } from "resend";
import { env, serverEnv } from "@/lib/env";

const NAVY = "#102C3B";
const EMERALD = "#20B88A";
const MUTED = "#687780";

function esc(s: string | null | undefined) {
  return (s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Consistent Findora-branded, table-based layout that renders in all major email clients. */
export function layout(opts: { preheader: string; heading: string; body: string; cta?: { label: string; url: string }; footerNote?: string }) {
  const logo = `${env.siteUrl}/brand/findora-logo.png`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.heading)}</title></head>
<body style="margin:0;padding:0;background:#F4F7F8;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#172B36">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(opts.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F7F8;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E5EAED;border-radius:14px;overflow:hidden">
<tr><td style="padding:28px 32px 8px"><img src="${logo}" width="150" alt="Findora" style="display:block;height:auto;border:0"></td></tr>
<tr><td style="padding:8px 32px 0"><h1 style="margin:16px 0 12px;font-size:22px;line-height:1.3;color:${NAVY}">${esc(opts.heading)}</h1>
<div style="font-size:15px;line-height:1.65;color:#172B36">${opts.body}</div>
${opts.cta ? `<p style="margin:28px 0 8px"><a href="${esc(opts.cta.url)}" style="display:inline-block;background:${EMERALD};color:#FFFFFF;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px;font-size:15px">${esc(opts.cta.label)}</a></p>` : ""}
</td></tr>
<tr><td style="padding:28px 32px 28px"><hr style="border:none;border-top:1px solid #E5EAED;margin:0 0 16px">
<p style="margin:0;font-size:12px;line-height:1.6;color:${MUTED}">${opts.footerNote ? esc(opts.footerNote) + "<br>" : ""}Findora — Discover Businesses. Connect with Confidence.<br>
<a href="${env.siteUrl}/privacy" style="color:${MUTED}">Privacy policy</a> · <a href="${env.siteUrl}/contact" style="color:${MUTED}">Contact us</a></p></td></tr>
</table></td></tr></table></body></html>`;
}

export type EmailMessage = { to: string | string[]; subject: string; html: string; replyTo?: string };

/** Sends via Resend. Without RESEND_API_KEY the message is logged (development) and not sent. */
export async function sendEmail(msg: EmailMessage): Promise<{ sent: boolean }> {
  const { resendApiKey, emailFrom } = serverEnv();
  if (!resendApiKey) {
    console.info(`[email:disabled] to=${String(msg.to)} subject="${msg.subject}"`);
    return { sent: false };
  }
  try {
    const resend = new Resend(resendApiKey);
    const { error } = await resend.emails.send({ from: emailFrom, to: msg.to, subject: msg.subject, html: msg.html, replyTo: msg.replyTo });
    if (error) {
      console.error("[email] Resend error", error);
      return { sent: false };
    }
    return { sent: true };
  } catch (e) {
    console.error("[email] failed", e);
    return { sent: false };
  }
}

const p = (s: string) => `<p style="margin:0 0 14px">${s}</p>`;

export const emails = {
  welcome(name: string, isBusiness: boolean): Omit<EmailMessage, "to"> {
    return {
      subject: "Welcome to Findora",
      html: layout({
        preheader: "Your Findora account is ready.",
        heading: `Welcome to Findora, ${esc(name.split(" ")[0])}`,
        body:
          p("Your email address is confirmed and your account is ready.") +
          (isBusiness
            ? p("Next, create your free business listing. It takes about ten minutes — add your services, photos and contact details, then submit it for review.")
            : p("You can now save businesses, send enquiries and keep track of every conversation from your dashboard.")),
        cta: isBusiness ? { label: "Create your listing", url: `${env.siteUrl}/dashboard/businesses/new` } : { label: "Explore businesses", url: `${env.siteUrl}/businesses` },
      }),
    };
  },
  businessSubmitted(name: string, business: string): Omit<EmailMessage, "to"> {
    return {
      subject: `We received your listing: ${business}`,
      html: layout({
        preheader: "Your listing is in the review queue.",
        heading: "Your listing has been submitted",
        body:
          p(`Hi ${esc(name.split(" ")[0])},`) +
          p(`Thank you for listing <strong>${esc(business)}</strong> on Findora. Our team reviews every listing before it is published to keep the directory trustworthy. Most reviews are completed within two working days.`) +
          p("We will email you as soon as a decision is made. You can keep editing your profile in the meantime."),
        cta: { label: "View my dashboard", url: `${env.siteUrl}/dashboard/businesses` },
      }),
    };
  },
  businessApproved(business: string, slug: string): Omit<EmailMessage, "to"> {
    return {
      subject: `${business} is now live on Findora`,
      html: layout({
        preheader: "Your listing has been approved.",
        heading: "Your listing is live",
        body:
          p(`Good news — <strong>${esc(business)}</strong> has been approved and is now visible to customers searching on Findora.`) +
          p("Tip: businesses with a logo, cover photo, several services and up-to-date operating hours receive more enquiries. Share your profile link on WhatsApp and social media to get started."),
        cta: { label: "View your public profile", url: `${env.siteUrl}/businesses/${slug}` },
      }),
    };
  },
  businessRejected(business: string, reason: string, id: string): Omit<EmailMessage, "to"> {
    return {
      subject: `Action needed: ${business} listing`,
      html: layout({
        preheader: "Your listing needs changes before it can be published.",
        heading: "Your listing needs a few changes",
        body:
          p(`We reviewed <strong>${esc(business)}</strong> but could not publish it yet.`) +
          p(`<strong>Reason:</strong> ${esc(reason)}`) +
          p("Please update your listing and submit it again. If you believe this is a mistake, reply via our contact page."),
        cta: { label: "Update my listing", url: `${env.siteUrl}/dashboard/businesses/${id}` },
      }),
    };
  },
  businessSuspended(business: string, reason: string): Omit<EmailMessage, "to"> {
    return {
      subject: `${business} has been suspended`,
      html: layout({
        preheader: "Your listing has been suspended.",
        heading: "Your listing has been suspended",
        body:
          p(`<strong>${esc(business)}</strong> is temporarily hidden from Findora.`) +
          p(`<strong>Reason:</strong> ${esc(reason)}`) +
          p("Contact us if you would like to discuss this decision or provide additional information."),
        cta: { label: "Contact Findora", url: `${env.siteUrl}/contact` },
      }),
    };
  },
  newEnquiry(business: string, e: { name: string; email: string; phone?: string | null; subject: string; message: string }): Omit<EmailMessage, "to"> {
    return {
      subject: `New enquiry for ${business}: ${e.subject}`,
      replyTo: e.email,
      html: layout({
        preheader: `${e.name} sent you an enquiry on Findora.`,
        heading: "You have a new enquiry",
        body:
          p(`<strong>${esc(e.name)}</strong> sent an enquiry to <strong>${esc(business)}</strong>.`) +
          `<table role="presentation" style="width:100%;border:1px solid #E5EAED;border-radius:10px;margin:0 0 14px;font-size:14px" cellpadding="10">
<tr><td style="color:${MUTED};width:90px">Subject</td><td>${esc(e.subject)}</td></tr>
<tr><td style="color:${MUTED}">Email</td><td>${esc(e.email)}</td></tr>
${e.phone ? `<tr><td style="color:${MUTED}">Phone</td><td>${esc(e.phone)}</td></tr>` : ""}
<tr><td style="color:${MUTED};vertical-align:top">Message</td><td style="white-space:pre-wrap">${esc(e.message)}</td></tr></table>` +
          p("Reply directly to this email or use the contact details above. Respond promptly — quick replies win more customers."),
        cta: { label: "Open in dashboard", url: `${env.siteUrl}/dashboard/enquiries` },
        footerNote: "You received this because you manage this business on Findora.",
      }),
    };
  },
  enquiryConfirmation(name: string, business: string, slug: string, subject: string): Omit<EmailMessage, "to"> {
    return {
      subject: `Your enquiry to ${business} was sent`,
      html: layout({
        preheader: "We passed your enquiry to the business.",
        heading: "Your enquiry has been sent",
        body:
          p(`Hi ${esc(name.split(" ")[0])},`) +
          p(`We delivered your enquiry "<em>${esc(subject)}</em>" to <strong>${esc(business)}</strong>. The business will contact you directly using the details you provided.`) +
          p("Findora does not take part in agreements between you and the business. Always confirm prices, qualifications and terms before paying for a service."),
        cta: { label: "View the business", url: `${env.siteUrl}/businesses/${slug}` },
      }),
    };
  },
  accountSuspended(name: string, reason: string): Omit<EmailMessage, "to"> {
    return {
      subject: "Your Findora account has been suspended",
      html: layout({
        preheader: "Your account has been suspended.",
        heading: "Your account has been suspended",
        body: p(`Hi ${esc(name.split(" ")[0] || "there")},`) + p(`Your Findora account has been suspended. <strong>Reason:</strong> ${esc(reason)}`) + p("If you believe this is a mistake, please contact us."),
        cta: { label: "Contact Findora", url: `${env.siteUrl}/contact` },
      }),
    };
  },
  accountDeleted(name: string): Omit<EmailMessage, "to"> {
    return {
      subject: "Your Findora account has been deleted",
      html: layout({
        preheader: "Confirmation of account deletion.",
        heading: "Your account has been deleted",
        body:
          p(`Hi ${esc(name.split(" ")[0] || "there")},`) +
          p("As requested, your Findora account and personal profile have been deleted. Listings you were the only owner of have been removed from public view.") +
          p("Some records may be kept for a limited period where the law requires it (for example, security logs). You are welcome to create a new account at any time."),
      }),
    };
  },
  contactMessage(m: { name: string; email: string; topic: string; message: string }): Omit<EmailMessage, "to"> {
    return {
      subject: `[Findora contact] ${m.topic}: ${m.name}`,
      replyTo: m.email,
      html: layout({
        preheader: "New contact form message.",
        heading: "New contact form message",
        body: p(`<strong>From:</strong> ${esc(m.name)} (${esc(m.email)})`) + p(`<strong>Topic:</strong> ${esc(m.topic)}`) + `<p style="white-space:pre-wrap">${esc(m.message)}</p>`,
      }),
    };
  },
  adminNewListing(business: string, id: string): Omit<EmailMessage, "to"> {
    return {
      subject: `Listing awaiting review: ${business}`,
      html: layout({
        preheader: "A listing is waiting for moderation.",
        heading: "New listing awaiting review",
        body: p(`<strong>${esc(business)}</strong> has been submitted for approval.`),
        cta: { label: "Review listing", url: `${env.siteUrl}/admin/businesses/${id}` },
      }),
    };
  },
};
