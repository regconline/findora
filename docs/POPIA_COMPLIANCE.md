# POPIA, PAIA, ECTA and CPA compliance checklist

> This checklist and the seeded legal pages are a technical and practical starting point. They are **not legal advice and not a substitute for review by a South African legal professional** before launch.

Legend: ✅ implemented in the platform · 🟡 partially / needs configuration · ⬜ organisational task for the operator

## POPIA — Protection of Personal Information Act 4 of 2013

| # | Requirement (condition) | Status | Where / how |
| --- | --- | --- | --- |
| 1 | **Accountability** — appoint and register an Information Officer with the Information Regulator | ⬜ | Register via the Information Regulator's portal; publish details in the Privacy Policy placeholders |
| 2 | **Processing limitation / minimality** — collect only what's needed | ✅ | Customers: name + email (phone optional). Analytics store no IP addresses or names (salted daily hash). Admin enquiry view hides message bodies and contact details |
| 3 | **Lawful basis & consent** | ✅ | Terms/privacy acceptance at registration; separate opt-in for marketing; consent checkbox on enquiries; business contact-publication consent; all recorded in `consent_records` with policy version |
| 4 | **Purpose specification** | ✅ | Privacy Policy §2; enquiry screen reminds businesses to use contact details only to respond |
| 5 | **Further processing limitation** | ✅ | Marketing only to `marketing_opt_in = true`; listing guidelines prohibit businesses adding enquirers to marketing lists |
| 6 | **Information quality** | ✅ | Users edit their profile; owners edit listings at any time; reports flag incorrect information |
| 7 | **Openness** — notification at collection | ✅ | Privacy Policy, Cookie Policy, inline notices on forms |
| 8 | **Security safeguards** (s19) | ✅ | HTTPS + HSTS; Row Level Security on every table (tested); server-only service key; admin roles server-side only; audit logs; rate limiting; honeypots + optional Turnstile; image re-encoding strips EXIF/GPS; secure headers |
| 9 | **Security compromise notification** (s22) | ⬜ | Write an incident-response procedure (who decides, notifying the Regulator and affected users) |
| 10 | **Operator agreements** (s21) | ⬜ | Review/accept DPAs with Supabase, Vercel, Resend, Google, Cloudflare |
| 11 | **Cross-border transfers** (s72) | 🟡 | Disclosed in Privacy Policy §4; confirm hosting regions and provider safeguards |
| 12 | **Data subject access** (s23) | ✅ | Dashboard → Settings → Download my data (JSON); logged in `data_requests` |
| 13 | **Correction / deletion** (s24) | ✅ | Self-service profile and listing editing; self-service account deletion (removes sole-owner listings, avatar; logs request; confirmation email) |
| 14 | **Objection / withdraw consent** | ✅ | Marketing toggle in settings; cookie preferences link in footer; contact form "Privacy / POPIA request" topic |
| 15 | **Direct marketing** (s69) | 🟡 | Opt-in recorded. If you start marketing emails, include sender identity and an unsubscribe link in every message |
| 16 | **Children** (s34–35) | ✅ | Terms require 18+ or guardian consent; no child-directed features |
| 17 | **Retention** (s14) | ⬜ | Decide retention periods (e.g. analytics events 24 months, rate-limit rows auto-purged after 1 day — implemented, contact messages 24 months) and schedule clean-up jobs |
| 18 | **Publication of third parties' contact details** | ✅ | Businesses must confirm authority and consent before contact details are shown; street address can be hidden |
| 19 | **Takedown / reporting** | ✅ | Report a listing (incl. photographs), admin moderation queue, hide images, suspend/delete listings, audit trail |

## PAIA — Promotion of Access to Information Act

| Requirement | Status |
| --- | --- |
| Compile a PAIA manual (private body) and make it available on the website and at the premises | ⬜ Create it, then publish it via **Admin → Pages** with slug `paia-manual` (the route already supports it) |
| Information Officer details in the manual | ⬜ |
| Process for access requests and fees | ⬜ The contact form "Privacy / POPIA request" topic can be the intake channel |

## ECTA — Electronic Communications and Transactions Act (s43 disclosures)

| Disclosure | Status |
| --- | --- |
| Full legal name and legal status of the operator | ⬜ Fill the placeholders in Terms and Privacy |
| Physical address, telephone, email | 🟡 Configure in **Admin → Platform settings** (shown on the Contact page) and in legal pages |
| Registration number | ⬜ Terms/Privacy placeholders |
| Terms of use, privacy policy | ✅ Seeded and editable in Admin → Pages |
| No unsolicited commercial communications without an opt-out | ✅ No marketing without opt-in |

## CPA — Consumer Protection Act and advertising

| Item | Status |
| --- | --- |
| Clear labelling of ads, featured and sponsored placements | ✅ "Advertisement", "Featured", "Sponsored" labels; organic ranking independent of payment |
| No misleading claims | ✅ No fake reviews/ratings/statistics; verification badges only via admin with recorded verification notes |
| Platform is not a party to customer–business agreements | ✅ Stated in Terms and enquiry confirmation email |
| Fees disclosed before charging (future plans) | ✅ No payments in MVP; database ready for plans |

## Cookie consent

✅ Consent banner with essential / analytics / advertising categories; GA4 and personalised ads load only after consent; preferences re-openable from every page footer.
