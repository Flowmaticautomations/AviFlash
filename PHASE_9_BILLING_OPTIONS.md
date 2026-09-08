# AV Flash — Phase 9 Billing/Subscription Options (decision document only)

**Status: planning only. Nothing in this document has been implemented.** No
billing code, no payment SDK, no new dependency, no live product/price, no
Play Console change, and no Supabase schema change happened to produce this —
the only Supabase access used was a **read-only** check of the existing
`subscriptions` table (see §1). This exists so Peet and Christian have one
place to make the actual call; it does not make the call for them.

## 1. What's already built (context, not new work)

`subscriptions` (Phase 2, live on the `Aviflash` project — confirmed by
reading the schema today, not from memory):

| Column | Type | Notes |
|---|---|---|
| `status` | text, `CHECK` | `'trialing' \| 'active' \| 'past_due' \| 'cancelled' \| 'expired'` |
| `trial_started_at` / `trial_ends_at` | timestamptz | 7-day trial, set automatically on signup |
| `paid_until` | timestamptz, nullable | app reads this + `status` to decide access |
| `payment_provider` | text, nullable, `CHECK` | **currently only allows `'google_play'` or `'payfast'`** — any other provider (Yoco, Stripe, or a manual/no-provider path) needs a one-line `CHECK` constraint migration to add itself as an allowed value; not done here |
| `data_deletion_scheduled_at` | timestamptz, nullable | set automatically, purge job not built yet (separate, older TODO item) |

The app's own access gate (`computeAccess()` in `lib/auth.tsx`) is a pure
function of `status`/`trial_ends_at`/`paid_until` already read from this
table — it does not care *how* those fields got set. That matters below: the
cheapest options don't need to touch this function at all, they just need
something to write correct values into it.

## 2. Options compared

### A. Google Play Billing

The only option Google's own Payments policy allows for unlocking in-app
content/subscriptions *inside* an app distributed on the Play Store (checked
directly against the current policy on 2026-09-07 — see
`TODO_DECISIONS.md` item 6). Flat 15% service fee at every revenue tier.

**Pros:** the only fully policy-compliant in-app path; Google handles
receipts, renewals, grace periods, refunds, and store-level trust; users
already have a payment method on file with Google.
**Cons:** real implementation work — Play Billing Library (or RevenueCat on
top of it) in the app, plus a **server-side receipt-verification step**
(a Supabase Edge Function calling Google's Developer API — the client can't
be trusted to just say "I paid"), a signing keystore, and — practically — a
live Play Console listing to test against at all, which doesn't exist yet
(Phase 12 hasn't started). Android-only. 15% fee regardless of amount.
Doesn't natively feel like a South African rand price to a student (Google
handles currency display, but it's still USD-denominated pricing under the
hood unless configured carefully).

### B. PayFast (in-app)

South African gateway, ZAR-native, EFT/card/SnapScan support, well known to
SA users and likely what the commercial Agreement draft assumed (see
`TODO_DECISIONS.md` item 6).

**Pros:** local currency, local trust, no USD conversion confusion, no 15%
platform cut (PayFast's own fees are lower and transaction-based).
**Cons:** **using PayFast as the primary way to unlock in-app subscription
content, from inside the Android app, is very likely a Play Store policy
violation** — already flagged, not new information. This isn't a minor risk
to route around later; it's the reason this whole item has been sitting as
an open decision since Phase 2.

### B2. PayFast (web-based purchase, outside the app)

The same PayFast integration, but the actual "pay" button lives on a website
(e.g. a simple Flowmatic-hosted checkout page), not inside the Android app.
The app itself only ever *reads* `subscriptions.status`/`paid_until` — it
never initiates or displays a purchase flow.

**Pros:** keeps ZAR/PayFast, sidesteps the in-app-billing policy entirely
(Google's restriction is specifically about purchases initiated *inside* the
app for content the app unlocks — a separate web purchase path is the
explicitly-allowed exception their own policy names, per the note already in
`TODO_DECISIONS.md` item 6).
**Cons:** materially more scope than a plain payment integration — needs a
real website checkout page, a webhook receiver that writes back into
`subscriptions` (another small Supabase Edge Function or similar), and a way
for a student to get from "app says locked" to "website" and back. Not
nothing, but smaller than building a full receipt-verification pipeline for
Play Billing.

### C. Yoco (in-app or web)

Another South African gateway (well known for in-person/card-present, but
also has online payment links/API). Same shape as PayFast: **in-app-as-the-
unlock-mechanism carries the same Play Store policy risk as PayFast**, for
the same reason (it's about *where the purchase happens*, not which SA
gateway is used). A web-based Yoco checkout would carry the same pros/cons as
PayFast's web option (B2), just a different gateway. Not otherwise
researched further here since it doesn't change the underlying policy
question — flagging it exists, not recommending between it and PayFast.

### D. Stripe

International gateway, mature subscriptions product (Stripe Billing),
strong docs and webhook model. **South African merchant-account eligibility
was not verified for this document** — worth an explicit direct check before
relying on it, in keeping with this project's own standing practice of
checking current provider/policy facts rather than assuming from training
data (see how the Play payments-policy question itself was handled in
`TODO_DECISIONS.md` item 6). Same in-app-vs-web policy split as PayFast/Yoco
applies if it were ever used to unlock content from inside the app.
**Not recommended to investigate further right now** — no clear advantage
over PayFast/Yoco for a South African, Rand-pricing, mostly-local userbase,
and it adds a second currency-conversion/compliance question on top of the
Play Store one.

### E. Manual / admin activation (no live payment processor)

No payment SDK, no gateway, no webhook. A student pays Peet/Christian through
whatever channel already exists outside the app (bank transfer, an existing
invoice, cash, anything) — Peet or Christian then sets `status = 'active'`
and `paid_until` for that user directly (a small internal admin screen, or
even a one-off SQL update in the interim). `payment_provider` stays `NULL`,
which the existing `CHECK` constraint already allows — **zero schema change
needed**, unlike every provider option above.

**Pros:** zero Play Store policy exposure (there is no in-app purchase flow
at all, so the restriction that trips up B/C/D simply doesn't apply); zero
new dependencies; zero PCI/payment-integration surface; can start today,
before Phase 12/Play Store even exists; fully reversible; matches where the
product actually is right now (pre-launch, no live users, provider decision
still open per `TODO_DECISIONS.md` item 6).
**Cons:** doesn't scale — real manual work per student; no self-serve
signup-to-paid conversion; delays and complicates revenue reconciliation
once there's real volume; not a long-term answer, just a bridge.

## 3. Recommendation: **manual/admin activation as the safest MVP**, Google
Play Billing as the real long-term answer

Given where AV Flash actually is right now — no Play Store listing yet
(Phase 12 hasn't started), the payment-provider question still explicitly
open between Christian and Peet (`TODO_DECISIONS.md` item 6), and the POPIA/
minor-consent review also still open (item 7, which plausibly touches
payment/guardian-consent flows for under-18 users too) — **manual/admin
activation is the safest thing to build first**, not because it's the best
long-term billing model, but because:

1. It carries **none** of the Play Store in-app-billing policy risk that
   PayFast, Yoco, and Stripe all share the moment they're used *inside* the
   app to unlock content.
2. It needs **zero schema change** — `payment_provider = NULL` is already a
   valid value under the current `CHECK` constraint.
3. It lets Peet start signing up and billing real students **before** the
   Play Store listing exists at all, which every in-app option is blocked on
   anyway (can't finish Play Billing integration without a live Console
   listing to test against).
4. It's genuinely temporary and doesn't foreclose anything — moving to
   Google Play Billing later is additive (new library, new Edge Function,
   new `payment_provider` value already allowed by the schema), not a
   rework of anything manual activation would have touched.

**For the real long-term model once there's a live Play Store listing and
real volume:** Google Play Billing is the only option that doesn't carry
Play Store policy risk for an in-app purchase flow. If Christian/Peet want
to keep ZAR-native local payment methods (PayFast or Yoco) as the primary
experience, the policy-safe way to do that is **B2 — a web-based checkout
outside the app**, not an in-app PayFast/Yoco flow. That's a real product
decision (it changes the user's purchase experience, not just the backend)
and isn't decided here.

**Not decided by this document, on purpose:** whether to go straight to
Google Play Billing after the manual-activation bridge, or add a web-based
PayFast/Yoco checkout instead/alongside — that's the commercial-paperwork
question in `TODO_DECISIONS.md` item 6, still Christian and Peet's call.

## 4. What Phase 9 build work would actually involve, once a path is chosen

Not started, listed only so the next phase has a concrete starting point:

- **Manual/admin activation:** a small internal screen (or reuse Supabase's
  own dashboard table editor initially) to set `status`/`paid_until` for a
  given user; optionally a lightweight "request activation" flow in the app
  so a student can signal they've paid rather than Peet checking manually.
- **Google Play Billing (later):** Play Billing Library integration, a
  Supabase Edge Function using a Google service-account to verify purchase
  tokens server-side (the client can never be trusted to self-report "paid"),
  a `payment_provider = 'google_play'` write-path, and — first — an actual
  Play Console listing to test against (Phase 12 territory).
- **Web-based PayFast/Yoco checkout (if chosen instead of/alongside Play
  Billing):** a hosted checkout page, a webhook receiver Edge Function that
  writes `subscriptions` on successful payment, and an in-app "manage
  subscription" link that sends the student to that page.

## 5. Phase 8 — real-device test still needed

Not new information, just repeating it here since it's the other open item
from the last pass: **the actual `expo-image-picker` gallery tap-through
(permission prompt, multi-select, and `expo-image-manipulator` compressing a
real multi-MB camera photo) still needs a real Android device or emulator.**
Everything else about Phase 8 — upload, storage, the max-3 trigger, signed-URL
display, and the failure-cleanup branch — has been verified against the live
`Aviflash` project, including through the real app functions, not just
manual REST calls (see `BUILD_LOG.md`'s "Phase 8 follow-up" entry). This is
the one concrete task list item that only a physical/emulated Android device
can close.
