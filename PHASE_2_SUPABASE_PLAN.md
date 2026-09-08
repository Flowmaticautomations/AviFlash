# AV Flash — Phase 2 Supabase Plan (database, auth, RLS, storage)

Status: **applied and verified against the live AV Flash dev project** (`Aviflash`,
ref `vpmijgumroflnkcvxwpv`) on 2026-09-03 — see `BUILD_LOG.md`'s "Phase 2 applied to
the live dev project" entry for the full verification record, including two
corrections found only by testing against the real project (the storage-policy
migration and the audit_logs/subscriptions grants explanation, both noted inline
below where they apply). This document was originally written before that project
existed, as planning + migration files only; it's now the live reference for what's
actually running.

---

## 1. Schema overview

Ten tables, in dependency order (also the order the migration files apply in):

| # | Table | Purpose | Migration file |
|---|---|---|---|
| — | — | shared trigger functions, `pgcrypto` | `20260903121000_extensions_and_helpers.sql` |
| 1 | `profiles` | One row per auth user | `20260903121100_profiles.sql` |
| 2 | `subjects` | User-owned subjects (e.g. "Geography 2026") | `20260903121200_subjects.sql` |
| 3 | `decks` | Card sets, linked to a subject | `20260903121300_decks.sql` |
| 4 | `flashcards` | Question/answer text, linked to a deck | `20260903121400_flashcards.sql` |
| 5 | `card_images` | Up to 3 images per side per flashcard | `20260903121500_card_images.sql` |
| 6 | `review_sessions` | One row per review run | `20260903121600_review_sessions.sql` |
| 7 | `review_answers` | One row per card answered within a session | `20260903121700_review_answers.sql` |
| 8 | `subscriptions` | Trial/paid status, one row per user | `20260903121800_subscriptions.sql` |
| 9 | `support_requests` | User support tickets | `20260903121900_support_requests.sql` |
| 10 | `audit_logs` | Admin/support action trail, safe metadata only | `20260903122000_audit_logs.sql` |
| — | storage | `flashcard-images` private bucket + policies | `20260903122100_storage_card_images.sql` |
| — | hardening | Fix function search_path + revoke unnecessary RPC-EXECUTE on trigger functions (found by Supabase's own security advisor after the first apply) | `20260903122200_security_hardening.sql`, `20260903122300_security_hardening_execute_revoke.sql` |

**One deliberate deviation from the original field list, worth flagging explicitly:**
`profiles` uses `id uuid primary key references auth.users(id)` instead of a separate
`id` + `user_id` pair. Every other table's `user_id` also references `auth.users(id)`
directly (not `profiles.id`) — same value either way since `profiles.id = auth.users.id`
always, but it means every table's ownership check works even if a profile row were
ever missing, and there's only ever one id per user to keep straight. Everything else
matches the field lists from the original build plan and this session's Phase 2
request.

**Two tables added beyond the original bare field list, both because a specific
requirement in this task needs them:**
- `subjects`/`decks`/`review_sessions` etc. all get `created_at`/`updated_at` via one
  shared `set_updated_at()` trigger (rung 6 of "can it be one line" — one function,
  reused everywhere, instead of a bespoke trigger per table).
- `review_sessions.order_mode` (`original`/`shuffled`) — required by "choose review
  order" in the product brief but wasn't in the original bare field list.
- `review_sessions.accuracy_percent` is a **generated column** (`GENERATED ALWAYS AS
  ... STORED`), computed from `correct_count`/`total_cards` — not a value the app
  writes. One source of truth, can't drift out of sync with the counts.

---

## 2. RLS — the actual access rules, table by table

Every table has RLS **enabled**, no exceptions, nothing disabled anywhere.

| Table | Student can... | Student can NOT... | Admin/support access |
|---|---|---|---|
| `profiles` | read + update their own row (not `role`) | read/update anyone else's row, change their own `role` | **None via RLS.** No bypass policy exists. |
| `subjects`, `decks`, `flashcards` | full CRUD on their own rows | touch another user's rows (RLS + the `enforce_same_owner` trigger double-checks parent ownership on every insert/update) | **None.** |
| `card_images` | select/insert/delete on their own rows (no update — replace via delete+insert) | exceed 3 images per side (DB trigger hard-stops the 4th insert) | **None.** |
| `review_sessions`, `review_answers` | insert/select (+ update on `review_sessions` only, to record progress/completion) their own rows | see anyone else's review history | **None.** |
| `subscriptions` | **read-only**, own row only | change their own `status`/`paid_until`/`payment_provider` (no client update/insert policy exists at all) | **None via RLS.** Writes happen only via a service-role Edge Function in Phase 9. |
| `support_requests` | insert a request, read their own (status/message/category — **not** `admin_notes`, blocked by column-level `GRANT`, not just RLS) | edit/delete after submitting, read `admin_notes` | Support access is a **Phase 11 build**, via service role, not an RLS bypass on this table. |
| `audit_logs` | **nothing at all** | nothing at all | Service role only (bypasses RLS by design — see the file's own comment) |

**Correction after applying to the real dev project (2026-09-03):** the paragraph
below originally claimed `audit_logs` has "no GRANT to anon/authenticated" as part
of what locks it down. That's **not true on a real Supabase project** — Supabase's
own project-level default privileges grant `anon`/`authenticated` full
SELECT/INSERT/UPDATE/DELETE on every new `public` schema table automatically,
`audit_logs` included, regardless of what this migration set grants explicitly.
What actually locks `audit_logs` down is RLS alone: enabled, zero policies, which
Postgres treats as deny-all for every command and every role, no matter what the
table-level GRANT says. This was verified empirically against the live project,
not just reasoned about — see `BUILD_LOG.md`'s Phase 2 apply entry for the exact
test. Functionally the table was never open; the sentence below describing *why*
was wrong and is corrected here.

**Why there is no "admin can read everything" policy anywhere:** the task said "admin
access is planned carefully and not open by default," and the original Build
Specification says the same about private flashcard content. The safest way to honor
that in Phase 2 is to add **zero** admin-bypass RLS policies at all right now — an
admin/support surface, when it's built (Phase 11), reads through a service-role-backed
Edge Function that can log to `audit_logs`, rather than the mobile app's `authenticated`
role ever being able to see another user's rows. If a future phase decides admins
genuinely need read access to something via the app itself, that's a new, deliberate
policy to add then — not a default to fall back into now.

**Grants, not just policies:** the Build Specification is explicit that "a policy alone
does not replace correct grants," so every migration file pairs its RLS policies with
matching `GRANT`/column-level `GRANT` statements — see `support_requests` and
`profiles` in particular, where column-level grants hide `admin_notes` and `role` from
the client even though the row itself is readable.

---

## 3. Storage plan

- **Bucket:** `flashcard-images`, created `public = false` (private).
- **Folder structure:** `flashcard-images/{user_id}/{flashcard_id}/{side}-{sort_order}-{uuid}.{ext}`
  — the leading `{user_id}` segment is what the storage policies check against
  `auth.uid()`.
- **Policies:** select/insert/delete only on objects whose first path segment matches
  the caller's `auth.uid()`. No update policy (replace = delete + re-upload).
- **Max 3 images per side:** enforced in the database by `card_images`' insert
  trigger, not in storage — storage doesn't know about the `card_images` table. The
  app should still stop the user at 3 in the UI, and if a `card_images` insert is
  rejected as the 4th image, the app is responsible for deleting the now-orphaned
  object it just uploaded to storage.
- **Compression:** stays an app-side concern (Phase 5), nothing to configure in
  Supabase for it.
- **Not built in Phase 2, on purpose:** the second, public read-only asset bucket for
  tutorial images/brand assets mentioned in the original Build Spec — not needed until
  Phase 8/10 content exists, so it isn't created yet (avoids an empty bucket nobody
  uses).

---

## 4. Auth plan

Most of this is Supabase Dashboard configuration (Authentication → Providers /
Email templates), not SQL — noted here so it isn't lost, and actioned when the
project exists.

- **Email/password:** enable the built-in Email provider. Recommend turning **"Confirm
  email" ON** — require verification before first login. Trade-off: one extra step
  for the student, but avoids fake/typo'd emails holding a 7-day trial hostage.
- **Forgot password:** `supabase.auth.resetPasswordForEmail()` + a deep link back into
  the app. `app.json` already has `"scheme": "aviflash"` from Phase 1 so the deep link
  target exists; the actual reset screen is Phase 3 UI, not built yet.
- **Google sign-in:** explicitly **Phase 3**, not configured now. When it is: needs a
  Google Cloud OAuth client, the Android SHA-1 fingerprint registered, and the
  provider enabled in Supabase. `profiles.profile_completed` (added in this phase's
  schema) is what a Google-sign-in user's post-signup flow checks — `handle_new_user`
  gives them a `profiles` row with just `email` and `profile_completed = false`, so
  the app can route them to a "complete your profile" screen before the dashboard,
  per the original spec.
- **Session persistence:** already wired in Phase 1 (`lib/supabase.ts` uses
  `AsyncStorage` + `persistSession: true`, `autoRefreshToken: true`). Nothing new
  needed here.

---

## 5. Trial / subscription structure

- New user → `handle_new_user` trigger fires on `auth.users` insert → creates
  `subscriptions` row: `status = 'trialing'`, `trial_started_at = now()`,
  `trial_ends_at = now() + 7 days`. No permanent free plan exists anywhere in this
  schema — every user starts in `trialing`, and `status` only ever moves to `active`,
  `past_due`, `cancelled`, or `expired`.
- **Locking the app when the trial/subscription lapses is an app-layer check, not a
  database one:** the app reads its own `subscriptions` row (`status`, `trial_ends_at`,
  `paid_until`) at startup/foreground and shows the paywall if trial has passed with no
  active paid status. Nothing in the DB actively "locks" anyone out — RLS still lets a
  `trialing`-turned-`expired` user read their own subjects/decks (so they don't lose
  access to *view* their data, only the app's own gate blocks *using* it) — worth
  confirming with Christian this is the intended behaviour vs. RLS-level locking, see
  `TODO_DECISIONS.md`.
- **90-day retention after cancellation:** `subscriptions_schedule_deletion` trigger
  sets `data_deletion_scheduled_at = now() + 90 days` the moment `status` becomes
  `cancelled` or `expired`, and clears it if the account becomes active again. **The
  schema tracks the date; nothing in Phase 2 actually deletes anything on that date** —
  a real purge needs a scheduled job (`pg_cron` or a scheduled Edge Function), which is
  deployment/ops work out of scope for "planning only, don't deploy anything." Flagged
  in `TODO_DECISIONS.md` as a Phase 9/11 task.
- **Payment provider not finalized:** `subscriptions.payment_provider` is nullable and
  accepts either `'google_play'` or `'payfast'` — whichever is decided (see
  `TODO_DECISIONS.md` item 6), no schema change will be needed either way.

---

## 6. How Christian applies this once Supabase credentials exist

1. Create the **development** Supabase project (separate from any future production
   project — never test against production).
2. Either:
   - **Supabase CLI** (recommended): `supabase link --project-ref <dev-project-ref>`
     from this folder, then `supabase db push` — the files in `supabase/migrations/`
     already use the CLI's expected `<timestamp>_<name>.sql` naming and will apply in
     the listed order automatically.
   - **Dashboard SQL Editor**: open each file in `supabase/migrations/` in the order
     listed in §1's table and run them one at a time, top to bottom. Stop and fix
     before continuing if any file errors — later files depend on earlier ones.
3. Copy `.env.example` to `.env` in this folder and fill in the **development**
   project's URL and anon (publishable) key only. Never the service-role key — that
   never belongs in the app, in `.env`, or in Git, per Phase 1's rules.
4. Auth dashboard config (§4): enable Email provider, turn on email confirmation,
   check the site URL / deep-link redirect settings match `aviflash://`.

## 7. What to manually check in the Supabase dashboard afterward (can't be verified locally)

- **Table Editor:** all 10 tables exist with the expected columns; `profiles` and
  `subscriptions` rows actually appear automatically after creating one test user
  (proves `handle_new_user` fired).
- **Authentication → Policies:** each table shows RLS **On** with the policy counts
  from §2 — Supabase's dashboard flags any RLS-enabled table with zero policies in
  red, which is *expected and correct* for `audit_logs` specifically (deliberately
  policy-free) but would be a red flag on any other table.
- **Storage → flashcard-images:** bucket exists, is marked private, and the 3 object
  policies are listed.
- **Manual RLS test** (Dashboard SQL Editor → "Run as" a specific user, or two test
  accounts in the app once Phase 3 exists): user A cannot see user B's subjects/decks/
  flashcards/review history/subscription; user A cannot insert a deck under user B's
  subject_id (should fail the `enforce_same_owner` trigger, not just RLS).
- **Card image limit:** manually insert a 4th `card_images` row for the same
  `flashcard_id`/`side` via SQL Editor and confirm it's rejected.
- **Generated column:** confirm `review_sessions.accuracy_percent` cannot be set
  directly via `INSERT ... (accuracy_percent) VALUES (...)` — Postgres should reject
  it since it's a generated column; the app must never attempt to write to it.

---

## 8. SQL validation — now actually run against the live project (2026-09-03)

Originally this section said no local Postgres was available and the SQL had only
been hand-reviewed, not executed. That's since been superseded: all 14 migration
files were applied to the real `Aviflash` dev project via the Supabase MCP, and §7's
checklist was run for real, not just planned:

- All 10 tables exist with the exact columns/constraints/FKs written above.
- RLS is enabled on all 10 (`list_tables` confirms `rls_enabled: true` everywhere).
- Every policy in §2 exists and is scoped to `authenticated` with the right predicate
  (`pg_policies` cross-checked against the table above).
- `subscriptions` and `audit_logs` lockdown was tested **empirically**, in rolled-back
  transactions against real (throwaway) rows — not just read from policy
  definitions — including confirming that `handle_new_user` and
  `subscriptions_schedule_deletion` fire correctly. Full detail in `BUILD_LOG.md`.
- `get_advisors(type: security)` was run twice (before and after a follow-up
  hardening migration) and is clean except the one expected `audit_logs` INFO and
  one pre-existing Supabase platform function this project didn't create.

One thing worth remembering for next time: **grants on a real Supabase project are
not what they'd be on a bare Postgres install** — `anon`/`authenticated` get broad
default privileges automatically. Don't assume "no GRANT statement in the migration"
means "no privilege" the way §2 originally implied for `audit_logs`; RLS policy
presence/absence is the only thing that actually matters, and PostgREST-exposed
`SECURITY DEFINER` functions need their `EXECUTE` privilege revoked explicitly if
they're trigger-only and shouldn't be RPC-callable.
