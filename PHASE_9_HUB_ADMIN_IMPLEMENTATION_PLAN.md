# AV Flash admin screen in Flowmatic Hub — implementation plan

**2026-09-07. Documentation only — no Flowmatic Hub file has been created,
edited, or deployed to produce this plan.** This refines
`PHASE_9_HUB_ADMIN_PLAN.md`'s reconnaissance into a concrete build plan,
organized around the six things that need to be settled before any Hub code
is written. Citations are to `flowmatic-hub-stage2-fresh`, the up-to-date
git clone of the real `flowmatic-hub-app` repo.

## 1. Where the screen lives in Flowmatic Hub

Hub has no router or per-page files — it's one `src/renderer/index.html`
(1,082 lines) with 60 `<div class="page" id="page-...">` sections shown/
hidden by JS, backed by an Electron main process (`src/main/main.ts`) that
exposes features as IPC channels. Concretely, the new screen means:

- **A new page section**, `<div class="page" id="page-avflash-admin">`,
  added to `index.html`. Structural model: the existing **"Passwords" page**
  (`index.html:1001-1004`) — the closest existing analog to "look up one of
  a handful of records, take one of a few actions on it," backed by its own
  small admin-only IPC set (`hub-vault-*`).
- **A dedicated renderer module**, not more code stuffed into the already
  15,590-line `src/renderer/js/hub.js`. Model: `src/renderer/js/woof.js` and
  `src/renderer/js/fp-tasks.js` — WOOF and Food Planet already get their own
  small, separate files rather than living inline. Proposed:
  `src/renderer/js/avflash-admin.js`.
- **A nav entry** so the two allowlisted people can actually reach it —
  Hub's closest existing pattern is the `<select id="workspaceSelect">`
  workspace switcher (`index.html:121-129`), though a simple sidebar link
  shown/hidden by role would also fit. Whichever it is, **it must be
  presentation-only**: hiding a nav item is not access control (anyone with
  the Electron app's devtools open can trigger any IPC channel by name
  regardless of what's visually shown) — the real gate is §2, enforced in
  the main process, not the renderer.
- **New IPC channels** in `src/main/main.ts`, alongside the existing
  admin-only registrations (`ADMIN_ONLY_IPC_CHANNELS`, `main.ts:178-224`):
  `hub-avflash-lookup-student`, `hub-avflash-activate-subscription`,
  `hub-avflash-cancel-subscription` (see §5 for exactly what each does).
- **The actual Aviflash API calls** live in a new, small, isolated helper —
  not folded into the existing `apiRequest()`/`dbSelect`/`dbInsert`/etc.
  helpers (`main.ts:26-106`), which are hardcoded to Hub's own single
  Postgres-backed API and its `TABLES` allowlist. Model: the existing direct
  `fetch()` calls to the Anthropic API (`main.ts:1823`) and the ResiDesk
  health check (`main.ts:2204`) — plain `fetch()` against Aviflash's
  PostgREST endpoints, not the `@supabase/supabase-js` SDK (see §3 for why
  that specific choice matters here, not just as a style preference).

## 2. How Christian and Peet get access

Hub's role system today is `admin` / `staff` / `marketing` / `sales_partner`
(`main.ts:178-282`) plus a `clientName` regex check for WOOF/Granny Sweets
single-tenant areas (`main.ts:297-298`) — **there is no mechanism anywhere
in Hub to grant a feature to two specific named people** rather than a role.
Granting this to `role === 'admin'` broadly would be wrong: if Hub ever
grants `admin` to a third person later for an unrelated reason, they'd
silently inherit the ability to activate/cancel AV Flash subscriptions too,
which is exactly the kind of access-creep item 6's tests need to catch.

**Proposed pattern**, following the one precedent that already does this —
`sales_partner`, scoped to one specific named person in Hub's own comments
(`main.ts:245-274`) — generalized to two people:

```
const AVFLASH_ADMIN_ALLOWLIST = new Set([
  '<Christian's Hub user id or username>',
  '<Peet's Hub user id or username>',
]);
```

checked inside the same wrapped `ipcMain.handle` gate every other protected
channel already goes through (`main.ts:284-298`), as an additional
requirement alongside (not instead of) requiring a valid session — i.e. even
someone with `role === 'admin'` is rejected unless they're also on this
list.

**Open, unresolved by this plan — needs an answer before this is coded:**
1. Christian's and Peet's **actual Hub usernames or user ids** — not known
   in this conversation, needs to come from Hub's own `users` table or from
   Christian directly.
2. Whether to reuse their **existing** Hub logins or create dedicated new
   ones for this — `PHASE_9_HUB_ADMIN_PLAN.md` §6.4 raised this and it's
   still open.

## 3. Why this needs a deliberate Supabase integration exception

Hub has an enforced regression test, `test/stage13-supabase-retired.test.js`,
asserting Hub has **zero** Supabase dependency: no `@supabase/supabase-js`
in `package.json` (checked directly — confirmed absent), and no
`supabase.co` URL or Supabase key prefix anywhere in `src/`/`backend/`. This
was a deliberate, named prior decision ("Stage 13 — Supabase retired"), not
an accidental gap — this codebase used to depend on Supabase and a
conscious choice was made to remove that dependency entirely.

It already has exactly **one** tracked exception: a read-only health-check
call to a different, unrelated Supabase project (ResiDesk), documented
in-code as "audit finding B7" (`main.ts:2183-2192`) — a narrow, named,
consciously-added carve-out, not a loophole someone found.

**Adding Aviflash as Hub's second Supabase integration is precisely the
shape of change that test exists to catch.** This plan does not treat that
as a formality to route around — it's a real prior architecture decision of
Christian's, and reversing or narrowing it for this one case needs his
explicit, informed yes, the same way B7 was a conscious, documented
decision rather than something that slipped past review. Concretely, what
"deliberate exception" means in practice:

- `test/stage13-supabase-retired.test.js` gets updated to explicitly permit
  **one** new, named exception (the Aviflash `service_role` REST calls in
  the new `avflash-admin` helper), documented with the same kind of comment
  B7 has, referencing this plan.
- The test must still fail if a Supabase reference shows up **anywhere
  else** in the codebase — the point of updating it is to add one named,
  reviewed exception, not to weaken the guarantee for everything else.
- This update happens only after Christian has said yes to this specific,
  scoped exception — not bundled silently into a larger commit.

## 4. What service_role secret is needed and where it should be stored safely

**The Aviflash project's `service_role` key** (Project Settings → API →
`service_role` key, for project ref `vpmijgumroflnkcvxwpv`) — not the
`anon`/publishable key the AV Flash mobile app itself already uses and
ships client-side. This is a fundamentally more powerful, must-never-expose
credential: it bypasses every RLS policy on the project, which is exactly
why it's needed here (Hub's backend has no per-user Supabase Auth session
to present — see `PHASE_9_HUB_ADMIN_PLAN.md` §4) and exactly why it demands
much stricter handling than the anon key.

**Where it goes:** Hub's existing `vault_entries` table — AES-256-GCM
encrypted at rest, admin-only readable via the existing `hub-vault-*` IPC
channels (`main.ts:559-563`). This is the pattern a recent Hub planning
document explicitly recommends for *new* third-party keys going forward
("no provider's key should get a weaker storage pattern than another's
because it's new"), and is a stronger pattern than the plaintext `settings`-
table approach still used for old Claude keys — deliberately not copying
that weaker precedent for a credential this sensitive.

**Explicitly not acceptable for this key:** a `.env` file (Hub has no
`dotenv` dependency or convention for secrets at all), a hardcoded string
anywhere in source, or the plaintext `settings` table.

**Handling once stored:**
- Fetched from the vault, decrypted, and held in memory only for the
  duration of a single `hub-avflash-*` IPC call — never cached longer than
  that, never written to a log.
- Never included in any IPC response sent back to the renderer — only the
  looked-up student's own data (name, email, subscription fields) crosses
  that boundary, never the key itself (this needs its own test — see §6.7).
- **Rotation note, not an action taken now:** if this key is ever suspected
  exposed, it must be rotated from the Aviflash Supabase dashboard directly
  (which immediately invalidates the old value everywhere), and the vault
  entry updated to match. Worth stating as an operational fact for whoever
  manages this later, not something this plan does.

## 5. What actions the screen allows

**View (lookup):** search by student **email** — the real thing a Hub
operator would actually have, not a UUID. Server-side: `GET
.../rest/v1/profiles?email=eq.<input>` to find the user id, then `GET
.../rest/v1/subscriptions?user_id=eq.<id>`, both using the service_role key
(§4). Displayed: name, surname, email, `status`, `trial_ends_at`,
`paid_until`, `payment_provider`, `updated_at`.

**Activate / Renew** — the **same action**, not two separate code paths:
per `PHASE_9_MANUAL_ACTIVATION_PLAN.md` §3, a "renewal" in the manual model
is just admin extending `paid_until` again, whether or not the student was
already active. One form: admin enters/extends a paid-through date → `PATCH
.../rest/v1/subscriptions?user_id=eq.<id>` with `status='active'`,
`paid_until=<entered date>`, `payment_provider='manual'`.

**Cancel:** `PATCH .../rest/v1/subscriptions?user_id=eq.<id>` with
`status='cancelled'`. `paid_until` is deliberately left as-is — it's a
historical record of what was paid for, not something cancellation should
erase.

**Deliberately not included**, matching the reasoning already documented
for the RLS draft (`PHASE_9_MANUAL_ACTIVATION_PLAN.md` §5.2 — "no
insert/delete policy... no manual-model reason to ever delete a
subscription row"): no way to create or delete a `subscriptions` row from
this screen, and no way to touch any table other than `profiles` (read-only
lookup) and `subscriptions`. **This now has to be enforced in the Hub
handler code itself**, not by RLS — the `service_role` key has no RLS
limits at all, so the screen's own code is the only thing standing between
"activate this one student" and "do anything to any table in the project."
This should also get a test (§6).

**UX recommendation, not a hard requirement:** activate and cancel should
both go through a one-tap confirm step before the write fires, matching the
two-step confirm pattern Hub's own Subjects/decks-style archive actions
already use elsewhere in this app's design language.

## 6. Tests required so this doesn't leak access

All of the following are **new** tests, none exist today (the closest
analog, `test/stage13-supabase-retired.test.js`, tests the opposite thing —
absence of Supabase — and needs updating per §3, not reused as-is):

1. **A `staff`-role session** (not `admin`, not on the allowlist) calling
   any `hub-avflash-*` channel → must be rejected.
2. **An `admin`-role session NOT on the two-person allowlist** → must be
   rejected. This is the single most important test in this list: it's the
   one that specifically proves "admin role" and "AV Flash access" are not
   the same thing, so a future unrelated admin promotion doesn't silently
   grant billing control over a different client's product.
3. **A WOOF-scoped or Granny-Sweets-scoped session** (`clientName` matching
   their existing regexes, `main.ts:297-298`) → must be rejected, proving
   no accidental overlap between AV Flash's gate and the existing
   client-specific carve-outs.
4. **Both allowlisted identities** (Christian's, Peet's) → must succeed.
5. **The new channels are absent from every other existing allowlist** —
   `ADMIN_OR_STAFF_IPC_CHANNELS`, `MARKETING_IPC_CHANNELS`,
   `SALES_PARTNER_IPC_CHANNELS` (`main.ts:226-282`) — so a `staff` or
   `marketing` or `sales_partner` session can't reach them by incidental
   inclusion in a broader set.
6. **`test/stage13-supabase-retired.test.js` updated, not weakened**: must
   still fail if a Supabase reference appears anywhere in the codebase
   *other than* the one newly-documented `avflash-admin` exception (and the
   existing ResiDesk one) — proving the guard rail still catches an
   accidental future dependency while permitting this one reviewed case.
7. **The service_role key never appears in an IPC response payload** sent to
   the renderer, across all three `hub-avflash-*` channels — a
   secret-leak test, distinct from the access-leak tests above.
8. **The write actions only ever touch `subscriptions`/`profiles`, never
   any other table** — since `service_role` has no RLS ceiling, this has to
   be proven about the handler code directly (e.g. asserting the exact
   PostgREST URL/table name used in each call), not inferred from database
   permissions.

## 7. Confirmation

No Flowmatic Hub file was created, edited, or deployed to produce this
plan — everything above is written against `flowmatic-hub-stage2-fresh` as
it already exists, cited by file and line. No AV Flash app code, Supabase
project, Play Store listing, or payment provider was touched this pass.
