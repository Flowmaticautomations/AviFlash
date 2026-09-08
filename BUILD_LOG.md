# AV Flash — Build Log

## Phase 1 — Project setup and base structure (2026-09-03)

**Files created/changed:**
- Scaffolded Expo + TypeScript app at `AV Flash/aviflash` (`create-expo-app`, blank-typescript template, Expo SDK 57).
- Installed: `expo-router`, `react-native-safe-area-context`, `react-native-screens`, `expo-linking`, `expo-constants`, `expo-status-bar`, `@supabase/supabase-js`, `@react-native-async-storage/async-storage`, `react-native-url-polyfill`, `expo-secure-store`.
- `app.json` — app name "AV Flash", slug `aviflash`, Android package `za.co.avitus.aviflash`, iOS bundle id `za.co.avitus.aviflash` (id reserved only, iOS not being built per instructions), `userInterfaceStyle: automatic` (system light/dark), icon/splash/adaptive-icon wired to the client logo.
- `assets/icon.png`, `assets/splash-icon.png`, `assets/android-icon-foreground.png`, `assets/favicon.png`, `assets/images/logo.png` — copied from `01 — Clients/ABI FLASH/New Images - 18 Aug 2026/2.png` (the approved "logo image number 2").
- `constants/theme.ts` — blue/red/white palette sampled from the logo, light + dark variants.
- `hooks/useThemeColors.ts` — resolves the active palette from the system color scheme.
- `lib/supabase.ts` — Supabase client, reads `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` from env, throws if missing (no hardcoded keys). **Not imported by any screen yet** — no live Supabase project connected in this phase.
- `.env.example` — documents the two required env var names only, no values. `.env` added to `.gitignore`.
- `app/_layout.tsx` — root `expo-router` Stack, theme-aware background/status bar.
- `app/index.tsx` — splash/welcome screen: logo, "Welcome to AV Flash", tagline, 7-day trial pill, trial CTA (visual only, not wired — registration is Phase 3).
- Removed the template's `App.tsx` / `index.ts`; `package.json` `main` now points to `expo-router/entry`.
- `.claude/launch.json` (project) + root `.claude/launch.json` entry `aviflash-web` — for local preview only, not part of the shipped app.
- Dev-only: `react-native-web`, `react-dom` installed so the screen could be smoke-tested in this environment (no Android SDK/emulator available here). Not used by the Android build.

**Testing done:**
- `npx tsc --noEmit` — clean, no type errors.
- `npx expo-doctor` — 21/21 checks pass (fixed two schema errors along the way: SDK 57 moved top-level `splash` into the `expo-splash-screen` config plugin and dropped `newArchEnabled` as a top-level key).
- Ran via `expo start --web` in the Browser pane (Android emulator not available in this environment): welcome screen renders correctly in both light and dark color scheme, no console errors, no server errors.
- **Not yet tested:** a real Android build/APK on an emulator or device — needs to be done by whoever has Android SDK / an emulator or physical device available before this phase is signed off per the plan's own stop-gate ("APK installs from a clean link... on at least two real Android devices").

**Known follow-ups (not blockers, just noted for later polish):**
- Adaptive icon foreground image is the flat logo, not padded to the Android safe-zone circle — fine for dev builds, worth a proper adaptive-icon export before store submission.
- Trial CTA on the welcome screen is not wired to navigation yet (Phase 3: Register/Login).

## Phase 2 — Supabase schema, auth, RLS and storage plan (2026-09-03)

**Planning only — no live Supabase project connected, nothing deployed.** Per this
phase's instructions: no credentials used, no keys hardcoded, RLS never disabled,
no service-role key anywhere near the app, no Phase 3 screens started.

**Files created:**
- `supabase/migrations/20260903121000_extensions_and_helpers.sql` — `pgcrypto`, the
  shared `set_updated_at()` trigger, and the shared `enforce_same_owner()` trigger
  (parameterized ownership guard reused by every child table below).
- `supabase/migrations/20260903121100_profiles.sql`
- `supabase/migrations/20260903121200_subjects.sql`
- `supabase/migrations/20260903121300_decks.sql`
- `supabase/migrations/20260903121400_flashcards.sql`
- `supabase/migrations/20260903121500_card_images.sql` — includes the max-3-images-
  per-side trigger.
- `supabase/migrations/20260903121600_review_sessions.sql` — `accuracy_percent` is a
  generated column, not app-written.
- `supabase/migrations/20260903121700_review_answers.sql`
- `supabase/migrations/20260903121800_subscriptions.sql` — includes `handle_new_user`
  (auto-creates `profiles` + a 7-day-trial `subscriptions` row for every new
  `auth.users` row) and `subscriptions_schedule_deletion` (90-day post-cancellation
  retention date).
- `supabase/migrations/20260903121900_support_requests.sql` — `admin_notes` hidden
  from the owning user via column-level `GRANT`, not just RLS.
- `supabase/migrations/20260903122000_audit_logs.sql` — RLS enabled, zero policies,
  zero grants to `anon`/`authenticated` on purpose: service-role only.
- `supabase/migrations/20260903122100_storage_card_images.sql` — private
  `flashcard-images` bucket, per-user-folder storage policies.
- `PHASE_2_SUPABASE_PLAN.md` — full plan: schema table, RLS/grant rationale per
  table, storage layout, auth plan, trial/subscription structure, how to apply the
  migrations once credentials exist, and what to manually verify in the dashboard
  afterward.
- `TODO_DECISIONS.md` — updated with what's now unblocked vs. still open.

**Testing/validation done:**
- Every migration file hand-reviewed for balanced parentheses/`$$` blocks (checked
  programmatically — all matched) and correct Postgres/Supabase syntax, and checked
  against the specific requirement it exists to satisfy (see
  `PHASE_2_SUPABASE_PLAN.md` §2's table).
- Confirmed the files apply in a valid dependency order (no table is referenced by
  an earlier file than the one that creates it).
- **Not executed against a real Postgres instance.** No local `psql`/Supabase CLI
  was available; Docker is installed but its daemon wasn't running, and starting the
  full Docker Desktop app just to spin up a one-off throwaway container wasn't worth
  the time for this pass — flagged rather than silently skipped. `PHASE_2_SUPABASE_PLAN.md`
  §7 lists exactly what to check manually in the Supabase dashboard once the dev
  project exists, before Phase 3 builds screens against this schema.

## Phase 2 apply — attempted, blocked (2026-09-03)

Asked to apply the Phase 2 migrations to the AV Flash dev Supabase project. Before
running anything:

1. Re-inspected all 12 files in `supabase/migrations/` — unchanged from Phase 2
   planning, same 12 files, same order.
2. Checked Supabase account access via the Supabase MCP: `list_organizations` and
   `list_projects` return exactly **one** organization ("FLOWMATIC ZA") and **one**
   project in it — `flowmatic hub` (ref `hbvabhfulpzdedwmvego`), the existing,
   unrelated Flowmatic Hub project. **No AV Flash / aviflash project exists under
   this connection.**

**Nothing was applied anywhere.** Confirmed with Christian: the AV Flash dev project
hasn't actually been created yet, and `flowmatic hub` must never be used for AV
Flash data under any circumstance — different client, different app. No SQL was run
against `flowmatic hub`, no `.env` was written (there's nothing real to put in it
yet), and Phase 2 stays as migration files only, exactly as before this attempt.

## Phase 2 applied to the live dev project (2026-09-03)

**Project:** `Aviflash` (ref `vpmijgumroflnkcvxwpv`, org FLOWMATIC ZA), created
2026-09-03, region ap-southeast-2. Confirmed via `list_projects` before touching
anything that the old `flowmatic hub` project no longer appears (Christian removed
it) and that `Aviflash` is a genuinely separate, empty project (`list_tables` /
`list_migrations` both returned empty before applying).

**Applied, in order, via the Supabase MCP `apply_migration`:** all 12 files from
`supabase/migrations/` (20260903121000 through 20260903122100), plus two more
written during this pass:
- `20260903122200_security_hardening.sql`
- `20260903122300_security_hardening_execute_revoke.sql`

**One fix needed mid-apply:** `20260903122100_storage_card_images.sql` originally
contained `alter table storage.objects enable row level security;`, which failed
with `must be owner of table objects` — `storage.objects` is owned by Supabase's
internal `supabase_storage_admin` role and already ships RLS-enabled by default.
Removed that one line (policies don't need it) and re-applied successfully; the
source file now matches what's actually live.

**Verification performed (all against the real dev project):**
1. **All 10 tables exist** — confirmed via `list_tables` (verbose), matching every
   column/constraint/FK from the migration files.
2. **RLS enabled on every table** — `list_tables` reports `rls_enabled: true` for
   all 10, with no exceptions.
3. **User-owned policies active** — `pg_policies` shows exactly the policies each
   migration file defines (e.g. `subjects_select_own` ... `subjects_delete_own`,
   all scoped to role `authenticated`, all keyed on `user_id = auth.uid()` /
   `id = auth.uid()`), and zero admin-bypass policies anywhere.
4. **Subscription status cannot be edited by normal users — verified empirically,
   not just by reading policy definitions.** In a rolled-back test transaction: a
   real `auth.users` row was created (firing `handle_new_user`, confirming that
   trigger works), then, acting as an unrelated `authenticated` session, an
   `UPDATE ... SET status = 'active'` against that user's subscription was run —
   the row's status came back unchanged (`'trialing'`) afterward. A direct
   client-side `INSERT` into `subscriptions` (even by the row's own rightful
   owner) was also tried and correctly rejected: `new row violates row-level
   security policy for table "subscriptions"` — only the `SECURITY DEFINER`
   trigger can create that row.
5. **Audit logs are locked down — verified empirically.** Same technique: seeded
   one `audit_logs` row for a real test user, then queried it back as that exact
   same `authenticated` user — `0` rows visible (there's no SELECT policy at all,
   so not even the row's own actor can see it). A direct `INSERT` as an
   `authenticated` user was also rejected with the same RLS violation error.
6. **`flashcard-images` bucket exists and is private** — `storage.buckets` shows
   `{"id":"flashcard-images","public":false}`.
7. **`.env` written** with exactly `EXPO_PUBLIC_SUPABASE_URL` and
   `EXPO_PUBLIC_SUPABASE_ANON_KEY` (the modern `sb_publishable_...` key, Supabase's
   now-recommended format — the legacy JWT anon key is also available from the
   project if the installed `@supabase/supabase-js` version ever has trouble with
   the new format). **No service-role key was fetched, used, or written anywhere.**
   `.env` confirmed git-ignored (`git check-ignore` passes).

**A real finding worth recording, not just a checklist pass:** the initial grants
check (`information_schema.role_table_grants`) showed `anon`/`authenticated` already
hold full `SELECT/INSERT/UPDATE/DELETE` at the raw SQL grant level on **every**
table, including `subscriptions` and `audit_logs` — this is a Supabase project-level
default privilege, not something these migrations granted. `PHASE_2_SUPABASE_PLAN.md`
originally implied "no GRANT = no access" for `audit_logs`, which is **not actually
how it's locked down** on a real project — it's locked down entirely by RLS (enabled,
zero policies = deny-all for every command, confirmed by the empirical tests above),
not by absent grants. Updated `PHASE_2_SUPABASE_PLAN.md` §2 to describe this
correctly. Functionally nothing was ever open — RLS is Supabase's own enforcement
layer regardless of grants — but the documentation's stated *reason* was wrong and
is now fixed.

**Additional hardening applied beyond the original 12 files**, surfaced by
`get_advisors(type: security)` after the first apply:
- `set_updated_at()` had a mutable `search_path` — fixed (`function_search_path_mutable`).
- The four `SECURITY DEFINER` trigger functions (`enforce_same_owner`,
  `enforce_max_images_per_side`, `handle_new_user`,
  `handle_subscription_status_change`) were directly callable via PostgREST RPC by
  `anon`/`authenticated` (Postgres actually refuses to run a `RETURNS TRIGGER`
  function outside trigger context, so this wasn't exploitable, but the RPC surface
  had no reason to be open). `EXECUTE` revoked from `public`, then — since Supabase
  grants `EXECUTE` on new functions directly to `anon`/`authenticated` too, not just
  via `PUBLIC` — revoked from those two roles explicitly. Confirmed both warning
  classes are gone on a second advisor run.
- Remaining advisor output: the expected `audit_logs` "RLS enabled, no policy" INFO
  (intentional, documented), and a `rls_auto_enable` SECURITY DEFINER warning —
  that function is a **pre-existing Supabase platform function**, not part of any
  AV Flash migration; left untouched.

## Phase 3 — Welcome, registration, login, forgot password, profile completion,
## trial/paywall gate, dashboard placeholder (2026-09-03)

No schema changes — everything Phase 2 built already covered what Phase 3 needed.

**Files created:**
- `lib/database.types.ts` — real generated types from the live `Aviflash` project
  (via the Supabase MCP `generate_typescript_types`), not hand-written.
- `lib/auth.tsx` — `AuthProvider`/`useAuth()`: session, profile, subscription state,
  `computeAccess()` (trial/active/locked), `refreshProfile`/`refreshSubscription`,
  `signOut`.
- `lib/validation.ts` — email/phone/password client-side checks. Password baseline
  is 8+ chars with a letter and a number — Supabase's actual configured policy
  wasn't discoverable via the tools available here (dashboard-only setting), so
  `signUp()`'s own error is always shown too in case the real policy differs; see
  `TODO_DECISIONS.md`.
- `constants/quotes.ts` — a small local placeholder quote list (`getRandomQuote()`).
  The real 300-quote content still doesn't exist (see the standing TODO item) and
  there's no `quotes` table in this schema, so this is local and clearly marked as
  a placeholder, not the real content, in its own comment.
- `components/ui.tsx` — shared `ScreenContainer`, `FormField`, `PrimaryButton`,
  `SecondaryButton`, `LinkText`, `Banner` — used by every Phase 3 screen so styling
  stays consistent with Phase 1's theme without repeating it six times.
- `app/register.tsx`, `app/login.tsx`, `app/forgot-password.tsx`,
  `app/profile-completion.tsx`, `app/paywall.tsx`, `app/dashboard.tsx`.

**Files changed:**
- `lib/supabase.ts` — client is now typed (`createClient<Database>(...)`).
- `app/index.tsx` — welcome screen CTA now navigates to `/register`, added a real
  random quote and a "Log in" link.
- `app/_layout.tsx` — wraps the app in `AuthProvider`; `RootNavigator` runs a
  redirect guard: no session → public routes only; session but
  `profile_completed = false` → `/profile-completion`; profile complete but
  `access === 'locked'` → `/paywall`; otherwise → `/dashboard`. Shows a loading
  spinner while the initial session check is in flight.

**Registration flow, and why it branches:** `signUp()` is called with just
email/password. If Supabase returns a session immediately (email confirmation
disabled), the rest of the form's fields are saved with one `profiles` update and
`profile_completed` is set `true` right away. If no session comes back (email
confirmation required — **confirmed this is the case for the live dev project**,
see below), the form's other fields are **not** preserved — the user re-enters them
on first login via the profile-completion screen, which is exactly the scenario
that screen exists for. Documented as a known trade-off, not silently dropped.

**Testing performed — against the real dev project, not just typecheck:**
- `npx tsc --noEmit` — clean.
- `npx expo-doctor` — 21/21 (also confirms `.env` is being loaded: `env: export
  EXPO_PUBLIC_SUPABASE_ANON_KEY EXPO_PUBLIC_SUPABASE_URL`).
- Exercised the real app in the Browser pane (web target, same caveat as Phase 1 —
  no Android emulator in this environment):
  - Welcome → Register navigation, full form fill, submit — reached the live
    Supabase Auth API for real. First two attempts were rejected server-side:
    `example.com` as a domain ("Email address ... is invalid" — Supabase
    blocklists it) and then, after switching domains, **"email rate limit
    exceeded"** — Supabase's default built-in email sender has a strict send
    rate limit, and this confirms **email confirmation is ON for this project**
    (it was trying to send a confirmation email). Both errors displayed correctly
    in the UI via the `Banner` component — proves the live wiring and error
    surfacing both work; the failures were Supabase's own validation/rate-limit,
    not app bugs.
  - Confirmed via `execute_sql` that none of the failed attempts left a stray
    `auth.users` row — dev DB is clean.
  - Login screen: submitted a well-formed but nonexistent email/wrong password —
    got a real `"Invalid login credentials"` error back from Supabase and
    displayed correctly.
  - Forgot-password screen renders correctly; didn't submit it live (would hit the
    same email rate limit) — needs a manual check once the limit resets.
  - **Route guard verified**: navigating directly to `/dashboard` with no session
    correctly redirected to the welcome screen instead of rendering the dashboard.
  - One tool quirk, not an app bug: ref-based clicks on `Pressable` buttons were
    unreliable in this browser-automation harness (React Native Web's touch
    responder system, most likely) — pixel-coordinate clicks worked every time.
    Noted here so it isn't mistaken for a real interaction bug later.
- **Not tested (needs a real device/manual pass):** the immediate-session branch
  of registration (this project has email confirmation on, so that branch never
  ran here), the actual "check your email" success banner rendering (same reason —
  reused the already-verified `Banner` component, so low risk, but not directly
  observed), completing the confirmation email link and logging in for real,
  the profile-completion screen end-to-end, the paywall screen (needs a real
  account with an expired/locked subscription), and Google sign-in's disabled
  "coming soon" state on an actual Android build (only checked on web).

## Phase 4 — Dashboard, subject management, placeholder screens (2026-09-04)

No schema/auth changes — Phase 4 only added screens and two small hooks on top of
Phase 2/3's existing tables and auth system.

**Files created:**
- `hooks/useSubjects.ts` — fetch (non-archived, own rows via RLS)/create/rename/
  archive for `subjects`.
- `hooks/useActiveSubject.ts` — remembers the last-selected subject per user in
  AsyncStorage (`av-flash:active-subject:{userId}`), not synced to Supabase.
- `app/subjects.tsx` — one screen doing double duty as both the subject picker and
  the management screen: add (name + optional year, e.g. "Geography 2026"), tap a
  row to make it active, inline rename, inline archive-with-warning.
- `app/new-card.tsx`, `app/view-cards.tsx`, `app/review.tsx` — placeholder screens,
  each stating which phase actually builds that feature.
- `app/settings.tsx` — real account-info summary (name/email/phone/grade/country
  from `profiles`), "Manage subjects" link, "Log out". No account deletion (out of
  scope for this phase, as instructed).

**Files changed:**
- `app/dashboard.tsx` — shows the active subject (or "Add your first subject" if
  none exist yet); auto-selects the first subject if none is remembered locally;
  the four tiles now navigate to their real routes instead of being static.

**Design/interpretation notes:**
- "Delete/archive subject with warning" was built as a single **archive** action
  (soft delete: `archived = true`, decks/cards untouched) rather than a real SQL
  delete — matches the original product spec's own stated preference for a
  recoverable archive, and avoids needing to design cascading hard-deletes in a
  phase explicitly scoped to not touch full card management yet.
- The "warning" is an inline confirm step in the row itself (Archive → "Archive
  this subject? [Confirm] [Cancel]"), not a native `Alert.alert()` — React Native
  Web's `Alert` support is unreliable, and this needed to be testable in the
  browser preview per the phase's own instructions.

**Testing performed — against the real dev project, logged in as a real (throwaway)
account, not just typecheck:**
- `npx tsc --noEmit` — clean. `npx expo-doctor` — 21/21.
- Needed a working login to exercise any of Phase 4 (everything's behind the auth
  guard), and Phase 3 left the dev project's own email confirmation + send-rate-limit
  blocking new signups from the UI — so a throwaway test user was created directly
  via SQL (same rolled-back-transaction technique as Phase 2's RLS tests, but
  persisted this time so it could actually log in through the real app, then
  deleted afterward). **One real gotcha hit and fixed along the way:** a
  bare-minimum `auth.users` INSERT isn't enough — GoTrue failed login with
  `"Database error querying schema"` until `confirmation_token`,
  `recovery_token`, `email_change_token_new`, `email_change_token_current`,
  `email_change`, `phone_change`, `phone_change_token`, and
  `reauthentication_token` were explicitly set to `''` instead of left `NULL`
  (they're nullable at the SQL level, but GoTrue's Go code doesn't handle NULL
  there). Worth remembering for any future direct-SQL test-user seeding on this or
  any other Supabase project.
- Full flow exercised end-to-end and confirmed correct: log in → routed to
  profile-completion (profile wasn't complete) → saved → routed to dashboard →
  "no subject" state and "Add your first subject" shown correctly → created
  "Geography" + "2026" → appeared active with a checkmark → confirmed the real row
  in Postgres via SQL → renamed it inline → archived it with the inline warning →
  disappeared from the list, confirmed `archived = true` in Postgres (not deleted)
  → all three placeholder pages render their correct phase-specific text →
  Settings shows the real account summary → Log out → correctly routed back to
  Welcome.
- Test account and all its cascaded rows (`profiles`, `subscriptions`, `subjects`)
  deleted afterward; confirmed zero rows remain for that user id — dev DB is clean.

**Not tested (needs a real device/manual pass):** an actual Android build (web
preview only, same limitation as every phase so far in this environment), and the
paywall screen combined with a real subject list (not touched this phase, per
"don't touch subscription/payment logic unless needed for route protection" — it
wasn't needed).

## Phase 5 — New Card flow: card sets + flashcards (2026-09-04)

No auth/dashboard/subject-system changes, no RLS changes — Phase 5 only added a
new hook and rebuilt two screens on top of the existing `decks`/`flashcards`
tables and their Phase 2 RLS policies.

**Files created:**
- `hooks/useDecks.ts` — fetch (non-archived, scoped to a subject)/create for
  `decks`.

**Files changed:**
- `app/new-card.tsx` — real New Card flow, replacing the Phase 4 placeholder (see
  below for the full flow).
- `app/view-cards.tsx` — placeholder now shows a real read-only list of the active
  subject's card sets (via `useDecks`), still no edit/delete (that's Phase 6).

**Naming:** DB stays `decks`/`flashcards` (unchanged); every user-facing string
says "Card Set", never "deck" — including error/empty-state copy, not just the
main labels.

**New Card flow, as built:**
1. No active subject → clear message + a button straight to `/subjects`, not a
   dead end.
2. With an active subject: existing (non-archived) card sets for it are listed to
   tap into, alongside a "create a new card set" name field. Selecting or creating
   one reveals the card-adding UI and auto-seeds one blank card row.
3. Each card row: question text, a disabled dashed-border "Question image —
   coming in Phase 6" button, answer text, the same for the answer image. "+ Add
   another card" appends more rows; "Remove" (shown once there's more than one
   row) deletes one.
4. Validation: card set name required to create one; every pending card needs
   both question and answer text (images aren't wired up yet, so text is
   mandatory this phase, per the brief) — friendly per-field messages, not a
   single generic error.
5. Save: one bulk `insert` into `flashcards`, `card_order` continuing from
   `count(*)` of whatever's already in that deck (existing-deck continuation is
   real, not just new-deck numbering from 0) — verified below. Success shows a
   banner plus "Add another card" / "Go to View Cards" / "Return to Dashboard".
6. Unsaved-work guard: covers the app's own navigation controls (Cancel/View
   Cards/Dashboard links) with a two-tap confirm — first tap shows a warning
   banner and changes the link text to "Tap again to leave without saving",
   second tap actually navigates. **Deliberately does not** intercept the OS-level
   hardware back button or swipe-back gesture (react-navigation's `beforeRemove`)
   — that's real extra complexity for edge cases the phase's own "if
   simple/reliable" language didn't require chasing; the in-app controls are what
   real usage hits.

**Testing performed — against the real dev project, logged in as a real
(throwaway) account, not just typecheck:**
- `npx tsc --noEmit` — clean. `npx expo-doctor` — 21/21.
- Created a throwaway confirmed test user directly via SQL (same fix from Phase 4:
  the token columns set to `''`), pre-completed its profile via SQL this time to
  skip re-testing Phase 3's flow, created a subject, then exercised the whole
  thing live:
  - New Card with **no** subject selected → correct message + working link to
    Subjects.
  - Created "Chapter 1 — Cells" under Biology 2026 → deck-name-required
    validation fired correctly first, then succeeded.
  - Empty-card validation: tried saving with blank question/answer → got
    "Question text is required." / "Answer text is required." on the exact
    fields, not a generic error.
  - Added a second card row, filled both, saved → success banner "Saved 2 cards
    to Chapter 1 — Cells", **confirmed both rows in Postgres** with
    `card_order` 0 and 1.
  - Left and came back fresh (via Dashboard → New Card, not just staying on the
    same screen) → the existing deck showed up under "Add to an existing card
    set" with the correct running total ("2 card(s) saved so far"); added a third
    card → **confirmed `card_order = 2` in Postgres**, i.e. real continuation of
    an existing deck's order, not just a same-session artifact.
  - View Cards showed "Chapter 1 — Cells" in its read-only list.
  - Unsaved-work guard: typed draft text into a new card, hit "Cancel and return
    to dashboard" → warning banner appeared, link text changed to "Tap again to
    leave without saving"; tapped again → navigated to Dashboard, and **confirmed
    in Postgres that the never-saved draft text was not persisted** (0 matching
    rows).
- Test account and all cascaded rows (`profiles`, `subscriptions`, `subjects`,
  `decks`, `flashcards`) deleted afterward; confirmed zero rows remain for that
  user id.

**Not tested (needs a real device/manual pass):** an actual Android build (web
preview only, same limitation every phase so far), and multi-touch/gesture
back-navigation specifically (the deliberately-not-built OS-level guard above).

## Phase 6 — Full View Cards management (2026-09-04)

No auth/subject-system/dashboard/New-Card *logic* changes, no RLS changes. One
small, explained text fix to New Card (below), plus an additive extension to
`useDecks` (existing consumers unaffected).

**Files created:**
- `hooks/useDeckCards.ts` — fetch (non-archived, ordered)/update/archive for a
  selected deck's `flashcards`.

**Files changed:**
- `hooks/useDecks.ts` — additive: added `cardCounts` (one query for all a
  subject's decks' active card counts, not N+1) and `renameDeck`/`archiveDeck`/
  `moveDeck`. The existing `decks`/`loading`/`refresh`/`createDeck` shape New
  Card already depends on is untouched.
- `app/view-cards.tsx` — full rebuild (was the Phase 5 read-only placeholder).
- `app/new-card.tsx` — **small fix, explained**: the two image-placeholder
  labels said "coming in Phase 6" (written back when View Cards, not images,
  was the next phase). Now that Phase 6 is View Cards and images still aren't
  built, changed both to "coming in Phase 7" — text only, no logic touched.

**View Cards, as built:**
1. No active subject → same pattern as New Card: clear message + a button to
   `/subjects`.
2. Set list: search-by-name field, each row showing the card set's name and a
   live count of its active cards, tap to open.
3. Set detail: "‹ Back to card sets", then Rename / Move / Archive actions for
   the set itself, a second search field (searches this set's question text),
   and every card in the set — scrollable via the screen's existing ScrollView,
   same pattern as every other screen so far.
4. Per card: view (question + answer shown directly), Edit (both fields become
   editable, same "text required" validation as New Card, Save/Cancel), Archive
   (inline two-step confirm using the exact required warning: "Are you sure?
   This will remove it from your active cards.").
5. Rename: inline name field + Save/Cancel, same pattern as `app/subjects.tsx`.
6. Archive (the set): same warning phrase, with an added "Cards inside stay
   saved" — soft delete only (`decks.archived = true`), matching the schema and
   the phase's own "do not permanently delete" instruction; returns to the list
   automatically since the set is no longer there to show.
7. Move: evaluated as "simple and safe" and built (not left as a TODO) — RLS
   plus the Phase 2 `enforce_same_owner` trigger already reject moving a deck to
   a subject that isn't this user's own, so the UI just needs a list of the
   user's *other* subjects to pick from and one `decks.subject_id` update.
8. Image placeholders: same dashed-border disabled style as New Card, now
   correctly labeled "coming in Phase 7" in both places.

**A real bug found and fixed during testing, not left in:** archiving/editing a
card inside a set's detail view left the set's card *count* stale in two
places — the detail header (kept reading `useDecks`' list-level `cardCounts`,
which only that hook's own actions refresh) and the set list itself (same root
cause, surfaced after navigating back). Fixed by (a) using the live
`cards.length` from `useDeckCards` for the detail header instead of the
stale list-level count, and (b) calling `useDecks`' `refresh()` when leaving
the detail view back to the list. Re-tested after the fix — both now update
correctly. Documented here rather than silently patched, since it's the kind
of staleness bug that's easy to reintroduce if Phase 7+ adds more places that
mutate cards without knowing about the set-level count.

**Testing performed — against the real dev project, logged in as a real
(throwaway) account, exercising every item in the phase's own test checklist:**
- `npx tsc --noEmit` — clean (both before and after the staleness fix).
  `npx expo-doctor` — 21/21.
- Created a throwaway confirmed test user via SQL (same token-column fix as
  Phase 4/5), pre-completed its profile.
- **Create subject** — "Chemistry 2026" via the real Subjects UI.
- **Create card set** — "Periodic Table Basics" via New Card; confirmed the
  Phase 7 image-placeholder text change took effect.
- **Add cards** — 2 cards saved (Hydrogen/1, Helium/2).
- **View card set list** — showed "2 cards" against the set.
- **Search** — by set name: "Periodic" matched, "Biology" correctly showed the
  no-match empty state. By question text (inside the set): "Helium" correctly
  filtered to just that one card.
- **Select card set** → detail view showed both cards with Edit/Archive per
  card and Rename/Move/Archive for the set.
- **Edit card** — changed Hydrogen's question/answer text, saved, **confirmed
  the exact new text in Postgres**, with `card_order`/`deck_id`/`user_id`
  unchanged.
- **Archive card** — archived the Helium card; **confirmed
  `archived = true` in Postgres** and that the row still exists (not deleted).
  This is what surfaced the stale-count bug above.
- **Rename card set** — "Periodic Table Basics (Renamed)"; **confirmed in
  Postgres**.
- **Move card set** — created a second subject ("Physics") via SQL, moved the
  set to it through the UI, **confirmed `decks.subject_id` actually changed in
  Postgres**, and confirmed it correctly disappeared from Chemistry's list and
  appeared under Physics after switching the active subject.
- **Archive card set** — archived it from Physics; **confirmed
  `decks.archived = true` in Postgres while both its flashcard rows (one
  archived, one not, from the earlier steps) still exist**, proving cards
  aren't destroyed when their set is archived.
- Test account and all cascaded rows (`profiles`, `subscriptions`, `subjects`,
  `decks`, `flashcards`) deleted afterward; confirmed zero rows remain.

**Not tested (needs a real device/manual pass):** an actual Android build (web
preview only, same limitation every phase so far).

## Phase 7 — Review mode (2026-09-04)

No auth/subjects/New-Card/View-Cards changes, no RLS changes. Reused `useDecks`
and `useDeckCards` from Phase 6 as-is — both already exclude archived decks/cards,
which is exactly what "do not allow review of archived sets/cards" needed.

**Files created:**
- `hooks/useReviewSessions.ts` — `useLastCompletedSession(deckId)` (for the
  "previous accuracy" display) and `saveReviewSession(...)` (one `review_sessions`
  insert + one bulk `review_answers` insert, called once at the end of a
  completed review — no partial/in-progress row is ever written, matching "only
  save completed review sessions as completed").

**Files changed:**
- `app/review.tsx` — full rebuild (was the Phase 4 placeholder), four phases in
  one screen: pick a card set → pick order (original/shuffle, original default)
  + see previous accuracy → the review itself (Card X of Y, question first,
  Show Answer, Correct/Incorrect, running score) → results (total/correct/
  incorrect/accuracy/previous/improvement-or-drop, Review again / Back to
  dashboard).
- `BUILD_LOG.md`, `TODO_DECISIONS.md`.

**Design notes:**
- Shuffle is presentation-only — a Fisher-Yates shuffle of a local copy of the
  cards array when the review starts; `flashcards.card_order` in the database is
  never touched.
- The result screen's "previous accuracy" is a **frozen snapshot** taken the
  moment "Start review" is pressed, not a live re-read — otherwise, once the new
  session saves, "previous" would silently become "this same session" and the
  improvement/drop math would always show 0. The pre-review screen's own display
  *is* live (refreshed right after each save), so "Review again" correctly shows
  the round you just finished as the new previous.
- No previous session → pre-review screen shows "No previous review yet"; result
  screen shows "First completed review for this set!" instead of a misleading
  numeric diff against a non-existent baseline (the phase brief allowed either
  "0% or 'No previous review yet'" for the pre-review case; a real diff against
  an invented 0% felt more misleading than helpful for the results case, so that
  one substitutes a plain sentence instead).
- Mid-review exit guard: same two-tap in-app-only pattern as New Card's
  (Phase 5) — covers "Cancel review", not the hardware back button / swipe
  gesture. Same deliberate scope cut as before, for the same reason (documented
  again in `TODO_DECISIONS.md` rather than assumed obvious).
- Image placeholders during review say "coming in Phase 8" (view-only, matching
  the phase brief's own wording — Phase 6's edit screens and Phase 5's creation
  screen still correctly say Phase 7 for *their* image work, which is a
  different, earlier milestone than Review's own image display).

**A false alarm during testing, worth recording so it isn't mistaken for a real
bug later:** the first login attempt landed on the paywall instead of the
dashboard despite a valid 7-day trial. Verified directly against Postgres (both
via the service connection and, to rule out an RLS problem, as the `authenticated`
role using that exact user's JWT) that the subscription row was completely
correct and fully visible. A hard page reload immediately fixed it. Root cause:
this browser tab had been reused across many prior test logins/logouts spanning
Phases 3–6 in this same session, and had accumulated stale client-side state —
not a bug in `computeAccess()`, the guard, or the schema. Real users starting
from a fresh app install won't hit this; noted here only so a future session
doesn't waste time chasing a phantom access-control bug.

**Testing performed — against the real dev project, logged in as a real
(throwaway) account, exercising every item in the phase's own test checklist:**
- `npx tsc --noEmit` — clean. `npx expo-doctor` — 21/21.
- Created a throwaway confirmed test user via SQL (same token-column fix as
  Phase 4-6). Seeded profile/subject/deck/3 cards directly via SQL this time
  (Phase 5/6 already thoroughly tested those creation UIs) to focus this
  session's live testing on what's actually new: Review mode.
- **Run review, original order**: Card 1 of 3 → question shown, answer
  correctly hidden → Show Answer → answer revealed → marked Correct/Incorrect/
  Correct across the three cards, running score updated correctly each time
  (0/0 → 1/1 → 1/2).
- **Result screen**: Total 3, Correct 2, Incorrect 1, Accuracy 66.67%, Previous
  accuracy "—", "First completed review for this set!" (no baseline yet).
- **Confirmed in Postgres**: `review_sessions` row with `was_completed: true`,
  correct `total_cards`/`correct_count`/`incorrect_count`/`accuracy_percent`
  (generated column matched exactly), `order_mode: 'original'`, a real gap
  between `started_at` and `completed_at` (not the same instant); exactly 3
  `review_answers` rows, each matching the flashcard and correct/incorrect
  marking exactly as clicked.
- **Previous accuracy on next review**: clicked "Review again" — pre-review
  screen correctly now showed "66.67%" instead of "No previous review yet".
- **Shuffle**: selected shuffle order, started a second review — card 2 was a
  different question than card 3 was in the original-order run, confirming
  real reordering, not just a same-order coincidence. Marked all three correct.
- **Improvement calculation**: result screen showed Accuracy 100%, Previous
  66.67%, **Improvement +33.3%** — confirmed in Postgres as two distinct
  `review_sessions` rows (`order_mode` `'original'` and `'shuffled'`
  respectively) with the right accuracy values.
- **Mid-review exit guard**: started a third review, tapped "Cancel review" →
  warning banner + "tap again" text appeared → tapped again → returned to the
  card-set list. **Confirmed in Postgres that no third `review_sessions` row
  was created** — still exactly 2.
- Test account and all cascaded rows (`profiles`, `subscriptions`, `subjects`,
  `decks`, `flashcards`, `review_sessions`, `review_answers`) deleted
  afterward; confirmed zero rows remain for every one of those tables.

**Not tested (needs a real device/manual pass):** an actual Android build (web
preview only, same limitation every phase so far).

## Phase 8 — Image support for flashcards (2026-09-04)

No auth/subjects changes, no RLS changes — used the `flashcard-images` bucket and
`card_images` table exactly as Phase 2 built them (private bucket, per-user folder
path, `select`/`insert`/`delete` RLS, the max-3-per-side DB trigger). New Card,
View Cards and Review were extended (not architecturally rewritten) specifically
because this phase's own brief targets image support in exactly those three
screens — the existing deck-selection, search, rename/move/archive, and review-
flow logic in each is untouched.

**Dependencies added** (both resolved to SDK-57-matched versions via
`npx expo install`, confirming they're stable for this project):
`expo-image-picker` (photo library picker), `expo-image-manipulator` (resize +
JPEG recompression before upload — no extra dependency needed for basic
compression since `expo-image-picker` already supports a `quality` option, but
real dimension resizing needed this package). Both claim web support per their
docs, confirmed here by the dev bundle building without errors.

Before writing any code against them, fetched the current SDK 57 docs for both
packages plus Supabase's own maintained Expo example (`Avatar.tsx`) for the
upload pattern — this repo's own `AGENTS.md` warns the Expo APIs change between
versions, and training-data guesses on `expo-image-picker`'s result shape
(`canceled`/`assets`, not the older `cancelled`/`uri`) or `expo-image-manipulator`'s
now-contextual API (`ImageManipulator.manipulate(uri).resize(...).renderAsync()`,
not the deprecated `manipulateAsync`) would very plausibly have been wrong.
Verified every method/type signature actually used against the installed
package's own `.d.ts` files before relying on it.

**Files created:**
- `lib/imageUpload.ts` — `pickImages()`, `compressImage()` (resize to 1280px max
  dimension + JPEG quality 0.7), `uploadCardImage()` (compress → upload to
  storage → insert `card_images` row; if the DB insert fails — e.g. the max-3
  trigger rejects it — the just-uploaded storage object is removed rather than
  left orphaned), `deleteCardImage()` (DB row deleted first, storage object
  best-effort after — see the file's own comment for why that order, not the
  reverse), `getSignedUrl()` (session-cached signed URLs, since the bucket is
  private and a plain public URL won't render).
- `hooks/useCardImages.ts` — fetches a flashcard's images with resolved signed
  URLs, for View Cards and Review (New Card stages local picker URIs before the
  flashcard even exists, so it doesn't use this hook).
- `components/ImageGallery.tsx` — one shared component, two variants:
  `thumbnails` (View Cards — small inline previews, browsing/management
  context) and `button` (Review — a single "View {label} (N)" tap target and
  nothing else, so images can't clutter the review screen per the brief). Both
  open the same simple scrollable modal for a larger look.

**Files changed:**
- `app/new-card.tsx` — question/answer image pickers per card (up to 3 each,
  staged locally as `{key, uri}` alongside the existing question/answer text
  state), validation changed from "both texts required" to "text OR at least
  one image, per side" (never both required, never fully blank), save flow now
  bulk-inserts the flashcards first (`.select()` to get real ids back), then
  uploads each card's staged images — upload failures are reported in the
  success banner ("N images failed to upload — add them again from View
  Cards") without rolling back the flashcard text that already saved.
- `app/view-cards.tsx` — card rows extracted into their own `CardRow` component
  (needed so each row can call `useCardImages(card.id)` — one hook instance per
  row, which Rules of Hooks doesn't allow inside the parent's `.map()`
  directly). Display mode shows thumbnails for both sides; edit mode adds
  existing-image thumbnails with a remove (×) badge plus an "add image" button
  up to 3 per side, uploading/deleting immediately (the flashcard already
  exists here, unlike New Card). Save-validation moved into `CardRow` itself
  for the same reason as the hook — it needs image counts only that row has.
- `hooks/useDeckCards.ts` — **small fix, explained**: `updateCard` stored empty
  question/answer as `''`; changed to store `null` (via `question || null`) so
  an image-only side reads the same way everywhere in the app, matching how
  New Card already saves one. Column already nullable; no schema change.
- `app/review.tsx` — the current card's images fetched via
  `useCardImages(currentReviewCard?.id ?? null)`, called unconditionally at the
  component's top level (not inside the `phase === 'reviewing'` branch) since
  hooks can't be conditional; images shown as a "View image" button per side,
  answer-side button only appears after "Show Answer" is tapped, matching "keep
  review flow clean."
- `app.json` — added the `expo-image-picker` config plugin with a photo-library
  permission message (required for the native picker to prompt correctly).

**Testing performed — against the real dev project, logged in as a real
(throwaway) account:**
- `npx tsc --noEmit` — clean throughout, including after the `CardRow`
  extraction and the `useDeckCards` fix. `npx expo-doctor` — 21/21.
- **Regression pass first** (New Card/View Cards/Review's validation and JSX
  changed substantially — needed to confirm the existing text-only path still
  works): created a text-only card, saved successfully, confirmed in Postgres;
  tried saving a blank card and got the new "Add question text or at least one
  question image." message (not the old "Question text is required."); viewed
  and reviewed the text-only card end to end with no image buttons showing
  (correct — no images exist for it) and completed a review to 100%.
- **Image pipeline — the actual gallery tap-through can't be automated by this
  session's browser tools (no way to drive an OS-level file picker dialog), so
  this was verified a different way**, worth being precise about: using the
  real logged-in session's own access token from the browser (same technique as
  Phase 7's diagnostic), issued the exact same Storage upload + `card_images`
  insert calls `uploadCardImage()` makes, with a real (tiny, 1×1) JPEG:
  - Upload to `flashcard-images/{userId}/{flashcardId}/question-0-...jpg` → 200,
    `card_images` insert → 201, exactly the path structure the app uses.
  - **Reloaded View Cards and confirmed a real thumbnail rendered** (a solid
    dark square — correct for a 1×1 black test JPEG, not a broken-image icon),
    proving the whole read side (fetch → signed URL → `<Image>`) works, not
    just the write side.
  - Tapped the thumbnail → modal preview opened correctly, titled "Question
    images", with a working Close button.
  - Added 2 more question images (3 total) via the same technique, then
    attempted a 4th — **rejected by the DB trigger** with the exact expected
    message (`"flashcard ... already has 3 question images (the maximum)"`).
    Reloaded the edit view and confirmed the UI correctly showed 3 thumbnails
    and a disabled "Max 3 images" button.
  - Removed one image via the real × button in the app UI → **confirmed in
    Postgres both the `card_images` row and the storage object were gone**
    (delete-then-best-effort-storage-cleanup order, as designed).
  - Opened Review for this card → "View Question image (2)" button appeared
    (button variant, not automatic thumbnails, matching the "keep review clean"
    requirement) → tapped it → both remaining images rendered correctly in the
    modal.
- **Not independently exercised**: the `uploadCardImage` failure-cleanup branch
  specifically (upload succeeds, DB insert fails, so the just-uploaded object
  gets removed) — the manual REST test that hit the max-3 trigger didn't go
  through that wrapper function, so it left one orphaned test file rather than
  proving the cleanup path. Cleaned that file up manually afterward via the
  Storage API (direct SQL delete on `storage.objects` is blocked by Supabase's
  own protective trigger — confirmed that too, by hitting it) and note this as
  a real (if narrow) coverage gap rather than claiming it as tested.
- **A genuine finding from cleanup, not from the picker gap above:** deleting
  the test `auth.users` row correctly cascaded every table (`profiles` through
  `card_images`, confirmed at 0 rows each) — but **not** the 2 real Storage
  objects that were still standing in for actual gallery photos, since Storage
  isn't tied to that cascade at all. Removing those needs either the owning
  user's own token (gone once the user is deleted) or the service-role key,
  which this session correctly never uses. Left them in place rather than reach
  for that key over two leftover test files — see `TODO_DECISIONS.md` for what
  this means for the real "Delete account" feature later.

**Not tested (needs a real device):** the actual `expo-image-picker` gallery
tap-through — permission prompt, picking multiple photos, `selectionLimit`
behavior, and the real compression/resize step (`ImageManipulator`) running on a
real photo rather than a synthetic test JPEG. This is exactly the gap the phase
brief's own "final gallery testing must happen on Android" line anticipates.

## Phase 9 planning — billing provider options (2026-09-07)

Planning/research only, per the weekly worker-plan lane rules ("prepare options,
Christian approves the provider and live billing path") — no billing code, no
new dependencies, no schema change.

**Trigger:** this session was asked to follow the AV Flash lane in
`flowmatic-this-week-claude-worker-plan.docx`. That document (dated 2026-09-07)
described AV Flash as "70 to 75 percent through the first functional build"
with Phase 8 not yet started. **Confirmed against the actual project state
before doing anything else** (this file, `TODO_DECISIONS.md`, the real files in
`lib/`/`hooks/`/`components/`, `git status`, and a live `list_projects` check
against Supabase): Phase 8 was already fully built, tested, and documented in
this repo's own history — the worker-plan doc's snapshot was simply taken
before that work, not a sign anything regressed. Corrected in this session's
report back rather than silently re-planning already-finished work.

**What this pass actually did:** looked up Google Play's current Payments
policy directly (not from training-data memory, given how much this affects a
real commercial decision) — see `TODO_DECISIONS.md` item 6's 2026-09-07 update
for the finding: Play Billing is required for this app's in-app subscription
model, and PayFast-as-primary-in-app (what the Agreement draft currently says)
is very likely non-compliant. `subscriptions.payment_provider` already accepts
either `'google_play'` or `'payfast'` (deliberately, since Phase 2) — no schema
change needed regardless of which way this is ultimately decided.

**Not done, on purpose:** no Play Billing Library or RevenueCat dependency
added, no billing screens built, no server-side entitlement-verification Edge
Function written. All of that is real Phase 9 implementation work that waits
on Christian's provider decision, per the lane's own risk rules.

## Phase 12 prep — Play Store / privacy / terms checklist (2026-09-07)

Checklist only, per the same worker-plan lane rules as the Phase 9 planning pass
above — no store listing drafted, no legal text written, nothing submitted.

**File created:** `PLAY_STORE_CHECKLIST.md` — store listing assets, legal documents
(deliberately not drafting Privacy Policy/Terms text — blocked on the POPIA review
`TODO_DECISIONS.md` already flags, especially since AV Flash's users are Grade 8+
and very plausibly minors), account/access setup (Play Console ownership, 12+
closed testers, signing key), technical release prep (AAB build, Data Safety
section, content rating), and the full manual test pass from the original master
plan's own Phase 12 list.

## Phase 8 follow-up — closed the uploadCardImage cleanup test gap (2026-09-07)

Asked to continue Phase 8 (image upload/viewing) work. **Reconfirmed before
touching anything:** `git status`/branch (`master`, uncommitted scaffold only),
`npx tsc --noEmit` (clean baseline), `list_projects` (only `Aviflash` reachable,
no Hub project visible to this connection), 0 rows in every AV Flash table, and
re-read `lib/imageUpload.ts`, `hooks/useCardImages.ts`, `BUILD_LOG.md` and
`TODO_DECISIONS.md` to confirm Phase 8's actual state. Conclusion: image upload
and viewing are already fully implemented in New Card, View Cards and Review —
nothing was missing to "finish." The one real, previously-documented gap this
pass could actually close in this environment was `TODO_DECISIONS.md` item 32.

**No feature code changed.** One temporary, `__DEV__`-gated test hook was added
to `lib/imageUpload.ts` (`(globalThis as any).__testUploadCardImage =
uploadCardImage`) purely to get a handle on the real exported function from the
browser console, used for the test below, then removed immediately after —
confirmed via `git diff` that the file has zero net change and `npx tsc
--noEmit` is clean again afterward.

**What was tested, and how:** a throwaway test user (same SQL-seeding pattern
as every prior phase, token columns set to `''`) with a profile/subject/deck/
flashcard, logged in via the established REST-token-into-localStorage
technique. From the browser console, called the **real** `uploadCardImage()`
wrapper (not a manual REST reimplementation, unlike Phase 8's original test)
four times for the same card's answer side with a real JPEG data URI:
- Calls 1–3 succeeded: compression via `ImageManipulator` on the web target
  (previously never exercised — Phase 8's original test bypassed it entirely)
  worked correctly, each upload landed in Storage at the expected path, each
  `card_images` row was created.
- Call 4 was correctly rejected by the DB's max-3-per-side trigger, and —
  **confirmed by querying `storage.objects` directly** — the just-uploaded 4th
  storage object was not left behind. Exactly 3 objects existed for that
  flashcard, matching the 3 successful DB rows. This is the specific branch
  item 32 flagged as reviewed-but-not-tested; it's now genuinely tested.
- Followed up with real UI checks (not just the API calls): View Cards'
  display mode rendered all 3 real thumbnails under the answer text, tapping
  one opened the "Answer images" modal correctly; Review mode showed
  "View Answer image (3)" only after "Show Answer" was tapped (question side
  correctly showed no image button, since it has none) and the modal rendered
  all 3 images.
- Test user, all cascaded DB rows, and all 3 Storage objects deleted
  afterward (Storage objects removed individually via the Storage REST API
  using the test user's own session token before deleting the user, since
  Storage deletion doesn't cascade from `auth.users` — see item 31). Confirmed
  0 rows/objects remain for that user id across every table and Storage.

**Still not testable in this environment, unchanged from Phase 8:** the actual
`expo-image-picker` gallery tap-through (OS-level file picker — this
browser-automation environment has no way to drive it) and a real multi-MB
camera photo through `ImageManipulator` rather than a small synthetic JPEG.
Needs a real Android device, per `TODO_DECISIONS.md` item 33.

## Phase 9 — billing options decision document (2026-09-07)

Explicitly instructed to prepare Phase 9 as a decision document only — no
billing code, no payment SDK, no new dependency, no live product/price, no
Play Store change. The only Supabase access used was **read-only**: the
existing `subscriptions` table's columns and `CHECK` constraints (confirming
`payment_provider` currently only allows `'google_play'`/`'payfast'`, and
that `NULL` is already valid — relevant to the recommendation below).

**File created:** `PHASE_9_BILLING_OPTIONS.md` — compares Google Play
Billing, PayFast (in-app and web-based), Yoco, Stripe, and manual/admin
activation. Recommends **manual/admin activation as the safest MVP** (zero
Play Store policy risk, zero schema change, can start before Phase 12/Play
Store exists), with Google Play Billing as the real long-term in-app answer
and a web-based PayFast/Yoco checkout as the policy-safe way to keep
ZAR-native local payment methods if that's preferred over Play Billing —
neither of those two is decided in the document, both remain Christian/
Peet's call per `TODO_DECISIONS.md` item 6. Also restates the still-open
Phase 8 real-device gallery-picker test (unchanged from the last pass).

**Not done, on purpose:** no provider chosen, no code written, nothing
touched in Supabase beyond the read-only schema check above, no Play Console
activity, Flowmatic Hub untouched.

## Phase 9 — manual/admin activation plan (2026-09-07)

Explicitly instructed to plan manual/admin activation only, as the chosen
MVP billing path from `PHASE_9_BILLING_OPTIONS.md` — no payment processing,
no Play Store change, no live billing product, no migration applied,
Flowmatic Hub untouched. The only Supabase access used was **read-only**:
`subscriptions`/`profiles` columns and `CHECK` constraints (already read for
the billing-options doc), plus `pg_policies` across every `public` table —
checked directly rather than assumed from memory.

**File created:** `PHASE_9_MANUAL_ACTIVATION_PLAN.md`. Two real findings from
actually reading the current schema/RLS, not assumed from the Phase 2 record:

1. **`computeAccess()` (`lib/auth.tsx`, unchanged) never compares
   `paid_until` to the current date for `status === 'active'`** — once a
   subscription is set `active`, it stays unlocked indefinitely unless
   someone manually changes the status later. Fine for a manual model as
   long as it's treated as a deliberate recurring admin task, not assumed
   automatic — documented in the plan rather than fixed (no code changed
   this pass).
2. **`subscriptions` RLS has no `INSERT`/`UPDATE`/`DELETE` policy for any
   authenticated user at all**, admin or not — `profiles.role` already has
   an unused `'admin'` value from Phase 2, but zero policies anywhere
   reference it. This means the only way to manually activate a student
   *today*, with zero schema change, is via the Supabase Studio table editor
   directly (real project access Peet/Christian already have) — a genuine,
   complete, zero-code MVP path, documented as "Path 1" in the plan. An
   in-app admin screen ("Path 2") would need real RLS migrations first —
   drafted in the plan (a `SECURITY DEFINER is_admin()` helper plus three
   policies, following the same pattern Phase 2's hardening pass already
   used for its own trigger functions) but **not applied**.

Also drafted (not applied) a small `payment_provider` `CHECK` constraint
change to allow an explicit `'manual'` value, so a manually-activated row is
distinguishable from one where the field was simply never set.

**Not done, on purpose:** no migration run, no admin screen built, no change
to `computeAccess()` or any existing screen, nothing touched in Supabase
beyond the read-only checks above.

## Phase 9 — manual activation implementation sequence (2026-09-07)

Manual/admin activation confirmed as the MVP billing path; asked to refine
`PHASE_9_MANUAL_ACTIVATION_PLAN.md` into safe, ordered build steps before any
code is written. Still planning only — no code, no migration applied, no
Play Store/payment-SDK/Flowmatic Hub activity. Re-confirmed before writing
anything: `git status` (no source changes since the last pass),
`supabase_migrations.schema_migrations` (still ends at Phase 2's last entry
— nothing new applied), 0 users in the dev project.

**File changed:** `PHASE_9_MANUAL_ACTIVATION_PLAN.md` — added §9–§11. Split
the work into five steps (A: `computeAccess()` expiry fix, B: paywall/copy
update, C: admin read screen, D: RLS migration, E: admin write controls) and
sequenced them by actual dependency rather than by letter: **A → B → D → C
→ E**. Key finding driving that order: C and E are real code but
functionally dead without D's RLS policies applied first (a non-admin
`SELECT`/`UPDATE` against another user's row is silently denied by RLS, not
an error — so testing C/E before D would just prove nothing). A and B need
zero database changes and can ship immediately, independent of whether D/C/E
ever get built at all. Added a full test plan per step (mirroring Phase 2's
own empirical RLS-verification standard for D) and a five-item sign-off list
for Christian/Peet before code starts (admin-screen scope, migration
approval, who gets `role = 'admin'`, copy wording, whether the four access
states need visually distinct paywall copy).

**Not done, on purpose:** no code written for A/B/C/E, no migration applied
for D, nothing touched in Supabase beyond the read-only confirmation checks
above.

## Phase 9 — Steps A & B built (2026-09-07)

Per `PHASE_9_MANUAL_ACTIVATION_PLAN.md` §9's sequence, built the two steps
that don't need a migration: A (access/expiry fix) and B (paywall/dashboard
copy). C/D/E (admin tooling, RLS) explicitly not started — no migration
applied, no RLS touched, no payment SDK added, Play Store/Flowmatic Hub
untouched.

**Files created:**
- `lib/access.ts` — `computeAccess()` extracted out of `lib/auth.tsx` into
  its own pure function with zero runtime imports (typed against just the
  three fields it reads, not the full `subscriptions` row), specifically so
  it's unit-testable without pulling in React/Supabase. **The actual Step A
  fix:** an `active` subscription whose `paid_until` has passed now returns
  `locked` instead of `active` unconditionally. A `paid_until` of `null` is
  treated as still valid (not defensively locked) since admin is expected to
  always set it on activation (see the plan's §3/§4) — documented in the
  function's own comment so this choice isn't mistaken for an oversight
  later.
- `lib/access.test.ts` — plain `node`-runnable self-check (Node 24 strips TS
  types natively; zero new dependency, no test framework). 10 cases: no
  subscription, trialing before/after `trial_ends_at`, active with
  `paid_until` null/future/past/exactly-now, and past_due/cancelled/expired.
  Excluded from the app's `tsconfig.json` (`node_modules` was also missing
  from `exclude` and got added alongside it) since it uses Node's `assert`
  module and a `.ts`-extension import, neither valid under the Expo/RN
  compilation target.

**Files changed:**
- `lib/auth.tsx` — now imports `computeAccess`/`AccessState` from
  `./access` instead of defining them inline; no other behavior changed.
- `app/paywall.tsx` — rewritten for the manual-activation model. Removed the
  "Subscribe (coming soon)" disabled button and the Google Play Billing/
  PayFast placeholder banner (Phase 3 leftovers, no longer accurate now that
  Phase 9 picked manual activation). Now shows: the exact date a trial
  ended, the exact date a lapsed manual subscription ended (new — this is
  the case Step A's fix makes reachable), or "cancelled" vs. "ended" text
  distinguishing `cancelled` from `expired` status. Informational banner now
  says subscriptions are activated by AV Flash directly, with no fake
  self-serve checkout implied.
- `app/dashboard.tsx` — the existing "Trial active until {date}" banner now
  has a sibling: "Active until {date}" when `status === 'active'` and
  `paid_until` is set. `paid_until` was previously stored but never shown
  anywhere in the UI (flagged in the plan's §7) — now it is, for the one
  place it's most relevant.
- `tsconfig.json` — added an `exclude` array (`node_modules`,
  `lib/access.test.ts`) so the new self-check doesn't break the app's own
  `npx tsc --noEmit`. Metro bundling is unaffected (nothing imports the test
  file; `tsconfig.json`'s `exclude` only scopes `tsc`, not the bundler).

**Testing performed:**
- `node lib/access.test.ts` — all 10 cases pass, including the actual fixed
  case (`active` + past `paid_until` → `locked`, previously would have been
  `active`).
- `npx tsc --noEmit` — clean.
- `npx expo-doctor` — 20/21 (the 1 failure is four Expo SDK packages one
  patch version behind — e.g. `expo-router` `~57.0.19` wanted vs. `57.0.18`
  installed — pre-existing drift unrelated to this pass, not touched, since
  bumping dependency versions is out of scope for a copy/logic-fix pass and
  isn't one of Steps A/B).
- **Live regression pass against the real dev project**, not just typecheck:
  seeded one throwaway test account and walked it through all four
  reachable states, reloading between each:
  - `trialing`, `trial_ends_at` in the future → dashboard, "Trial active
    until {date}" banner unchanged from before this pass (regression check).
  - `active`, `paid_until` 3 days in the past → **correctly routed to the
    paywall** (this account would have shown the dashboard before Step A)
    with "Your subscription ended on {date}." — confirms the actual fix,
    not just the unit test.
  - `active`, `paid_until` 30 days in the future → dashboard, new "Active
    until {date}." banner rendered correctly.
  - `cancelled` → paywall showing "Your subscription was cancelled." (the
    status-specific copy, not the generic fallback).
  - Test account and its subscription row deleted afterward; confirmed 0
    rows remain.
- Confirmed via `supabase_migrations.schema_migrations` (still ends at
  Phase 2's last entry) that no migration was applied during this pass —
  every Supabase call was either read-only or plain data (`insert`/`update`/
  `delete` on a throwaway test row), never DDL/RLS.

**Not done, on purpose:** no admin screen, no RLS policy, no migration, no
payment SDK, no Play Store activity. Flowmatic Hub was not accessed.

## Phase 9 — Step D applied; C/E replanned around Flowmatic Hub (2026-09-07)

Christian approved applying the drafted admin RLS migration and decided the
admin activation/renew/cancel screen should live inside Flowmatic Hub
instead of the AV Flash app. This pass did two genuinely separate things:
applied and verified a real migration against `Aviflash` (unambiguous, small,
already drafted), and did read-only reconnaissance of Flowmatic Hub's actual
codebase to replace guesswork with a grounded plan for the Hub side — no Hub
file was created, edited, or deployed.

### D — migration applied and verified

Preflight first, per Christian's own required process: re-read
`subscriptions`/`profiles` `CHECK` constraints and every `public` RLS policy
directly against the live project, and re-confirmed
`supabase_migrations.schema_migrations` still ended at Phase 2's last entry
— zero drift since the migration was drafted.

**Applied** (two migrations, both to the `Aviflash` project, ref
`vpmijgumroflnkcvxwpv`):
- `admin_rls_and_manual_payment_provider` — the exact SQL drafted in
  `PHASE_9_MANUAL_ACTIVATION_PLAN.md` §5.1/§5.2: `subscriptions_payment_provider_check`
  now allows `'manual'`; `public.is_admin()` (`SECURITY DEFINER`) plus
  `profiles_select_admin`/`subscriptions_select_admin`/
  `subscriptions_update_admin` RLS policies added.
- `admin_rls_hardening_revoke_anon` — a follow-up fix, not part of the
  original draft: `get_advisors(type: security)` immediately after the
  first migration flagged `is_admin()` as callable by the **anonymous**
  role, not just `authenticated` — Supabase auto-grants `EXECUTE` on new
  functions to `anon`/`authenticated` directly, independent of the `PUBLIC`
  revoke, the exact same gotcha Phase 2's own hardening pass hit and
  documented for its trigger functions. Not a real vulnerability
  (`auth.uid()` is null for an anonymous caller, so the function just
  returns `false`), but closed anyway to match this project's own
  established hardening standard. Re-ran the advisor after — clean of
  anything new; remaining warnings are pre-existing/unrelated
  (`audit_logs`' documented no-policy INFO, and `rls_auto_enable`, a
  pre-existing Supabase platform function untouched since Phase 2).

**Verified empirically**, not just "it applied without an error" — the same
standard Phase 2 set for every RLS change on this project. Two throwaway
test accounts (`aviflash.rlstest.admin@…`, one granted `profiles.role =
'admin'`; `aviflash.rlstest.student@…`, left as a normal student), tested
via direct PostgREST calls with each account's own real access token:
- **Non-admin correctly denied**: `SELECT` against the admin's `profiles`
  and `subscriptions` rows both returned `[]`; a `PATCH` attempt against the
  admin's subscription also returned `[]` (RLS silently filters rather than
  erroring) — confirmed via direct SQL afterward that the admin's row was
  genuinely untouched (`status` still `'trialing'`).
- **Admin correctly allowed**: `SELECT` against the student's `profiles`
  and `subscriptions` returned the real rows; a `PATCH` (`status='active'`,
  `paid_until` set, `payment_provider='manual'`) succeeded and persisted —
  confirmed via a separate direct SQL read afterward.
- **`CHECK` constraint still real**: a follow-up attempt to set
  `payment_provider = 'stripe'` on that same row was correctly rejected
  (`23514` violation), leaving the row unchanged.
- Both test accounts and all their data deleted afterward; confirmed 0
  users remain.

### C/E — replanned around Flowmatic Hub, not built

**File created:** `PHASE_9_HUB_ADMIN_PLAN.md`. Before this pass, no work in
this AV Flash lane had ever looked at Hub's actual code — dispatched a
read-only reconnaissance pass (Explore agent, no files touched) rather than
guess at Hub's architecture. Real findings that reshape the plan:
- **Hub is a Windows Electron desktop app** with a hand-rolled Node HTTP
  backend and its own custom auth (scrypt-based, its own sessions) —
  entirely disconnected from Supabase Auth. Deploy is a manual, multi-step
  SSH/SCP process against one VPS, ending in a real installer rebuild that
  auto-updates real users' desktops — not a quiet merge.
- **Hub deliberately retired Supabase**, enforced by a regression test
  (`test/stage13-supabase-retired.test.js`) with exactly one tracked
  exception (an unrelated project, read-only). Adding AV Flash's Aviflash
  project as a second integration is exactly what that test exists to
  catch — **flagged as needing Christian's explicit sign-off**, not routed
  around silently.
- **Because Hub's backend has no Supabase Auth session**, the RLS/
  `is_admin()` work from D isn't actually the mechanism Hub's integration
  would use — a `service_role` key (bypassing RLS, Hub's own access control
  as the real gate) fits Hub's own established patterns (a `fetch()`-based
  helper like its existing Anthropic/ResiDesk calls, the key stored in
  Hub's encrypted `vault_entries` table, matching a secrets-storage
  convention a recent Hub planning doc explicitly recommends for new
  integrations).
- **No per-individual-user allowlist exists in Hub today** — only role-based
  gating. "Christian and Peet specifically" needs new code, with the
  existing `sales_partner` single-person carve-out as the closest precedent.
- Full detail, safe build sequence, and the specific questions Christian/
  Peet need to answer before Hub code starts: `PHASE_9_HUB_ADMIN_PLAN.md`
  §3–§6.

**Not done, on purpose:** no Hub file created or edited, no Hub deploy, no
Play Store activity, no PayFast/Yoco/Stripe integration, no unrelated AV
Flash feature touched, no secret value printed anywhere in this session's
output or in either planning document.

## Phase 9 — Hub admin screen implementation plan (2026-09-07)

Asked for a clear, standalone implementation plan for the Hub-side admin
screen (paused before coding), covering: where it lives, how Christian/Peet
get access, why the Supabase-retired test needs a deliberate exception, the
service_role secret and its storage, exactly what actions the screen
allows, and the tests required to prove it doesn't leak access. Refines
`PHASE_9_HUB_ADMIN_PLAN.md`'s reconnaissance into one document organized
around those six questions, citing exact files/lines in
`flowmatic-hub-stage2-fresh` throughout rather than describing Hub in the
abstract.

**File created:** `PHASE_9_HUB_ADMIN_IMPLEMENTATION_PLAN.md`. Key content
not already covered by the prior recon doc: a concrete proposed allowlist
pattern (`AVFLASH_ADMIN_ALLOWLIST`, modeled on the existing single-person
`sales_partner` precedent) with two real open inputs flagged — Christian's
and Peet's actual Hub usernames/ids aren't known yet, and whether to reuse
their existing logins or create new ones is still undecided; a precise
description of what "deliberate Supabase exception" means in practice for
`test/stage13-supabase-retired.test.js` (add one named, reviewed exception,
not weaken the guard for anything else); the exact vault-storage handling
for the service_role key including what must never happen (never in an IPC
response, never logged, never `.env`); and eight specific required tests,
the most important being proof that `role === 'admin'` alone is *not*
sufficient — only the two named identities — so a future unrelated admin
promotion can't silently inherit AV Flash billing control.

**Not done, on purpose:** no Hub file created or edited, no Hub deploy, no
migration, no Supabase project change, no Play Store/payment-provider
activity.

## Phase 9 — Hub admin screen built, not deployed (2026-09-07)

Built exactly what `PHASE_9_HUB_ADMIN_IMPLEMENTATION_PLAN.md` specified, in
`flowmatic-hub-stage2-fresh` (the up-to-date git clone of the real
`flowmatic-hub-app` repo) — **committed to no git history, not pushed, not
deployed to the live VPS backend or as a new installer.** This is source
code sitting in a local checkout, verified by build/test only.

**A real, unplanned finding changed the allowlist before any code was
written:** Hub's own bootstrap data already has a `'peet'` username — but
it's role `'client'`, scoped to **Kellock Management** (an unrelated
accounting client), not AV Flash. This is exactly the ambiguity
`TODO_DECISIONS.md` item 9 flagged as unresolved since the project started.
**Did not guess.** The allowlist (identical in both
`backend/desktop-api-server.js` and `src/main/main.ts`, each carrying the
same explanatory comment) currently contains only `'christian'` — confirmed
for real via Hub's own bootstrap code (`main.ts` seeds exactly one admin
user named `'christian'`). **Peet has no functional access to this screen
yet** — needs Christian to confirm which real Hub account is AV Flash's
Peet before that name is added.

**Files changed in the Hub repo** (all local, unpushed):
- `backend/desktop-api-server.js` — `isAvFlashAdmin` (role + allowlist,
  computed alongside the existing `isAdmin`/`isStaff`/etc.), a vault-only
  Aviflash client (`avflashVaultConfig`/`avflashFetch`/
  `avflashSafeSubscription` — reads both the project URL *and* the
  service_role key from a single `vault_entries` row, named exactly
  `AV Flash — Aviflash Supabase (service_role)`, so no Supabase reference
  of any kind exists in source), and three routes:
  `/api/admin/avflash/lookup|activate|cancel`.
- `src/main/main.ts` — `AVFLASH_ADMIN_IPC_CHANNELS` as its **own** set, not
  added to `ADMIN_ONLY_IPC_CHANNELS` (that would let any admin through, not
  just the two named people — this was a real, deliberate design point, not
  an oversight); a matching allowlist check in the existing IPC wrapper;
  three thin proxy `ipcMain.handle` registrations.
- `src/main/preload.ts` — three new `hub.avflash*` methods exposed.
- `src/renderer/index.html` — a new `page-avflash-admin` section (modeled
  on the existing Passwords page) and a new script include.
- `src/renderer/js/avflash-admin.js` (new file) — search-by-email, a result
  card, an activate/renew form (one action either way, per
  `PHASE_9_MANUAL_ACTIVATION_PLAN.md` §3), and a two-tap cancel confirm.
- `src/renderer/js/hub.js` — nav item visible only to the allowlisted
  username (cosmetic only, explicitly commented as such — the real gate is
  server-side), added via `.slice()` on the resolved nav array to avoid
  mutating the shared `ADMIN_NAV` constant on repeated sidebar rebuilds.

**Testing performed:**
- `npx tsc -p tsconfig.json` (the project's real build command, not just
  `--noEmit`) — clean.
- `node --check` on both changed/new JS files — clean.
- **Ran Hub's entire existing test suite — all 52 files, not just the ones
  expected to be relevant** — to catch any regression from editing shared
  gating/session code. Two pre-existing tests failed on an *exact* IPC
  handler count baseline (`208`) that their own error messages say to
  update "if this changed deliberately" — updated both to `211` (208 + 3
  new AV Flash channels), with a comment recording why, rather than leaving
  the suite red or padding the diff by avoiding a baseline bump.
- **`test/stage13-supabase-retired.test.js` (Christian's existing Supabase-
  retirement guard) passes with zero changes needed** — the vault-only
  design means no `supabase.co` URL or key literal exists anywhere in
  source, so this integration doesn't trip any of its checks. Stated here
  plainly rather than left implicit: this isn't a technicality used to
  avoid disclosure — it's disclosed here and in the new test below on
  purpose, matching the spirit of the existing ResiDesk (B7) exception even
  though the letter of that specific test needed no edit.
- **New file**: `test/avflash-admin-access.test.js` — 7 source-level checks
  (matching this repo's own framework-free test style): the three new
  channels require both admin role and the named allowlist, not role
  alone; they're absent from every broader IPC set
  (`ADMIN_ONLY`/`ADMIN_OR_STAFF`/`MARKETING`/`SALES_PARTNER`); the three
  backend routes are gated by `isAvFlashAdmin` specifically; the decrypted
  service_role key is never referenced inside any response sent to the
  renderer; no new Supabase dependency/URL/key literal was introduced.
  **Not tested** (would need a live session/Postgres or an extended local
  mock, out of scope for "keep it small"): a real non-allowlisted admin
  session actually receiving a 403 at runtime.

**What's needed before this does anything for real, none of it done here:**
1. A Vault entry named exactly `AV Flash — Aviflash Supabase (service_role)`
   (Passwords → Vault, once this code is actually deployed) with the
   Aviflash project's REST URL and its service_role key — fetched by
   Christian/Peet directly from the Supabase dashboard, never seen or
   handled by this session.
2. Confirmation of AV Flash's real Peet's Hub username, per the finding
   above.
3. An actual deploy — Hub's own guarded 5-step runbook (preflight → backup
   → migrate → redeploy backend container → build/publish a new installer)
   — not started, not part of this pass.

**Not done, on purpose:** no git commit, no push, no backend redeploy, no
installer build/publish, no Play Store activity, no payment provider added,
no other AV Flash feature touched, no secret value ever appeared in this
session's output.

## Phase 9 — Hub admin screen: shared account, dedicated role (2026-09-07)

Christian clarified the access model: rather than resolving which of Hub's
existing personal logins belongs to "AV Flash's Peet," Christian and Peet
share **one new, dedicated Hub login** — `aviflash.admin` — for this screen.

**A real design problem surfaced immediately, before writing any account
code:** the previous pass's gating was `role === 'admin' AND allowlist`.
Reusing that shape for a brand-new *purpose-built* shared account would
have meant giving `aviflash.admin` the full `'admin'` role just to satisfy
the allowlist check — silently handing it every other admin capability
(finances, every other client's data, the vault, all 208 other admin-only
channels) just to unlock 3 AV Flash routes. **Caught and fixed before
building the account, not after:** replaced the role+allowlist shape with
one dedicated role, `'avflash_admin'`, that grants nothing else at all.

**Files changed (same repo, still local-only — no commit, no push, no
deploy):**
- `src/main/main.ts` — `AVFLASH_ADMIN_ALLOWLIST` removed; the IPC gate is
  now `_session.role !== 'avflash_admin'`. Added a seed block in
  `seedIfNeeded()` (mirroring the existing `'christian'`/`'peet'` bootstrap
  pattern exactly — `FLOWMATIC_BOOTSTRAP_AVFLASH_ADMIN_PASSWORD` env var,
  no hardcoded password) that creates `username: 'aviflash.admin'`,
  `role: 'avflash_admin'`, `client_id: null`. Its email
  (`aviflash.admin@flowmaticza.co.za`) is a guessed placeholder following
  this repo's own domain convention — not confirmed to be a real mailbox,
  flagged in-code, low-stakes since this shared login has no self-service
  email flow wired to it.
- `backend/desktop-api-server.js` — `isAvFlashAdmin` is now simply
  `me.role === 'avflash_admin'`, no allowlist, no `isAdmin` dependency at
  all.
- `src/renderer/js/hub.js` — replaced the "push an AV Flash item onto the
  admin nav for an allowlisted username" approach with a proper minimal,
  dedicated `AVFLASH_ADMIN_NAV` (just the AV Flash page + Settings — this
  account isn't an admin and shouldn't see an admin page even by accident),
  routed by a new `isAvflashAdmin()` helper; also added a sidebar role
  label ("AV Flash Admin") so the account doesn't render as "Client" in the
  UI.
- `test/avflash-admin-access.test.js` — rewritten to assert the new model:
  gated on `role === 'avflash_admin'` specifically (and explicitly *not*
  also accepting `role === 'admin'` — a regression guard against exactly
  the mistake just caught), plus a new check that the seed itself never
  creates the account with `role: 'admin'`. 8 checks now, was 7.

**Testing:** real `tsc` build clean; backend syntax check clean; new test
file 8/8; **full existing 52-file suite re-run, still all green** after
this rework (touched the same shared gating/session/nav code a second
time, so re-ran everything rather than assuming the first pass's clean
result still held).

**Not done:** creating the actual account (needs `FLOWMATIC_BOOTSTRAP_AVFLASH_ADMIN_PASSWORD`
set once on a real boot, or manual creation via the admin Clients/Users
screen — an operational step for Christian, same as how `'christian'`'s
own bootstrap password works today), populating the vault entry with the
real Aviflash service_role key, and any deploy activity.

## Phase 9 — Hub commit (2026-09-07)

Committed locally in `flowmatic-hub-stage2-fresh` — commit `3a81324` on
branch `feature/coordinated-update-2026-08-18` ("Phase 9: AV Flash admin
screen (activate/renew/cancel), shared dedicated account"). **Not pushed,
not merged, no live account created, no deploy.**

**A real complication had to be handled carefully:** several of the shared
files this feature touches (`main.ts`, `preload.ts`, `index.html`,
`hub.js`, `desktop-api-server.js`) already had a *different, unrelated,
uncommitted* feature (a concurrent session's Sales Partner AI/commissions
work) interleaved in the same files. Committing the working tree as-is
would have bundled someone else's unfinished, unreviewed work into an "AV
Flash" commit under this session's name. Instead: reconstructed exactly
this session's own hunks on top of the last real commit (excluding the
concurrent work entirely), verified that isolated reconstruction actually
builds and passes tests **on its own** (real `tsc` build clean; 50 of the
repo's other test files pass — the 2 files belonging solely to that other,
absent feature were excluded from the isolated check, not from the repo),
staged and committed only that reconstruction, then restored the working
tree's original mixed content so the other session's in-progress work was
never disturbed or lost. Confirmed byte-for-byte afterward that the
restored files exactly matched their pre-commit state.

**Secret scan of the actual staged diff:** clean — no service_role key, no
password value, no Aviflash project URL/ref anywhere in what was committed
(passwords are always `process.env.FLOWMATIC_BOOTSTRAP_*` reads, never
literals; the Aviflash URL/key live only in a vault entry that doesn't
exist yet).

**Exact remaining steps, none done here:**
1. Set `FLOWMATIC_BOOTSTRAP_AVFLASH_ADMIN_PASSWORD` once on a real Hub boot
   (or create the account manually via the admin Clients/Users screen) to
   bring the `aviflash.admin` / role `avflash_admin` login into existence.
2. Add a Vault entry (Passwords → Vault, once this build is running) named
   exactly `AV Flash — Aviflash Supabase (service_role)` with the Aviflash
   project's REST URL and its service_role key (from the Supabase dashboard
   directly).
3. Push this commit and have it reviewed/merged, and separately reconcile
   with whatever the concurrent Sales Partner work commits (that IPC-count
   baseline will need bumping again once both are merged together).
4. An actual deploy via Hub's own guarded 5-step runbook.

## Phase 9 — Hub commit rebased onto origin (2026-09-07)

Rebased the AV Flash admin commit onto `origin/feature/coordinated-update-2026-08-18`,
which had moved 3 commits ahead since the original commit was made (a
security lane: masked n8n key status, broader write-endpoint rate limiting,
vault reveal audit logging — the "already-merged v4.22.1 security work").
**Still not pushed, not merged into any other branch, no deploy.**

New commit SHA after rebase: **`69e0704`** (was `3a81324`; the old SHA
is gone — rebase always creates new commits). Branch now **ahead 8, behind
0** relative to origin (was behind 3).

**The concurrent, uncommitted Sales Partner AI/commissions work sitting in
this same checkout had to be handled carefully again**: stashed (`git
stash push -u`, tracked and untracked) before rebasing, since a clean
working tree is required and several of its edits sit in the exact files
being rebased. One real, expected conflict came out of restoring it
afterward: both the rebase and the stash had independently edited the same
IPC-handler-count comment in `test/ai-tab-phase-a.test.js`. Resolved by
keeping the rebase's correct number (**209** = 205 baseline + 1 security-lane
channel + 3 AV Flash channels — confirmed by literally counting
`ipcMain.handle(` occurrences in the merged file, not just arithmetic) and
discarding the stash's number (211, which had assumed the Sales Partner
channels already existed — they don't, on this branch). Four of the
stash's untracked files (the vault-audit migration SQL + 3 ops runbook
scripts) couldn't be restored because the rebase's real, origin-committed
versions already occupy those exact paths — diffed the stash's copies
against them and confirmed the only difference is an encoding artifact
(BOM/mojibake vs. clean UTF-8) in the stash's copies, not a content
difference; kept the correctly-committed versions, left the stash's
redundant copies alone rather than deleting anything. The stash itself was
**not dropped** — kept as a safety net in case the other session needs it.

**Verification re-run from scratch against the final commit** (`git
archive 69e0704`, not the working tree, which still has the concurrent
work sitting on top): real `tsc` build clean; 52 of 53 test files pass —
the one exception is `test/v4.22.0-sales-partner-proposal-ui.test.js`, a
pre-existing test from an earlier, separately-committed feature asserting
"205 handlers, unchanged," which now (correctly) fails since 209 is real;
not touched, since reconciling it isn't this branch's job. Secret scan of
the commit diff: clean (only the test file's own detection-pattern
strings match anything security-scan-adjacent). Zero Sales Partner AI/
commissions content in the diff.

**Not done:** no push, no merge into any other branch, no tag, no account
created, no vault secret added, no deploy, no production access of any
kind.

## Phase 9 — autonomous reconciliation + paywall contact fix (2026-09-08)

Asked to continue the AV Flash lane independently and finish whatever safe
planning/reconciliation work didn't need Christian's input first. Two
concrete pieces of work qualified; nothing else was touched.

**1. Hub branch reconciliation — re-verified, no new rebase needed.**
Fetched `origin/feature/coordinated-update-2026-08-18` fresh: unchanged
since the last rebase (commit `69e0704`) — still ahead 8, behind 0. Re-ran
the full verification from scratch anyway rather than assuming yesterday's
result still held: clean `tsc` build (fresh `git archive` export, not the
working tree), 52 of 53 test files pass (the one exception is the same
pre-existing, unrelated stale-baseline test flagged yesterday — still not
this branch's file to fix), secret scan clean, zero Sales Partner AI/
commissions content in the diff. Branch remains mechanically push-ready;
still not pushed, per standing instruction to wait for explicit approval.

**2. Paywall contact email — applied an already-approved decision that had
never actually been implemented.** Christian approved a temporary demo
contact address (`demo@aviflash.co.za`) in an earlier session, but the fix
was never applied to the actual screen — `app/paywall.tsx` still said
"Contact AV Flash" with no address. Since the decision was already made
(nothing new to ask), applied it: the banner now reads "Email
demo@aviflash.co.za (temporary contact) to activate or renew your
subscription..." — labeled as temporary per Christian's own instruction so
it doesn't read as a permanent support channel.

**Testing:** `npx tsc --noEmit` clean. Live check against the real dev
project: seeded one throwaway test account, set its subscription to
`cancelled`, logged in, confirmed the paywall renders the exact new copy
correctly. Test account deleted afterward — confirmed 0 users remain.
Confirmed via `supabase_migrations.schema_migrations` that no migration was
applied (only DML on the throwaway test row).

**Not done, on purpose (all explicitly out of scope for this pass):** no
push, no Hub deploy, no `aviflash.admin` account created, no vault secret
added, no Play Store/payment-provider work, no other AV Flash feature
touched. Broader open items in `TODO_DECISIONS.md` (FSRS scheduling
decision, commercial paperwork, POPIA review, real-device testing, etc.)
are genuine product/business decisions or hardware-dependent work, not
"safe reconciliation" — left untouched rather than assumed.

## Phase 9 — Hub admin screen smoke test, round 1 (2026-09-08)

Christian ran the first live smoke test of the Hub AV Flash admin screen
after the `aviflash.admin` account creation gap was fixed (the originally
planned `FLOWMATIC_BOOTSTRAP_AVFLASH_ADMIN_PASSWORD` env-var path turned
out to be dead code — never called from Hub's app startup, and would have
thrown even if it were; see the Hub repo's `70fc939` and the shipped
`v4.22.4` follow-up release for the real fix, which widened the existing
Create User screen's role allowlist instead).

**Passed:** logged in as `aviflash.admin` successfully. Access restriction
confirmed working as designed — the account sees only the AV Flash admin
page and Settings, nothing else (finances, other clients, vault, etc. all
correctly hidden).

**Pending, not a failure:** student lookup, activate/renew, and cancel
could not be exercised — there is no known AV Flash student account to
search for yet (Phase 8 hasn't had real end-user signups). A safe
test-student plan for the next round is in
`PHASE_9_TEST_STUDENT_PLAN.md`. No student was created, no Supabase
action taken, and no service_role key touched during this pass.

## Phase 9 — test student created for Hub admin screen testing (2026-09-08)

Per `PHASE_9_TEST_STUDENT_PLAN.md` §1 (Option A): created one test student
through the real AV Flash web app's own Register screen (`expo start
--web`, filled in and submitted the actual form) — the same publishable/
anon-key signup path any real student's device uses, no service_role key
involved anywhere in this step.

- **Email:** `avflash.smoketest+student1@gmail.com` (a `+alias`, chosen so
  it's unmistakably a test row — not necessarily a real inbox anyone
  reads; not needed for this test, since Hub's lookup/activate/cancel
  query `profiles`/`subscriptions` directly and don't care whether the
  student ever confirms their email or logs into the app).
- First attempt used `@example.com` and Supabase's own signup validation
  rejected it outright ("Email address is invalid") before any row was
  created — switched to a real-domain `+alias` per the plan's own
  fallback guidance, which succeeded.
- **Verified via a read-only query** (Supabase MCP, no service_role key):
  `profiles` and `subscriptions` rows exist, `status = 'trialing'`,
  `trial_ends_at` ≈ signup + 7 days, `paid_until` and `payment_provider`
  both null — exactly the shape a real new signup produces.

**Not done in this pass, on purpose:** Hub-side lookup/activate/cancel —
that screen lives in Christian's own Hub desktop app under his own
`aviflash.admin` session, which this session has no way to drive. See
`TODO_DECISIONS.md` for exactly what's needed from him next. The test
student has deliberately **not** been cleaned up yet — it needs to still
exist for that testing to have something to find.

## Phase 9 — Hub admin screen smoke test, round 2 — FULL PASS (2026-09-08)

Christian ran the second round of testing against the test student from
the previous entry, `avflash.smoketest+student1@gmail.com`, following
`PHASE_9_TEST_STUDENT_PLAN.md` §§2–4. On the way, lookup initially failed
with `Server request failed (502)` — investigated (source-only, no
Supabase touched, no key revealed) and traced to a stale/incorrect
Aviflash `service_role` key in the Hub's vault entry (`AV Flash —
Aviflash Supabase (service_role)`), not a code defect. Christian rotated
the key in the Aviflash Supabase project's dashboard and updated the
vault entry with the fresh key.

**All confirmed passed, reported by Christian:**
- `aviflash.admin` login and restricted access (unchanged from round 1).
- Aviflash Supabase vault/service_role connection, after the key
  rotation above.
- Student lookup, by email, for `avflash.smoketest+student1@gmail.com`.
- Activate/renew.
- Cancel.
- No real student account was touched at any point.

The AV Flash admin screen (Phase 9, Steps C/D/E) is now fully verified
end-to-end in production. The test student is still in place — cleanup
is deliberately deferred until Christian separately approves it (either
leaving it cancelled, which is harmless, or deleting it from the
Supabase Auth dashboard).

See `flowmatic-hub-stage2-fresh/PLANNING/V4.22.4-AVFLASH-ADMIN-FIX-RELEASE-EVIDENCE-2026-09-08.md`
§4 for the Hub-side release evidence record of the same result.

## Post-Phase-9 roadmap review + small decision-free fixes (2026-09-08)

With the Hub admin screen fully live and smoke-tested (previous entry),
reviewed `TODO_DECISIONS.md` in full for what's actually next, safe to do
without Christian/Peet, per the same standing rule this whole lane
follows.

**Next phase, and why it's blocked:** Phase 10 (starter content) is next
numerically, but hard-blocked by `TODO_DECISIONS.md` item 4 — the 300
quotes file has no real quote/author text, only row numbers, contradicting
the Product Plan's own description of the same file. Nothing to build
against a placeholder; needs Peet/Christian to re-source the actual
content. Phase 12 (Play Store prep) is blocked the same way, by
items 2/3/6/7 — Expo/EAS/Play account ownership, closed testers, the
revenue-share/payment-platform paperwork disagreement, and the POPIA
review. All four are business/legal decisions, not code, and none of them
were touched.

**What was actually actionable: real-device testing debt.** Phase 8
(images) and part of Phase 3 have never been tested on real Android —
this environment has no emulator or device. Wrote
`PHASE_8_ANDROID_TEST_CHECKLIST.md`: the exact numbered list (grounded in
Phase 8's own build-log entry, not generic), plus what device/emulator
Christian actually needs — Expo Go on any Android phone via
`npx expo start`, no EAS account or Play Console required for this level
of testing. An emulator is noted as a partial substitute only (can't
produce a genuine multi-MB real-camera JPEG, which is exactly what the
compression check needs to prove).

**Two small, decision-free items found and closed while reviewing:**

1. **Item 20 was already resolved, just never marked.** Checked
   `app/new-card.tsx` and `app/view-cards.tsx` directly: both already
   validate "text OR at least one image" per side (Phase 8 did this), not
   "text always required" as the open item still claimed. Documentation
   fix only — updated `TODO_DECISIONS.md`, no code change needed.
2. **Item 29 (time-taken per review) — actually implemented.** The data
   was already correct in the DB (`review_sessions.started_at`/
   `completed_at`), just never surfaced. Added a "Time taken" row to the
   Review complete screen (`app/review.tsx`): a small `formatDuration()`
   helper (minutes/seconds from the two existing timestamps) plus one new
   stat row, following the exact pattern the other stat rows already use.
   No new query, no schema change — `completedSession` already carries
   both fields from `saveReviewSession()`'s own return value.

**Testing:** `npx tsc --noEmit` clean. **Not verified in a live browser
click-through** — deliberately, since reaching the Review-complete screen
needs a subject/deck/card and a completed review, and the only account
that exists in this environment right now is the Hub admin smoke-test
student, whose email was never confirmed (can't log into the app itself,
only looked up via Hub). Verified instead by tracing the exact data path
end to end: `saveReviewSession()` inserts and returns both timestamps →
`setCompletedSession(saved)` stores that exact row → the new stat row
reads `started_at`/`completed_at` directly off it, same object, no
re-fetch. No Supabase state was created or touched to avoid needing a
judgment call this pass wasn't asked to make.

## Safe UI/UX polish audit (2026-09-08)

With Phase 10/12 both blocked on business decisions (previous entry),
audited the app for small, decision-free polish items — no payments, Play
Store, Supabase schema, service_role keys, Hub, or user creation/deletion
touched.

**Found and fixed: two stale placeholder subtitles left over from Phase 1,
never updated as later phases actually shipped the features they were
describing as "coming."** Both are one-line copy changes, zero logic
risk:
- `app/dashboard.tsx` — was "Subject selection coming in Phase 4 — full
  card tools coming in Phase 5+." even though subject selection, New
  Card, View Cards, and Review are all fully built and visible on the
  exact same screen. Actively misleading, not just outdated. Changed to
  "Pick a subject, then use the tools below."
- `app/settings.tsx` — was "Account details, subjects, and more settings
  land here over the next phases." — internal roadmap language exposed
  directly to users. Changed to "Your account details and quick links."

**Checked and confirmed NOT stale:** `app/login.tsx`'s "Google sign-in —
coming soon" (gated by `GOOGLE_SIGN_IN_AVAILABLE = false`) — this feature
genuinely isn't built yet (see `TODO_DECISIONS.md` item 16's area), so
the label is accurate, not a bug.

**Short list of other safe-but-bigger items considered, not implemented
this pass** (ordered by risk/benefit — see `TODO_DECISIONS.md` items
18/21/24 for full detail):
1. Un-archive path for an archived subject or card set (items 18/24) —
   real, well-scoped UI gap, no decision needed, moderate size (a list +
   restore action, roughly comparable to the existing archive flow in
   reverse).
2. Rename a card set (item 21's remaining half — move already exists) —
   small, well-scoped, similar shape to the existing subject-rename UI.
3. Hardware back-button / swipe-back leave-guards on New Card and Review
   (items 22/27) — real gaps, but flagged in their own items as "worth a
   real-device check" first, so bundling with the Android test pass in
   `PHASE_8_ANDROID_TEST_CHECKLIST.md` makes more sense than guessing at
   the right UX blind.

**Testing:** `npx tsc --noEmit` clean. Not verified in a live
click-through, same limitation as the previous entry — no confirmed test
account exists in this environment to reach a post-login screen, and no
new Supabase state was created to work around that.

## Phase 10+ — not started
