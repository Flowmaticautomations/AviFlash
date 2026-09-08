# AV Flash — Phase 9 Manual/Admin Activation Plan (planning only)

**Status: planning only. Nothing in this document has been implemented,
applied, or deployed.** No payment processing, no Play Store change, no live
billing product, no Flowmatic Hub access, and — per explicit instruction —
**no migration applied**. Everything under §5 ("schema impact") is a drafted
SQL proposal only; none of it has been run against the live `Aviflash`
project. The only Supabase access used to write this plan was read-only:
`subscriptions`/`profiles` column definitions, `CHECK` constraints, and
`pg_policies` (RLS) on every `public` table, checked directly rather than
assumed from `BUILD_LOG.md`'s memory of Phase 2.

This follows on from `PHASE_9_BILLING_OPTIONS.md`, which compared providers
and recommended manual/admin activation as the safest MVP billing path.
That choice is now treated as decided for this document — the comparison
itself isn't repeated here.

## 1. What "manual/admin activation" actually means here

No student ever enters card details in the app. A student pays Peet/
Christian through whatever channel already exists outside AV Flash (bank
transfer, invoice, cash, WhatsApp arrangement — not this app's concern).
Peet or Christian then marks that student's account as paid by changing
their `subscriptions` row directly. The app never initiates, displays, or
processes a payment — it only ever reads `status`/`trial_ends_at`/
`paid_until` to decide what a student can see, exactly as it does today for
the trial.

## 2. Does the current schema/RLS support this today? — checked, not assumed

**Columns: yes, already sufficient.** `subscriptions.status` (`'trialing' |
'active' | 'past_due' | 'cancelled' | 'expired'`), `paid_until`, and
`payment_provider` (currently `CHECK`-limited to `'google_play' |
'payfast'`, or `NULL`) already cover everything a manually-activated
subscription needs to record, with one small labeling gap (§5.1).

**RLS: no — this is the real gap, confirmed by reading `pg_policies`
directly today, not assumed.** `subscriptions` currently has exactly one
policy: `subscriptions_select_own` (`SELECT`, own row only). **There is no
`INSERT`/`UPDATE`/`DELETE` policy for any authenticated user at all** — by
design, per Phase 2 (only the `handle_new_user` trigger, running as
`SECURITY DEFINER`, is allowed to create a row). `profiles.role` already has
an `'admin'` value in its `CHECK` constraint (`'student' | 'support' |
'admin'`) from Phase 2 — but **it's decorative today: zero policies
anywhere reference it.** No table has an admin-bypass policy.

**Practical consequence:** right now, today, with zero schema changes, the
only way to actually activate someone manually is Peet or Christian using
the **Supabase Studio table editor directly** (they already have project
access — this doesn't touch Flowmatic Hub, it's the `Aviflash` project's own
dashboard) to edit a student's `subscriptions` row. That bypasses RLS
entirely because it runs as the Postgres owner role, not through the app.
**This is a real, complete, zero-code MVP path and can start today** — see
§6. Anything beyond that (a screen inside the app that lets a logged-in
admin do this without opening Supabase Studio) needs the RLS policies
drafted in §5.2 — genuinely a schema change, correctly flagged for §6 rather
than applied.

## 3. States, defined precisely against the actual `computeAccess()` logic

`lib/auth.tsx`'s `computeAccess()` (unchanged, read only — not modified for
this plan) is the single source of truth for what a student can do:

```
if (!subscription) → locked
if (status === 'active') → active                                   (*)
if (status === 'trialing' && trial_ends_at > now) → trial
everything else (past_due, cancelled, expired, or trialing-but-expired) → locked
```

| State | How it's reached (manual model) | App access | Notes |
|---|---|---|---|
| **trialing** | Automatic on signup (`handle_new_user` trigger, unchanged) — `trial_ends_at = now() + 7 days` | `trial` while `trial_ends_at > now`, then automatically `locked` the moment it passes | Already fully working today, no change needed. This is the one state that expires itself correctly without any admin action, because `computeAccess` compares a live date, not a stale flag. |
| **active** | Admin sets `status = 'active'` (and should also set `paid_until` — see the gap below) after receiving manual payment | `active`, unconditionally | **(\*) Real gap, confirmed by reading the code, not assumed:** `computeAccess()` checks `status === 'active'` only — it **never compares `paid_until` to `now()`**. Once admin sets `active`, the student stays unlocked forever unless admin manually comes back and changes the status. `paid_until` is stored correctly but nothing currently *enforces* it. For a manual model this is actually fine **as long as it's an explicit operational habit, not assumed automation** — see §4 and §7. |
| **past_due** | Not really meaningful in a manual model (no automated renewal to fail) — schema keeps it for later, real-gateway use | `locked` (same as everything non-active/non-trial) | Not recommending any admin UI for this state in the manual MVP — nothing manually-billed ever naturally lands here. Leave unused for now. |
| **expired** | Trial ran out with no payment, **or** admin manually sets this once a manually-tracked paid period has ended | `locked` | For manual activation, "expired" vs. "cancelled" is purely a record-keeping distinction for admin (see next row) — `computeAccess()` treats them identically. |
| **cancelled** | Admin manually sets this if a student explicitly stops (asks to cancel, chargeback-equivalent, etc.) rather than simply not renewing | `locked` | Same access result as `expired`. The difference is only meaningful to a human reading the row later ("they lapsed" vs. "they asked to stop") — worth keeping as two distinct values for that reason alone, not because the app treats them differently. |
| **"renewal"** | Not an automated concept in this model. A renewal is just: admin receives another manual payment, extends `paid_until`, and sets `status` back to `'active'` if it had lapsed. | `active` again | No subscription-renewal code exists or is needed for the manual path — it's the exact same admin action as the first activation, repeated. |

## 4. What admin must be able to see and change

**See** (per student, looked up by something the admin actually has — name/
email, since a student won't know their own UUID):
- Identity: name, surname, email (from `profiles` — admin can't currently
  see any profile but their own; see §5.2).
- Current `subscriptions` row: `status`, `trial_ends_at`, `paid_until`,
  `payment_provider`, `created_at`/`updated_at` (so admin can see when it was
  last touched).

**Change:**
- `status` — the four meaningful values above (`trialing` is set
  automatically and shouldn't normally be hand-set back to it).
- `paid_until` — the date the manual payment covers through.
- `payment_provider` — should be explicitly set to a value that records
  "this was manual," not left implying an automated gateway handled it (see
  §5.1's small `CHECK` constraint gap).

**Deliberately not proposed for the MVP:** a full activation history/audit
table. Two or three manual activations a week don't need a dedicated table
yet — `subscriptions.updated_at` plus whatever record-keeping Peet/Christian
already use outside the app (the same "not this app's concern" channel the
payment itself goes through) is enough for now. Worth revisiting once volume
makes "who changed this and when" hard to reconstruct from memory — flagged,
not built.

## 5. Schema impact

### 5.1 Small, low-risk: allow `payment_provider = 'manual'`

Today's `CHECK` constraint only allows `'google_play'` or `'payfast'` (or
`NULL`). Leaving it `NULL` for a manually-activated row works functionally,
but it's indistinguishable from "never set," which is a worse record than
explicitly saying "this was a manual activation." **Drafted, not applied:**

```sql
alter table public.subscriptions drop constraint subscriptions_payment_provider_check;
alter table public.subscriptions add constraint subscriptions_payment_provider_check
  check (payment_provider is null or payment_provider = any (array['google_play','payfast','manual']));
```

### 5.2 Real, needed-for-an-in-app-screen change: admin RLS

Only needed if/when Peet or Christian want to do this from inside the app
rather than the Supabase Studio table editor. Follows the same
`SECURITY DEFINER` helper-function pattern Phase 2 already established for
its trigger functions, rather than a self-referencing policy on `profiles`
(which would recurse against its own RLS). **Drafted, not applied:**

```sql
-- Helper: is the current user an admin? SECURITY DEFINER so it isn't
-- itself subject to the RLS it's used to define.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Let an admin look up any student's profile (needed to find who to activate).
create policy profiles_select_admin on public.profiles
  for select to authenticated
  using (public.is_admin());

-- Let an admin see and update any subscription row.
create policy subscriptions_select_admin on public.subscriptions
  for select to authenticated
  using (public.is_admin());

create policy subscriptions_update_admin on public.subscriptions
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
```

Notes on this draft, not decisions made unilaterally:
- Deliberately **no** `insert`/`delete` policy for admins — creation stays
  the trigger's job, and there's no manual-model reason to ever delete a
  subscription row.
- `is_admin()` reuses exactly the pattern Phase 2's hardening pass already
  applied to its own trigger functions (`EXECUTE` revoked from `public`,
  granted explicitly) — no new pattern introduced.
- Making someone an admin is then just `update profiles set role = 'admin'
  where id = ...` — no separate "admin accounts" system needed, reusing the
  column Phase 2 already created for this.
- **Genuinely a schema change** (two new tables' worth of RLS policy plus
  one function) — correctly not applied per this pass's instructions. Only
  worth applying once an actual in-app admin screen is going to be built;
  applying it earlier just widens the RLS surface for no immediate benefit.

## 6. Two real paths forward, not one

**Path 1 — start today, zero schema change, zero code:** Peet/Christian use
the Supabase Studio table editor on the `Aviflash` project directly to set
`status`/`paid_until` (and, once §5.1 is applied, `payment_provider =
'manual'`) on a student's row after receiving payment through whatever
channel they already use. This is a completely real, working manual-
activation MVP — it's just an operations habit, not a feature to build.

**Path 2 — an in-app admin screen**, once §5.1 and §5.2 are applied (real
migrations — not part of this pass) and the screen itself is built (real
code — also not part of this pass): a route guarded by `profile.role ===
'admin'`, a search-by-email lookup, and a small form to set
`status`/`paid_until`/`payment_provider`. Worth doing once Path 1's manual
Studio-editing becomes a real bottleneck (enough students that going into
Supabase Studio by hand is slow or error-prone) — not before.

Recommendation: **start with Path 1 immediately** (nothing to build), and
only invest in Path 2 once Path 1's volume actually justifies it.

## 7. User-facing flow — what a student sees in each state

All of these screens already exist and are unchanged by this plan — this
section documents current behaviour so it's clear what does and doesn't
need new UI work.

| State | Screen shown | Current wording | Gap worth flagging |
|---|---|---|---|
| Trial active | Dashboard, normal use | "Trial active until {date}" banner (built, Phase 4) | None. |
| Trial expired, never paid | Paywall (`app/paywall.tsx`) | Locked-out screen with a "Subscribe" button that's a **visible placeholder** — no payment flow behind it (correctly, since none should exist yet) | For a genuinely manual model, this button's copy should eventually say something like "Contact us to activate your subscription" with real contact info, instead of implying a self-serve checkout is coming. **Not changed in this pass** (copy-only code change, out of scope for a planning-only task) — flagged for whoever picks up Path 2 or even just a copy tweak ahead of it. |
| Manually activated (`active`) | Dashboard, normal use | Same as trial — dashboard doesn't currently distinguish "on trial" from "paid" beyond the trial banner disappearing | Minor, not a blocker: `paid_until` is stored but never shown anywhere in the UI today. A student who paid has no in-app way to see through when. Worth a small "Active until {date}" banner alongside/replacing the trial one eventually — not built here. |
| Cancelled or expired (after being active) | Paywall — **identical screen and copy to "trial expired"** | Same generic locked screen | `computeAccess()` doesn't distinguish *why* someone is locked, so the UI can't either without a code change. A student whose paid period lapsed sees exactly the same message as one whose trial ran out. Acceptable for MVP; worth revisiting if it causes real support confusion. |

## 8. Risks / blockers

1. **No expiry enforcement on `active` status** (§3) — confirmed by reading
   `computeAccess()`, not assumed. Whoever does manual activation must treat
   "revisit and downgrade lapsed accounts" as a real recurring task, not
   something the system does for them, until/unless that logic is built.
2. **RLS currently blocks any in-app admin action entirely** — confirmed by
   reading `pg_policies`, not assumed. Path 2 needs real migrations (§5.2)
   before any in-app admin screen could work at all, even for someone whose
   `profiles.role` is already `'admin'`.
3. **No audit trail for manual activations** — acceptable at current/
   expected volume, a real limitation if it scales past a handful of
   students without a lightweight log.
4. **Paywall copy still says "Subscribe" with a placeholder button** — not
   misleading today (nothing happens when tapped, no fake payment flow), but
   worth a copy pass before this goes in front of real students, so it
   reflects the actual (manual, contact-us) process rather than implying a
   self-serve one is imminent.
5. **POPIA / minor-consent review is still open** (`TODO_DECISIONS.md`
   item 7) — since AV Flash's users are plausibly minors, who is allowed to
   request/confirm activation on a student's behalf (student vs. parent/
   guardian) is a real question this plan doesn't resolve and shouldn't try
   to — flagged, not decided here.
6. **`payment_provider` schema gap is genuinely tiny** (§5.1) but is a real
   migration nonetheless — not applied in this pass per instruction.

## 9. Implementation sequence (2026-09-07 refinement — still planning only)

Decision confirmed: manual/admin activation is the MVP billing path. Before
any code is written, this section splits the work into five build steps and
puts them in the order that's actually safe to build and test in, which is
**not** simply alphabetical — two of the five steps have nothing to do with
each other and two more are hard-blocked on a migration.

| Step | What it is | Depends on | Needs a migration? |
|---|---|---|---|
| **A** | Fix `computeAccess()` to lock access once `paid_until` has passed, even when `status = 'active'` | Nothing | **No** — `paid_until` already exists (§2) |
| **B** | Rewrite paywall/dashboard copy for manual activation; surface `paid_until`/`trial_ends_at` to the student where relevant | Nothing | **No** — text/UI only, same columns already read today |
| **D** | Draft → review → (once approved) apply the admin RLS migration (§5.2), plus the small `payment_provider` `CHECK` change (§5.1) | Christian/Peet sign-off (see §11) | **Yes — this *is* the migration step** |
| **C** | Admin subscription **read** screen (search a student, view their `status`/`paid_until`/`payment_provider`) | **D must be applied first** — without the admin `SELECT` policies, an admin session gets back nothing (RLS silently returns zero rows, not an error) | No new migration of its own, but functionally dead without D |
| **E** | Admin **activate / renew / cancel** controls (write `status`/`paid_until`/`payment_provider`) | **D must be applied first** (needs the admin `UPDATE` policy) **and** logically follows C (need to find a student before changing their row) | No new migration of its own, but functionally dead without D |

**Actual safe build order: A → B → D → C → E.**

- **A and B are independent of each other and of everything else** — they
  touch different files (`lib/auth.tsx` vs. `app/paywall.tsx`/dashboard),
  don't touch the database at all, and can be built and tested in either
  order, together or separately, starting immediately.
- **D has to land before C or E can do anything real.** Building C or E's UI
  before D is applied would mean shipping screens that compile and render
  but return empty results or silently fail every write — worse than not
  building them yet. D itself splits into: finalize the exact SQL (already
  drafted in §5), get Christian/Peet's sign-off that an admin screen is
  wanted at all (not just Path 1's Supabase-Studio-only approach), apply it
  to the `Aviflash` dev project, then **empirically verify it** the same way
  Phase 2's RLS was verified (a non-admin session correctly denied, an
  admin-role session correctly allowed) — not just "it applied without an
  error."
- **C before E** because E's activate/renew/cancel controls need a way to
  find the right student first — building the write controls before the
  read screen exists would mean testing them blind against hand-typed IDs.

### Which steps require a migration

Only **D**. A and B need zero database changes. C and E need zero *new*
migrations of their own, but are both non-functional until D's policies
exist — so in practice, "migration required" effectively gates C and E too,
even though neither one adds new SQL.

### Which steps can be done before any migration

**A and B only.** Both can be fully built, tested, and shipped while D is
still just drafted text in this document — neither depends on the admin RLS
existing. This is also the highest-value order regardless of admin tooling:
A fixes a real correctness gap (§3/§8.1) and B removes misleading copy
(§8.4) — both matter even if Path 1 (manual Supabase Studio editing, §6)
stays the *only* way admin activation ever happens and C/D/E never get
built at all.

## 10. Test plan

**A — access/expiry logic:**
- Seed a throwaway test subscription with `status = 'active'` and
  `paid_until` in the past → confirm `computeAccess()` now returns `locked`
  and the student is routed to the paywall (regression risk: this touches
  the same function every other phase's login flow depends on).
- Same with `paid_until` in the future → confirm still `active`.
- Regression: re-run the existing trial-active and trial-expired cases
  (`status = 'trialing'`, `trial_ends_at` future/past) to confirm those
  paths are byte-for-byte unchanged.
- `npx tsc --noEmit` / `npx expo-doctor` clean, as every prior phase.

**B — paywall/copy:**
- Visual check of the paywall in three states: trial-expired, manually
  cancelled, manually expired (should read sensibly for all three, given
  §7's finding that they're currently visually identical).
- Visual check of the dashboard/wherever `paid_until` gets surfaced for an
  `active` account.
- No functional/logic assertions needed beyond A's — this step is text and
  layout only.

**D — RLS migration, once applied to the dev project:**
- Same empirical standard Phase 2 set for every other RLS change (see
  `BUILD_LOG.md`'s Phase 2 entry): don't just read the policy definition,
  prove it. As a **non-admin** authenticated test user: confirm `SELECT`
  against another user's `subscriptions`/`profiles` row returns zero rows,
  confirm `UPDATE` against another user's `subscriptions` row is rejected.
  As an **admin-role** test user: confirm both succeed.
- Confirm the `payment_provider` `CHECK` change accepts `'manual'` and
  still rejects anything outside the three allowed values.
- `get_advisors(type: security)` re-run afterward, same as every migration
  pass in this project, to catch anything the manual review missed.

**C — admin read screen:**
- As an admin-role test user: search/look up a throwaway test student by
  email, confirm their real `status`/`paid_until`/`payment_provider` render
  correctly.
- As a **non-admin** test user: confirm the screen is unreachable (route
  guard) and, as a defense-in-depth check, that even a direct query attempt
  still returns nothing (proving the RLS policy is doing the real work, not
  just the UI's route guard).

**E — activate/renew/cancel controls:**
- Activate a trialing test student (set `active` + a future `paid_until` +
  `payment_provider = 'manual'`) → confirm that student's own session
  immediately reflects unlocked access on refresh.
- Renew: extend `paid_until` on an already-active row → confirm no
  disruption to current access.
- Cancel: set `status = 'cancelled'` → confirm that student's session locks
  out on refresh, and confirm the paywall shows B's cancelled-specific
  copy rather than the trial-expired copy.
- Confirm the admin UI itself only ever writes `payment_provider =
  'manual'` (or leaves it as-is) — RLS's `WITH CHECK (public.is_admin())`
  doesn't constrain *which* values an admin writes, only *that* they're an
  admin, so this constraint has to be enforced by the screen's own code,
  not assumed from the policy.
- All test data (student account, subscription changes) cleaned up
  afterward, matching this project's standing test-account discipline.

## 11. What Christian/Peet must approve before code starts

1. **Confirm Path 2 (an in-app admin screen) is actually wanted**, not just
   Path 1 (manual Supabase Studio editing, §6) — D/C/E are meaningful work
   for a feature that might not be needed yet if activation volume stays low
   enough for Path 1 alone.
2. **Sign off on applying D's migration** to the `Aviflash` dev project —
   still not applied, per this pass's instruction, and won't be until
   explicitly approved.
3. **Decide who gets `profiles.role = 'admin'`** — Christian, Peet, both?
   This is a real access-control decision (whoever holds it can read every
   student's profile and subscription, and change any subscription's paid
   status), not something to default silently.
4. **Approve B's actual copy wording** — customer-facing text describing how
   to pay/activate is Peet's product voice to sign off on, not something to
   ship on a first draft.
5. **Confirm the four states' current visual overlap is acceptable for
   launch** (§7: cancelled and expired both show the same screen as
   trial-expired) — or ask for B to differentiate them, which changes B's
   scope slightly.

## 12. Confirmation

No billing code was written, no payment SDK or dependency was added, no live
product/price was created anywhere, the Play Store was not touched, no
migration was applied to the `Aviflash` project (§5's SQL is drafted text in
this file only), and Flowmatic Hub was not accessed at any point. The only
Supabase access this pass performed was read-only schema/RLS inspection.
