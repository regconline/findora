# Email setup (Resend)

Findora sends two kinds of email:

| Sent by | Emails | Template location |
| --- | --- | --- |
| **Supabase Auth** | Email verification, password reset | `supabase/templates/*.html` (paste into Supabase) |
| **The app via Resend** (server-side only) | Welcome, business submitted, business approved, business rejected, account suspended, listing suspended, new customer enquiry (to business), enquiry confirmation (to customer), account deletion confirmation, admin alerts (new listing, report, contact message) | `src/lib/email.ts` |

All emails share the same Findora-branded layout.

## 1. Create a Resend account and verify your domain

1. Sign up at [resend.com](https://resend.com) and add your domain (e.g. `findora.co.za`).
2. Add the DNS records Resend shows you (SPF/DKIM, and optionally DMARC) at your DNS provider. Wait until the domain shows **Verified**.
3. Create an API key with sending access.

## 2. Configure the app

In `.env.local` and in Vercel:

```
RESEND_API_KEY=re_...
EMAIL_FROM="Findora <no-reply@findora.co.za>"
ADMIN_NOTIFICATION_EMAIL=moderation@findora.co.za
```

Without `RESEND_API_KEY`, the app logs each email to the server console instead of sending it (useful in development). Nothing else breaks.

## 3. Use Resend for Supabase Auth emails

In Supabase → **Authentication → SMTP Settings**, enable custom SMTP:

| Setting | Value |
| --- | --- |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | your Resend API key |
| Sender email | `no-reply@findora.co.za` |
| Sender name | `Findora` |

Then raise the auth email rate limit in **Authentication → Rate Limits** to suit your expected sign-ups.

## 4. Test

1. Register a new account → verification email arrives → link lands on `/dashboard`, then the welcome email arrives.
2. Use **Forgot password** → reset email → `/reset-password`.
3. Send an enquiry to an approved business → the owner and the customer both receive emails.

## Deliverability tips

- Add a DMARC record (start with `p=none`) and monitor reports.
- Keep the From address consistent.
- Don't send marketing from the transactional domain/stream. Marketing emails (if you add them) must only go to users with `marketing_opt_in = true` and include an unsubscribe option (POPIA s69).
