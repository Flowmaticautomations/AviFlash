# Phone / SMS OTP Sign-Up — Feasibility Report

Scoped per Peet's call feedback (2026-09-16), revised 2026-09-16 to a Hetzner-first architecture per Winon's
correction. **This is a report only — nothing below has been implemented.** Email verification remains the only
sign-up method until Christian approves the cost and approach.

## 1. Current reality

Checked directly against this repo, not assumed:

- **Today, as this app is actually built, Supabase is the only backend it talks to.** [lib/supabase.ts](../lib/supabase.ts)
  reads exactly `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY`, and every auth call, every table
  read/write (`profiles`, `subjects`, `decks`, `flashcards`, `card_images`), and every storage upload go through
  the Supabase client directly from the app. There is no Hetzner reference, IP, or custom API base URL anywhere
  in this repository (grepped for it directly).
- **Going forward, Hetzner is intended to become the main server/backend for the project**, per Winon's direction
  — this is a planned migration, not yet built. Any new auth capability, including phone OTP, should be designed
  to run through a Hetzner-hosted API rather than deepening reliance on Supabase Auth for something new.
- Supabase isn't necessarily going away entirely — it may keep serving auth/storage/DB for existing features
  (that's what it does today, and ripping it out is a separate, much larger migration) — but it must not be
  assumed as *the* backend for anything new being designed now, phone OTP included.
- **Practical implication**: this report designs phone OTP as a Hetzner-owned service from day one, with an
  explicit, minimal integration point back into Supabase for identity — not as a Supabase Auth feature with
  Hetzner bolted on.

## 2. Hetzner-first SMS OTP flow

```
1. User enters phone number in the app.
2. App calls Hetzner API: POST /auth/otp/request { phone }
3. Hetzner backend:
   - generates a random 6-digit code
   - hashes it (never stores the raw code)
   - stores: phone_number, otp_hash, expires_at, attempt_count, resend_count,
     ip_address, device_info, created_at
   - calls the SMS provider's API to send the code
4. User enters the code in the app.
5. App calls Hetzner API: POST /auth/otp/verify { phone, code }
6. Hetzner backend:
   - looks up the pending OTP record for that phone
   - rejects if expired, already used, or attempt_count exceeded
   - compares the hash; increments attempt_count on failure
   - on success: marks the record used, then creates or logs in the user
     and returns a session (JWT / cookie)
```

### Where the session comes from — the one real architecture decision

Two honest options, not a detail to hand-wave:

- **Option A — Hetzner verifies, Supabase still issues identity (recommended).** After a successful OTP check,
  the Hetzner API calls the **Supabase Admin API** (service_role key, held only server-side on Hetzner, never in
  the app) to find-or-create a Supabase `auth.users` row for that phone number, then mints a Supabase session for
  it and hands the resulting access/refresh token back to the app. The app keeps using `supabase-js` exactly as
  it does today for everything after login — every existing RLS policy, every table, every storage rule keeps
  working unchanged. Hetzner's only job is "is this phone number verified" — a clean, small, bounded service.
- **Option B — Full independence.** Hetzner issues its own JWT and becomes the app's actual identity provider;
  Supabase (if kept at all) is used as a plain database with RLS rewritten to trust Hetzner's tokens instead of
  `auth.uid()`. This is a materially bigger job — every RLS policy in
  [supabase/migrations/](../supabase/migrations/) is written against `auth.uid()`, and none of that
  infrastructure carries over for free. Only worth it if the intent is to leave Supabase entirely, not just add
  phone sign-up.

This report assumes **Option A** for cost/effort estimates below — it's the only version that doesn't also
require re-architecting the app's entire existing data-access layer.

### Anti-abuse, built into the flow above, not bolted on after

- **Expiry**: OTP valid for a short window (5–10 minutes is typical).
- **Attempt limit**: e.g. 5 wrong-code attempts before the OTP is invalidated and a new one is required.
- **Resend limit**: e.g. max 3 resends per phone number per hour, with an increasing cooldown between them
  (30s, then 60s, then 5 min) — this is the single most important guard against SMS-pumping abuse (see §4).
- **Per-IP and per-device rate limits**: cap OTP requests per IP/device per hour independent of the phone-number
  limit, since a pumping attack rotates phone numbers but not always IPs/devices.

## 3. Costs

- **Hetzner server**: no new line item — it's already part of the existing infrastructure, per Winon. In
  practice, if no workload for AviFlash currently runs there, this would be the first thing deployed to it for
  this project, but no *additional* hosting spend is expected beyond what's already budgeted for that server.
- **The real new ongoing cost is the SMS provider**, billed directly by that provider, independent of Hetzner or
  Supabase. Comparison of the providers named on the call:

| Provider | Type | Typical cost to SA numbers | Notes |
|---|---|---|---|
| **Twilio** | International, verification-focused | ≈$0.03–$0.11/msg (≈R0.55–R2.00 at ~R18.50/USD) | Best documentation, Twilio Verify adds ~$0.05/verification on top for built-in retry/fraud logic. International routing markup makes it pricier than local SA gateways in most cases. |
| **Vonage** | International | Can run $0.50+/msg to African destinations in some published guidance | Likely the most expensive of the four for South Africa specifically — get a real quote before considering it seriously. |
| **Clickatell** | SA-founded, global reach | Tiered/negotiated, no fixed public rate | Requires a quote via their pricing estimator or sales team; tiers improve with volume, worth asking given South African origin. |
| **BulkSMS (bulksms.com / bulksms.co.za)** | SA-focused local gateway | Published 2026 SA rate cards run roughly **R0.12–R0.45/msg**, dropping with volume | Likely the cheapest realistic option for SA-only traffic; local gateways generally undercut international players for in-country delivery. |

None of these figures should be treated as final — get an actual quote (Clickatell and BulkSMS in particular
price by volume/negotiation, not a flat public rate) before budgeting hard numbers.

### Rough monthly cost at three signup volumes

Assuming ~1.3 SMS sent per signup on average (accounts for a typical resend rate), and using the *low* end
(local SA gateway, ~R0.15/msg) and *high* end (Twilio international, ~R1.00/msg) as bounding estimates:

| Signups/month | SMS sent (×1.3) | Low estimate (~R0.15/msg) | High estimate (~R1.00/msg) |
|---|---|---|---|
| 100 | 130 | ≈R20/month | ≈R130/month |
| 500 | 650 | ≈R98/month | ≈R650/month |
| 1,000 | 1,300 | ≈R195/month | ≈R1,300/month |

At any of these volumes the SMS cost itself is modest — the bigger risk to the budget is an abuse attack (§4)
driving message volume far above real signups, which is why the resend/attempt/rate limits in §2 aren't optional.

## 4. Security / minors / POPIA

- **Phone number is personal data under POPIA.** It's more directly identifying than most data this app already
  collects (tied to a real, contactable individual and a specific carrier account), and needs to be treated
  accordingly: explicit consent wording at sign-up explaining it will be used for account verification and login,
  not shared with third parties beyond the SMS provider needed to deliver the code.
- **Retention/deletion policy**: the existing [delete-account explanation](../app/delete-account.tsx) already
  tells users their info is kept 90 days post-deletion-request and that their phone number is retained longer to
  prevent trial-abuse re-signup. That policy needs to explicitly cover phone-OTP records too (the OTP table
  itself, not just the profile) — old OTP rows (hash, attempt count, IP) should have their own short retention
  independent of the account's, since they're more sensitive/transient than a profile field.
- **SMS pumping / toll fraud**: the single biggest real risk. Bots requesting floods of OTPs to premium-rate or
  fake numbers can run up the SMS bill with zero real signups — this is a known, common attack against exactly
  this kind of endpoint. Covered by the resend/attempt/per-IP/per-device limits in §2; also worth a hard daily
  spend cap with the SMS provider as a last-resort circuit breaker.
- **Minors / parental consent**: no verified adult-consent step exists anywhere in the current sign-up flow
  (email has the same gap today), but a phone number raises the stakes since it's a stronger real-world identity
  signal than an email address. POPIA doesn't set one fixed consent age the way GDPR does, but processing a
  minor's personal information generally needs "competent person" (parent/guardian) consent. If AviFlash's actual
  audience skews under 18, this needs a legal read before phone sign-up ships — not an engineering guess.
- **Rate limits per phone/IP/device**: covered in §2, restated here because it's simultaneously a fraud control
  and a POPIA-adjacent concern (limiting how much account activity ties back to one real phone number in a short
  window).

## 5. Implementation impact

### Backend routes needed (Hetzner API, Option A architecture)

- `POST /auth/otp/request` — phone in, OTP generated + sent, rate-limited.
- `POST /auth/otp/verify` — phone + code in, session (Supabase-backed) out.
- `POST /auth/otp/resend` — same as request but against an existing pending OTP, with its own cooldown.
- `POST /auth/phone/change` — for an already-logged-in user changing their phone number (needs its own
  verify-the-new-number-before-switching step, same OTP mechanism).
- `POST /auth/recovery/start` (phone-based "forgot password"/login recovery) — realistically the same
  `otp/request` + `otp/verify` pair; see below, there's no separate "password" to reset if phone becomes an
  OTP-as-login method rather than a password-holding account.
- `POST /account/delete-request` — records a deletion request server-side (this doesn't exist yet at all, email
  or phone — see [app/delete-account.tsx](../app/delete-account.tsx), which is explanation-only for the same
  reason: no backend policy to call yet).

### Password / login recovery by phone

Same conclusion as the original version of this report: the lowest-effort, lowest-risk design is **OTP-as-login**
for phone accounts — no password exists to forget, "recovery" is just requesting a fresh OTP. Keeping a
password *and* offering phone-based reset is a materially bigger, more error-prone build (a custom OTP-gated
`updateUser` step) for a benefit (a memorable password) that OTP-as-login makes unnecessary in the first place.

### Database

- **New table on the Hetzner side** (or a schema Hetzner owns, even if the Postgres instance itself is shared):
  `otp_requests` — `id`, `phone_number`, `otp_hash`, `expires_at`, `attempt_count`, `resend_count`, `ip_address`,
  `device_info`, `created_at`, `used_at`.
- **Supabase side**: `profiles.phone` already exists and is already collected today — no new column needed
  there for Option A. `auth.users.phone` is also already a field Supabase Auth supports natively, usable via the
  Admin API bridge without schema changes.

### App screen changes

- Phone-number entry screen (replacing or alongside [app/register.tsx](../app/register.tsx)'s email field).
- OTP-entry screen with a visible countdown/cooldown and a "Resend code" action that respects the backend's
  resend limit.
- A "change phone number" entry point in Settings, next to the existing
  [Change Password](../app/change-password.tsx) item (which would become email-account-only if phone accounts
  are OTP-only with no password).
- [app/auth-callback.tsx](../app/auth-callback.tsx)/[app/reset-password.tsx](../app/reset-password.tsx) (the
  email-link deep-link flow fixed this session) would need a phone-specific counterpart, or an explicit decision
  that phone accounts simply don't need it (true under OTP-as-login).

### Migration path: email vs. phone

Realistically **support both, not a hard cutover** — see recommendation below. The app's existing
`profile_completed`/`access` gating in [app/_layout.tsx](../app/_layout.tsx) doesn't care how a session was
established, so both paths can converge on the same authenticated-user flow once Option A hands back a Supabase
session either way.

## 6. Recommendation

**B — add optional phone OTP later, alongside email, not instead of it.** Not A (do nothing) because Peet's
underlying concern — younger users without email — is real and worth solving. Not C (replace email outright)
because: it's the bigger, riskier build (new Hetzner service, new abuse surface, a POPIA/minors question that
needs a legal answer); it removes a working, already-fixed sign-up path for users who *do* have email; and there's
no data yet on how many real signups are actually blocked by the lack of a phone option.

### Practical phased approach

1. **Now (done)**: email sign-up/login/reset, fixed and working this session — ship it, gather real usage.
2. **Phase 2 (this report's scope)**: build the Hetzner OTP microservice (Option A architecture above) as a
   *second, optional* sign-up path next to email. Small, bounded service — phone verification only, existing app
   data/RLS untouched. Gate it behind the POPIA/minors legal read and Christian's cost sign-off.
3. **Phase 3 (only if the data supports it)**: if phone sign-up meaningfully outperforms email for the actual
   target audience, consider narrowing to phone-first (not necessarily phone-only) for new signups. Full removal
   of email is a separate decision with its own migration cost for existing accounts and shouldn't be assumed as
   the end state from the outset.

**Needs Christian's explicit sign-off on the cost model and the minors/POPIA approach, and Winon's confirmation
of the Hetzner API's actual shape (Option A vs. B above, and whether a Postgres instance already exists there to
host `otp_requests`), before any code is written.**
