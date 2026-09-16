# Phone / SMS OTP Sign-Up — Feasibility Report

Scoped per Peet's call feedback (2026-09-16): younger users may not have email, so signing up with a phone number
instead is worth evaluating. **This is a report only — nothing below has been implemented.** Email verification
stays as the only sign-up method until Christian approves the cost and approach.

## 1. Can the current auth provider support phone OTP?

Yes. Supabase Auth (the provider already in use — see [lib/supabase.ts](../lib/supabase.ts)) supports phone-number
sign-up/sign-in with an OTP code natively, on the same plan already in use, no migration to a different auth
provider needed.

## 2. Is it free or paid?

Two separate cost sources:

- **Supabase itself**: primary phone sign-up/login is a standard Auth feature, not a paid add-on. (Supabase does
  sell a separate "Advanced MFA — Phone" add-on at $75/month for the first project — that's phone-based
  *two-factor* auth for an already-registered user, a different feature from what's being asked for here, and is
  **not** required.)
- **The SMS provider**: Supabase doesn't send the SMS itself — it calls out to a provider (Twilio, MessageBird,
  Vonage, or the community-supported TextLocal) that AviFlash would need its own account with, and pays per
  message sent.

So: no new Supabase cost, but a new, ongoing per-message cost with a third party, billed directly to AviFlash by
that provider.

## 3. What provider, and expected cost?

**Twilio** is the best-documented option and the one Supabase's own guides are built around.

- Outbound SMS to South African numbers: roughly **$0.03–$0.11 per message** (varies by destination carrier —
  MTN/Vodacom/Cell C/Telkom price differently; Twilio publishes exact current per-carrier rates).
- If using Twilio *Verify* (a slightly higher-level OTP-specific API, adds delivery retry/fraud logic on top of
  raw SMS) instead of raw SMS: **≈$0.05 per verification** on top of the message cost itself.
- A South African-registered sender number/short code may carry its own monthly lease fee and require local
  compliance approval — worth getting Twilio's current quote directly rather than budgeting from public list
  prices alone, since messaging pricing and local number requirements do shift.

**Rough monthly cost formula**: `(signups per month) × (1 + expected resend rate) × (cost per SMS)`

Example: 100 new signups/month, assuming ~30% need one resend (1.3 SMS/signup average), at $0.05–$0.11/SMS →
roughly **R120 – R270/month** at that volume (using a ~R18.50/USD rate at the time of writing — reconfirm the
actual rate when budgeting). This scales roughly linearly with signup volume — 500/month would be in the
R600–R1,350/month range, and so on. Christian would need to supply an actual expected signup volume for a firm
number; Twilio also bills for undelivered/failed sends in some cases, so real spend can run a bit above the
formula during periods of bad numbers or carrier issues.

## 4. What code/database changes would be needed?

- **Registration** ([app/register.tsx](../app/register.tsx)): a phone-number field and a `signInWithOtp({ phone })`
  call instead of (or alongside) `signUp({ email, password })`; a new "enter the code we texted you" screen.
- **Login**: same OTP flow, or keep password login for phone-registered accounts (a product decision — OTP-only
  login is simpler to build but means no password to forget in the first place, which changes the shape of
  "forgot password" for these users entirely).
- **Database**: `profiles.phone` already exists and is already collected — no new column needed there. Supabase's
  `auth.users` table already has a `phone` field it can key on either email or phone as the primary identifier.
  Real work is on the RLS/trigger side: [supabase/migrations/20260903121500_card_images.sql](../supabase/migrations/20260903121500_card_images.sql)
  and related policies assume `auth.uid()` — that's unaffected either way (phone-based users still get a normal
  `auth.uid()`), but any code path that currently assumes every user has a confirmed email (e.g. this session's
  own `auth-callback.tsx`/`reset-password.tsx` email-link flow) needs an equivalent phone path, or an explicit
  decision that phone-registered users simply don't get email-based recovery.
- **Redirect/callback plumbing**: none needed for phone OTP itself (it's a 6-digit code typed in-app, not a link
  to click) — this is actually *simpler* than the email link flow this session just fixed, with no
  `exp://`/`aviflash://` redirect-URL configuration involved at all.

## 5. Password reset / change by SMS

Two realistic designs:

- **OTP-as-login (no password at all) for phone accounts**: "forgot password" stops being a concept for these
  users — they just request a fresh OTP to log in, same as sign-up. Simplest to build, and Supabase supports it
  natively.
- **Phone-based password recovery** (keep passwords, reset via SMS code instead of email link): Supabase's
  `resetPasswordForEmail` has no direct phone equivalent — this would need to be built as a custom OTP-verify step
  that then calls `updateUser({ password })`, using the same `signInWithOtp({ phone })` verification primitive.
  More code, but keeps a consistent "password" mental model across email and phone users.

Given the app already has a working email password-reset flow (this session), the phone-OTP-as-login model is the
lower-effort, lower-risk option if phone sign-up goes ahead.

## 6. Risks — minors, POPIA, privacy

- **Minors**: if under-18 users can sign up with just a phone number, there's no verified adult consent step
  anywhere in the flow (email has the same gap today, but a phone number is more directly tied to a real,
  contactable individual and a specific carrier account, which raises the stakes). POPIA doesn't set a single
  fixed age of consent the way GDPR does, but processing a minor's personal information generally requires
  "competent person" (parent/guardian) consent — this needs a legal read, not an engineering guess, before phone
  sign-up ships if the target audience genuinely skews under 18.
- **Phone number as PII**: a phone number is more sensitive/identifying than most free-text data already in this
  app, and is explicitly called out as personal information under POPIA. Storage, retention, and the existing
  [delete-account explanation](../app/delete-account.tsx) (90-day retention, phone kept longer to prevent
  trial-abuse re-signup) all need to be consistent with whatever policy is set — that screen already assumes phone
  numbers are collected and retained, so this is additive, not a new category of data, but the retention
  reasoning needs to hold up if phone becomes the *primary* identifier rather than a secondary profile field.
- **SMS pumping / toll fraud**: OTP-by-SMS sign-up flows are a known abuse target (bots requesting floods of OTPs
  to premium-rate numbers, running up the SMS bill with zero real signups). Needs rate-limiting per phone number
  and per IP before going live — Supabase has some built-in rate limits, but a dedicated review of Twilio's own
  fraud-guard settings would be needed too.
- **Deliverability**: SMS delivery to South African numbers isn't 100% reliable (carrier filtering, number
  portability issues) — a signup flow with no fallback (no email at all) risks a real user getting stuck with a
  legitimately undeliverable code and no way to recover the attempt except retrying.

## Recommendation

Technically straightforward to add (Supabase supports it natively, no new auth provider) and cheaper than it
sounds at low volume, but it introduces a new ongoing third-party cost, a new abuse surface, and a real (not
hypothetical) POPIA/minors question that needs a legal answer, not just an engineering one. **Needs Christian's
explicit sign-off on the cost model and the minors/POPIA approach before any code is written** — per the original
instruction, nothing here has been implemented.
