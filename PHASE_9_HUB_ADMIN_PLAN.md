# AV Flash — Phase 9 Steps C/D/E, revised: admin tooling lives in Flowmatic Hub

**2026-09-07. Planning only — no Hub code written, no Hub file changed.**
Per Christian's decision, C and E move from "a screen inside the AV Flash
mobile app" to "a new admin feature inside Flowmatic Hub." Before writing
any Hub code, this document does the reconnaissance that plan should have
been grounded in, and lays out the concrete design — because Hub turned out
to be a materially different kind of system than assumed, with one real
architectural conflict that needs Christian's explicit sign-off before
anything is built (§3).

## 1. Status of D (the Supabase-side migration) — done, separate from this doc

**Applied and verified this pass, against the `Aviflash` project only:**
- `subscriptions_payment_provider_check` now allows an explicit `'manual'`
  value alongside `'google_play'`/`'payfast'`.
- A `public.is_admin()` `SECURITY DEFINER` helper plus three RLS policies
  (`profiles_select_admin`, `subscriptions_select_admin`,
  `subscriptions_update_admin`), scoped to `profiles.role = 'admin'`.
- **Empirically verified**, not just applied: a throwaway non-admin test
  account was confirmed unable to read or write another user's
  `profiles`/`subscriptions` row (RLS silently returns/affects zero rows); a
  throwaway admin-role test account was confirmed able to read another
  user's profile and subscription, and to update it (`status`, `paid_until`,
  `payment_provider = 'manual'` — proving the new `CHECK` value too). A
  second migration closed one advisor finding from the first (`is_admin()`
  was auto-granted `EXECUTE` to the anonymous role by Supabase's own default
  behavior on function creation — revoked explicitly, matching exactly the
  gotcha Phase 2's own hardening pass hit for its trigger functions). Both
  test accounts and all their data deleted afterward; 0 rows remain.

**What this migration is actually for, now that the plan changed:** it
still stands and is correct — but see §4 below. It was designed for the
*original* plan (an admin screen inside the AV Flash app, using the admin's
own Supabase Auth session). Now that the admin screen lives in Hub instead,
Hub's backend won't have a Supabase Auth session to present — so this RLS
path likely isn't the one Hub's integration actually uses. Not wasted work
(cheap, safe, already verified, and still relevant if AV Flash's own app
ever gets an in-app admin surface later), but its role in the *Hub* design
needs to be stated precisely, not assumed.

## 2. What Flowmatic Hub actually is — corrected assumptions

Before this pass, nothing in this AV Flash work stream had ever looked at
Hub's actual code. Read-only reconnaissance (no files changed) found it's a
different kind of system than a typical "add an admin page" task would
assume:

- **It's a Windows Electron desktop app, not a website.** Auto-updating
  native app (`electron-builder`, NSIS installer), not a browser app with
  routes/pages. "Screens" are one giant `index.html` with 60 `<div
  class="page">` sections toggled by JS — there's no per-page file to add.
- **Its backend is a single hand-rolled Node HTTP server** talking to one
  Postgres database via a generic table-proxy API — not a framework, not
  Supabase.
- **Auth is Hub's own custom system** (scrypt password hashing, its own
  sessions, role-based access), entirely separate from Supabase Auth. A Hub
  login has nothing to do with an AV Flash/Aviflash Supabase account.
- **Deploy is manual and heavyweight**: SSH/SCP to one VPS, a guarded
  5-step PowerShell runbook (preflight → backup → migrate → redeploy
  backend container → build and publish a new installer that auto-updates
  real users' desktop apps). Not a "merge and it's live" flow — every Hub
  change has real weight.
- **Multiple people/workstreams are already active in this exact repo** —
  local checkouts exist for a security audit dated *today*, a WOOF
  client-specific stage, a sales-proposal UI, and others. This isn't
  AV Flash's quiet, single-lane project.

## 3. The real conflict: Hub deliberately retired Supabase

This is the one finding that needs Christian's explicit answer before any
Hub code is written, not something to route around quietly:

**Hub has an enforced regression test, `test/stage13-supabase-retired.test.js`,
that asserts Hub does *not* depend on `@supabase/supabase-js` and does *not*
contain hardcoded Supabase URLs or key prefixes anywhere in `src/`/`backend/`.**
This was a deliberate prior decision (the test's own name says so), not an
accident. It has exactly **one** tracked exception today: a read-only health
check against a different, unrelated Supabase project (ResiDesk) on Hub's
System Health admin screen — documented in-code as "audit finding B7," a
conscious, narrow, tracked carve-out.

Adding AV Flash's Aviflash Supabase project as a second integration is
exactly the shape of thing that test exists to catch. **This needs Christian
to explicitly confirm he wants a second, deliberate exception here** — the
same way the ResiDesk one was consciously made and documented — rather than
this plan assuming it's fine because the business reason (admin activation)
is obviously legitimate. The technical path is straightforward either way
(§4); the open question is whether Hub's own architecture rule gets a
second carve-out or gets revisited.

## 4. The actual integration design (once §3 is confirmed)

**Key architectural correction from the original AV-Flash-app-side plan:**
Hub's backend has no Supabase Auth session — it's not "a logged-in AV Flash
user," it's a separate Node server. So the RLS/`is_admin()` path built in §1
(which assumes a real Supabase Auth JWT belonging to an admin-role user) is
**not** the mechanism Hub would actually use. The correct pattern for one
backend service reaching another is a **service-role key**, which bypasses
RLS entirely by design — Hub's backend authenticates as "the service," not
as "a particular admin user."

Concretely, following patterns Hub's own codebase already uses elsewhere
(cited in §2's recon, not invented):

1. **Store the Aviflash service_role key in Hub's existing `vault_entries`
   table** — the same AES-256-GCM-encrypted, admin-only-readable mechanism
   Hub already uses for credentials, and the pattern a very recent Hub
   planning document explicitly recommends for *new* third-party API keys
   ("no provider's key should get a weaker storage pattern than another's
   because it's new"). Not a `.env` file, not a hardcoded string, not
   Hub's weaker plaintext `settings`-table pattern used for old Claude keys.
2. **A small, dedicated `fetch()`-based helper in Hub's main process**
   (mirroring how Hub already calls the Anthropic API and the ResiDesk
   health check — plain `fetch()`, not an SDK) that reads the key out of the
   vault at call time and talks directly to Aviflash's PostgREST endpoints
   (`GET/PATCH https://vpmijgumroflnkcvxwpv.supabase.co/rest/v1/subscriptions`),
   using `Authorization: Bearer <service_role_key>` — this bypasses RLS
   entirely (service_role always does), so **Hub's own access control,
   not Aviflash's RLS, is what actually protects this** (next point).
3. **New Hub-only IPC channels**, following the exact existing pattern for
   WOOF/GS-style single-tenant feature areas: something like
   `hub-avflash-lookup-subscription` / `hub-avflash-update-subscription`,
   added to Hub's admin-gated channel set.
4. **A new, narrower gate than "admin role"**: Hub's existing role system
   (`admin`/`staff`/`marketing`/`sales_partner`) has no per-individual-user
   allowlist anywhere — "Christian and Peet, specifically, and no one else
   with the `admin` role" doesn't map onto anything that exists today. The
   closest precedent is `sales_partner`, which was scoped to one named
   person. **This plan proposes the same approach**: a small, explicit
   allowlist (by Hub username or user id) checked alongside/instead of a
   blanket `role === 'admin'` check, so a Hub change that grants `admin` to
   someone else in the future doesn't silently also grant them AV Flash
   billing control.
5. **A new screen**, structurally modeled on Hub's existing "Passwords" page
   (§2's recon) — the closest existing analog to "look up one record, take
   one of a few actions on it": search a student (by email, since that's
   what Hub's own operators would actually have), show
   `status`/`trial_ends_at`/`paid_until`/`payment_provider`, and three
   actions (activate/renew: set `status='active'`, `paid_until`,
   `payment_provider='manual'`; cancel: set `status='cancelled'`).

**What §1's RLS migration is for in this design:** effectively insurance,
not the live mechanism. It doesn't block anything by existing unused, and
it's the right thing to already have in place if AV Flash's own mobile app
ever grows its own in-app admin screen later (the originally-planned Path 2)
— but Hub's integration, as designed above, doesn't exercise it. Worth
saying plainly rather than implying it does more than it does.

## 5. Safe build sequence for the Hub side

Nothing below is built yet. In order:

1. **Christian confirms §3** — a deliberate, documented Supabase exception
   in Hub, or a different approach entirely (e.g. a tiny secondary REST
   proxy AV Flash's own Supabase-backed API exposes to Hub, keeping Hub
   itself Supabase-free — not designed here, just naming it as the
   alternative if §3 comes back "no").
2. **Add the Aviflash service_role key to `vault_entries`** (a data change
   on the Hub Postgres DB via Hub's own admin UI once it exists — not a code
   change, and not something to do before step 1's answer).
3. **Write the `fetch()`-based Aviflash client helper** in Hub's main
   process — small, isolated, easy to review and test independently before
   wiring any UI to it.
4. **Add the two new admin-only IPC channels** plus the named-person
   allowlist from §4.4.
5. **Add the new "AV Flash" admin page**, modeled on the Passwords page.
6. **Update/extend `test/stage13-supabase-retired.test.js`** with a
   deliberate, documented exception for this integration — exactly like the
   ResiDesk one — so the regression test still catches an *accidental*
   future Supabase dependency without permanently blocking this intentional
   one.
7. **Full manual test pass** against the real `Aviflash` project (throwaway
   test accounts, same discipline as every AV Flash phase), then the real
   Hub deploy runbook (preflight → backup → migrate → redeploy backend →
   build/publish installer) — a real production deploy, not a quiet merge,
   so it needs its own explicit go-ahead when the time comes.

## 6. What Christian/Peet need to answer before step 2 of §5 starts

1. **§3 — is a second Supabase exception in Hub acceptable**, or should
   AV Flash's admin data be reached a different way that keeps Hub's
   Supabase-free rule intact?
2. **Confirm the vault + service-role-key approach** (§4) rather than trying
   to give Christian/Peet individual Aviflash Supabase logins — the former
   is the pattern Hub's own codebase already recommends for new integrations
   and doesn't require managing a second set of real user credentials.
3. **Confirm the named-person-allowlist approach** for gating access (§4.4)
   — this is new code either way (nothing like it exists in Hub today), so
   it's worth agreeing the shape before it's built, not after.
4. **Which two Hub accounts** — Christian's and Peet's existing Hub logins,
   or new ones created specifically for this?

## 7. Confirmation

No Hub file was created, edited, or deployed. All reconnaissance in §2–§4
was read-only. The only real change this pass made was the Supabase-side
migration in §1, against AV Flash's own `Aviflash` project — applied,
verified, and unrelated to Flowmatic Hub. No Play Store activity, no
PayFast/Yoco/Stripe integration, no change to any unrelated AV Flash
feature, no secret was printed or logged anywhere in this document.
