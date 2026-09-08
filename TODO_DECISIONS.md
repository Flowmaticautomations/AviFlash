# AV Flash — Open decisions for Peet / Christian

**Update after Phase 2 planning (2026-09-03):** the full schema/RLS/storage/auth plan
was written and ready in `PHASE_2_SUPABASE_PLAN.md` and `supabase/migrations/`. That
work didn't need any of the items below to be answered — it was designed to apply
cleanly regardless of how items 5 and 6 get resolved.

**Update after Phase 2 apply (2026-09-03, same day):** item 1 is now **resolved** —
the `Aviflash` dev project exists, all 12 original migrations plus 2 follow-up
hardening migrations are applied and verified (tables, RLS, policies, storage
bucket, subscription/audit-log lockdown all confirmed empirically — see
`BUILD_LOG.md`). `.env` has the real dev URL + publishable key; no service-role key
was ever fetched or stored. Nothing below is a Phase 2 blocker anymore — Phase 3 can
start once Christian reviews the verification and gives the go-ahead.

This carries forward the unresolved items from the discovery pass done before Phase 1
(`01 — Clients\ABI FLASH\AviFlash-Android-Implementation-Plan-2026-09-03.md`, §9/§10/§12
in full). Nothing below was silently decided — Phase 1 only did work that doesn't depend
on these answers (project scaffold, branding, theme, folder/nav structure, env-var
plumbing with no real keys yet).

## Blocking Phase 2 (Supabase + auth) specifically
1. ~~No Supabase project exists yet for AV Flash.~~ **RESOLVED 2026-09-03.** The
   `Aviflash` dev project (ref `vpmijgumroflnkcvxwpv`) was created, confirmed
   separate from (and that it replaced) the old `flowmatic hub` project, and all
   Phase 2 migrations are applied and verified against it. `.env` has the real dev
   URL + publishable key. See `BUILD_LOG.md` for the full apply/verification record.
2. **Account ownership** for Supabase / Expo-EAS / Google Play / Google OAuth is not
   confirmed anywhere in the supplied documents. Needed before Phase 2/9 (auth, billing).
3. **12+ closed testers** are required for a new personal Google Play Console account —
   none named yet. Needed before Phase 12.

## Blocking Phase 10 (starter content) specifically
4. **The 300 quotes have no actual text.** `AviFlash_Quotes_CLEAN_300.xlsx` contains only
   the numbers 1–300, no quote/author content, contradicting the Product Plan's
   description of the same file. Needs to be re-sourced before the splash rotating-quote
   feature or Stage 8 import can be built for real (Phase 1's welcome screen ships with a
   static trial message instead of a rotating quote for this reason).

## Product-scope question, affects the data model if left unanswered
5. **Is true spaced-repetition scheduling (FSRS, Again/Hard/Good/Easy) wanted for V1**, or
   is simple correct/incorrect "Full Review" (what this build plan and the Build
   Specification describe) the real intended launch experience? The Product Plan (18 Aug)
   describes FSRS as the product's main feature; the current Build Spec has no due-date
   table at all. If the answer is "add it later," flag that now — it's a schema change,
   not just a UI change, and cheaper to decide before `review_sessions` is built in
   Phase 2.

## Commercial paperwork — not a code decision, flagging so it isn't missed
6. Quote (24 Aug) vs. Agreement DRAFT (21 Aug) disagree on: setup fee (waived vs.
   R4,000), revenue share (15% stated / 20% used in the Quote's own example vs. 20%
   throughout the Agreement), payment platform (Play Billing vs. PayFast-primary),
   maintenance rate at the 0–250 user tier (R550/2h vs. R450/8h), and Claude Max
   allowance (1 month vs. 2 months). Full detail in the discovery plan §10. Should be
   resolved and one version signed before subscription revenue is taken — not something
   this build touches either way.
   **Update 2026-09-07 — the payment-platform half of this is no longer just a
   paperwork disagreement, it's a Play Store policy question, checked directly
   against Google's current Payments policy:** Google requires Play-distributed
   apps to use Google Play Billing for "in-app features or services," explicitly
   including subscriptions and unlocking app content — and separately prohibits
   apps from "leading users to a payment method other than Google Play's billing
   system" for that same purchase. A narrow alternative-billing program exists
   (their policy's Section 8) but needs separate enrollment and isn't something
   to assume AV Flash qualifies for without checking current eligibility. In
   plain terms: **making PayFast the primary in-app payment method, as the
   Agreement draft currently states, is very likely a Play Store policy
   violation for this app's actual subscription-unlock flow — not just the
   minority position between two drafts.** Google's current subscription service
   fee is a flat 15%, the same at every developer revenue tier (checked
   2026-09-07; policy pages change, worth re-confirming before this is final).
   This doesn't resolve the Quote/Agreement contradiction on its own — that's
   still Christian and Peet's call, ideally with the attorney review item 5
   below already calls for — but it removes "make PayFast primary in-app" as a
   safe default to build toward. A PayFast flow reached via a separate web
   purchase path (outside the Android app entirely) isn't restricted by this
   policy, but that's materially more scope than an in-app billing integration
   and isn't assumed or planned here.
   **Update 2026-09-07 (Phase 9 decision doc):** `PHASE_9_BILLING_OPTIONS.md`
   now compares all the realistic options (Google Play Billing, PayFast
   in-app vs. web, Yoco, Stripe, manual/admin activation) side by side and
   recommends manual/admin activation as the safest MVP bridge until this
   item is actually resolved — still not a decision, just a clearer basis
   for making one.
   **Update 2026-09-07 (manual-activation plan):** manual/admin activation
   is now planned in detail in `PHASE_9_MANUAL_ACTIVATION_PLAN.md` — see
   items 35–39 below for the concrete findings (an `active`-status expiry
   gap, an RLS gap blocking any in-app admin action today, and a small
   drafted-not-applied schema change). Nothing has been applied; a zero-
   schema-change path (Supabase Studio table editor) is available to start
   with immediately per that plan's §6.
7. **South African POPIA / minor-consent review** hasn't happened yet and is named as a
   precondition in three source documents. Affects the age/grade field and any
   guardian-consent flow in Phase 3's registration screen.

## Not blocking anything yet, just open
8. `login details.docx` exists in the client folder — not opened by this build (same as
   the discovery pass). If it holds live credentials, they should move to a password
   manager / secret manager rather than a Word doc.
9. Whether "Peet" here is the same Peet already known from WOOF/Kellock or a different
   person with the same surname as Christian — a one-line confirmation avoids mixing up
   client records.

## New from Phase 2 planning — needs a decision, not just an "apply the SQL" step

10. **Trial/subscription lockout is currently designed as an app-layer gate, not an
    RLS-layer one** (`PHASE_2_SUPABASE_PLAN.md` §5): once a trial/subscription
    expires, `subscriptions` RLS still lets the user read their own subjects/decks/
    flashcards (so nothing is destroyed or hidden), the app's own paywall screen is
    what blocks *using* the app. Confirm this is actually what's wanted vs. a harder
    lock — it's a one-line RLS change either way, but changes behaviour a real user
    will notice, so worth deciding once rather than after Phase 9 is built.
11. **The 90-day post-cancellation deletion is only "scheduled" in the schema, not
    executed.** `subscriptions.data_deletion_scheduled_at` gets set automatically, but
    actually purging data on that date needs a scheduled job (`pg_cron` or a
    scheduled Edge Function) — real backend/ops work, out of scope for a
    planning-only phase. Needs to land before real user data exists, not after.

**Nothing above blocks continuing Phase 1 polish or the Phase 2 planning that's now
done. It blocks actually applying Phase 2 against a real backend (needs a dev Supabase
project — item 1), and blocks Phase 10/12 outright.**

## New from Phase 3 — needs a decision or a manual check, not a code fix

12. **Email confirmation is ON for the dev Supabase project (learned by testing, not
    assumed).** This means new users always land on "check your email" rather than
    going straight in — and, per how registration is built, they have to re-enter
    name/surname/phone/grade on first login via the profile-completion screen,
    since those fields can't be saved without a session (see the Phase 3
    `BUILD_LOG.md` entry). Confirm this is the intended trade-off for launch, or
    decide the extra typing is worth avoiding — the alternative is caching the
    entered fields locally until first login, which wasn't built now to keep this
    phase's scope to what was asked.
13. **Supabase's default email sender has a strict rate limit** and this project is
    still using it (hit "email rate limit exceeded" during Phase 3 testing after
    just two attempts). Fine for solo dev testing, not fine for real signups —
    needs a custom SMTP provider configured in the Supabase dashboard before this
    goes anywhere near real users. Not a code change; a dashboard/ops task.
14. **Exact password policy on the live project is still unconfirmed.** `lib/validation.ts`
    enforces a client-side baseline (8+ chars, a letter and a number) as a guess;
    Supabase's actual configured minimum wasn't discoverable through the tools
    available in this session (it's an Auth dashboard setting, not a SQL query).
    The server's own rejection message is always shown too, so nothing is silently
    wrong, but worth checking the dashboard once and tightening the client-side
    check to match exactly.
15. **Needs a real device/manual test pass** (see `BUILD_LOG.md`'s Phase 3 entry for
    the full list): confirming an email, logging in for real, profile-completion
    end-to-end, the paywall screen with a genuinely locked account, and an actual
    Android build (everything so far was checked on the web target only, same
    limitation as Phase 1 — no Android emulator in this environment).
16. **No "set new password" screen exists yet** for the forgot-password deep link —
    this phase's spec only asked for "user enters email, Supabase sends reset
    email," which is what got built. The email will link somewhere the app can't
    yet handle. Needed before forgot-password is actually usable end-to-end, likely
    alongside Google sign-in in a Phase 3 follow-up.

## New from Phase 4

17. **"Delete/archive subject" was built as archive-only (soft delete), not a real
    delete.** Confirm this is actually what's wanted long-term — if a genuine
    permanent-delete is ever needed (e.g. for the 30-day-later purge the original
    product spec mentions), that's new work: cascading deletes of decks/flashcards/
    images/review history for that subject, not built or designed yet.
18. **Subject list has no way to view or un-archive an archived subject yet** — once
    archived, a subject is gone from the UI (though its data is intact in
    Postgres). If students are expected to recover an accidentally-archived
    subject themselves, that's a small follow-up screen; wasn't asked for this
    phase so it wasn't built.
19. **Test-user seeding gotcha, worth keeping for next time a throwaway login is
    needed for manual/browser testing on any Supabase project:** inserting
    directly into `auth.users` needs `confirmation_token`, `recovery_token`,
    `email_change_token_new`, `email_change_token_current`, `email_change`,
    `phone_change`, `phone_change_token`, and `reauthentication_token` set to `''`
    explicitly, not left `NULL` — otherwise GoTrue fails login with `"Database
    error querying schema"` even though the row looks fine in the table editor.

## New from Phase 5

20. ~~"Question/answer image" buttons are visible but disabled ("coming in Phase
    6") — Phase 5 requires text on both sides since images aren't wired up yet.~~
    **RESOLVED, Phase 8 (2026-09-04) — confirmed 2026-09-08, never marked here
    at the time.** Phase 8 loosened validation to "text OR at least one image,
    per side" in both `app/new-card.tsx` and `app/view-cards.tsx`'s edit mode —
    checked directly in the code, not assumed.
21. **No way to rename a card set or move it to a different subject yet** — only
    creating one and adding cards to an existing one were asked for this phase.
    Likely folds into Phase 6's "View Cards" full edit/delete work.
22. **The unsaved-work leave-guard only covers the app's own nav controls**, not
    the hardware back button / swipe-back gesture (see `BUILD_LOG.md`'s Phase 5
    entry for the reasoning). If losing a draft via the OS back gesture turns out
    to bother real users, wiring up `beforeRemove` from the underlying navigator
    is the fix — deliberately not built now.
23. **Card order has no gap-filling or reordering yet** — order is purely
    "append at count(*)". **Update from Phase 6:** archiving a card now leaves a
    gap in `card_order` (e.g. 0, [1 archived], 2) rather than resequencing —
    harmless today since nothing reads `card_order` as a dense/contiguous
    sequence, but worth knowing before Review mode (Phase 7+) is built on top
    of it. No reordering UI exists either (cards display in whatever order they
    were created).

## New from Phase 6

24. **No un-archive path for either card sets or individual cards** — same gap
    as item 18 for subjects, now also true one level down. Data is intact in
    Postgres either way, just nothing in the UI to bring it back.
25. **"Move card set to another subject" was built** (evaluated as simple/safe
    per the phase's own instruction, not deferred) — but there's no equivalent
    for moving a single *card* to a different card set, only whole sets between
    subjects. Not asked for this phase; flagging in case it's expected later.
26. **A real staleness bug was found and fixed this phase** (see `BUILD_LOG.md`
    for the full story): card counts shown at the set level could go stale
    after a card-level archive/edit, because that action's hook didn't know to
    refresh the separate hook holding the counts. Fixed for the two paths that
    exist today (set detail header, returning to the set list) — but the
    underlying pattern (two hooks, one derived count) means any *new* screen
    that mutates cards without also refreshing `useDecks` could reintroduce the
    same class of bug. Worth a quick check whenever Phase 7+ touches cards from
    a new screen. **Checked in Phase 7:** Review mode never mutates
    `flashcards`/`decks` (only inserts into `review_sessions`/`review_answers`),
    so it doesn't touch this class of bug at all — nothing to fix here.

## New from Phase 7

27. **Mid-review exit only covers the in-app "Cancel review" control**, not the
    hardware back button / swipe-back gesture — same deliberate scope cut as
    New Card's Phase 5 guard, for the same reason (see `BUILD_LOG.md`). If a
    student backgrounds the app or swipes back mid-review on a real device,
    progress is silently lost with no warning. Worth a real-device check.
28. **No resume-after-interruption for a review** — if the app is killed
    mid-review (not just navigated away from), there's no draft saved anywhere,
    by design (per "only save completed review sessions"). If that turns out to
    be too harsh in practice (e.g. a phone call interrupting a 30-card review),
    a local-only draft (not a partial DB row) would be the lightweight fix.
29. ~~Time-taken per review isn't shown~~ — **RESOLVED 2026-09-08.** Added a
    "Time taken" row to the Review complete screen (`app/review.tsx`),
    computed client-side from the already-correct `started_at`/`completed_at`
    on the session row returned by `saveReviewSession()` — no new query, no
    schema change. `npx tsc --noEmit` clean.
30. **A browser-testing artifact, not an app bug, worth remembering for future
    sessions:** reusing the same long-lived browser tab across many login/logout
    cycles across different phases eventually left stale client-side state that
    briefly showed the paywall for a valid trial account. A hard reload fixed
    it instantly, and the DB/RLS were independently confirmed correct throughout.
    If a future testing session sees an unexpected access-control result after
    many prior logins in the same tab, try a hard reload before assuming it's a
    real bug. **Update from Phase 8:** the same class of issue showed up again as
    a stale *session* (landed on profile-completion for an account that should
    have been fully set up) — `localStorage.clear()` plus a fresh login resolved
    it. Same root cause, worth recognizing quickly rather than re-diagnosing.

## New from Phase 8

31. **Deleting a user does not clean up their Storage objects — confirmed by
    testing, not assumed.** Deleting the throwaway test account cascaded every
    Postgres table correctly (`profiles` through `card_images`, all the way
    to 0 rows), but the actual image files in the `flashcard-images` bucket
    were untouched — Storage isn't wired into that cascade at all. **This is a
    real gap for the eventual "Delete account" feature** (Settings, explicitly
    not built yet per Phase 4's own instruction): whenever it is built, it needs
    to also enumerate and remove that user's Storage objects, most likely via a
    service-role Edge Function (the client can't do this for a user that no
    longer has a valid session). Not urgent today — no real users exist yet —
    but easy to forget once account deletion is eventually built without this
    specifically in mind.
32. ~~The `uploadCardImage` failure-cleanup branch was not independently
    exercised.~~ **RESOLVED 2026-09-07.** Called the real exported function
    (via a temporary `__DEV__`-gated console hook, removed after use) four
    times against a live max-3-per-side card; the 4th call was rejected and
    its orphaned storage object was confirmed gone via direct query. See
    `BUILD_LOG.md`'s "Phase 8 follow-up" entry for the full record.
33. **The actual gallery/photo-picker tap-through needs a real Android device.**
    Already verified: storage upload with the exact path structure, the
    `card_images` row, the max-3 DB trigger, signed-URL image display in View
    Cards and Review, thumbnail/button variants, add/remove in edit mode. NOT
    yet verified: the `expo-image-picker` permission prompt, multi-select from
    a real gallery, and `expo-image-manipulator` actually resizing/compressing
    a real (multi-MB) camera photo rather than a synthetic 1×1 test JPEG. This
    matches exactly what the phase brief itself flagged as needing Android.
34. **Camera capture was not built** (picker only reads from the photo
    library) — the phase brief allowed leaving it for later "unless very
    simple," and adding it wasn't judged simple enough to bundle in here
    (different permission, different picker call, needs its own test pass).
    `ImagePicker.launchCameraAsync` is the function if/when it's wanted.

## New from Phase 9 (manual/admin activation planning)

35. ~~`computeAccess()` never checks `paid_until` against the current date
    for `status === 'active'`.~~ **RESOLVED 2026-09-07 (Phase 9 Step A).**
    `computeAccess()` (now in `lib/access.ts`) locks access once `paid_until`
    has passed, confirmed both by a 10-case self-check (`lib/access.test.ts`)
    and a live regression pass against the real dev project — see
    `BUILD_LOG.md`'s "Phase 9 — Steps A & B" entry. **Still a real
    operational fact worth keeping in mind:** this only locks the student
    out; it doesn't change `status` back to `expired`/`cancelled` in the
    database, so admin still needs to eventually update the row's `status`
    for accurate record-keeping, even though the student is already locked
    out correctly in the meantime.
36. ~~`subscriptions` RLS has no write policy for any authenticated user.~~
    **APPLIED & VERIFIED 2026-09-07** (migration `admin_rls_and_manual_payment_provider`
    + follow-up hardening migration `admin_rls_hardening_revoke_anon`) —
    `public.is_admin()` plus `profiles_select_admin`/
    `subscriptions_select_admin`/`subscriptions_update_admin` now exist,
    empirically proven with a throwaway admin/non-admin test pair (admin:
    real read + write succeeded; non-admin: both silently denied by RLS).
    **Important scope correction, from the same pass:** this was built
    assuming an in-app AV Flash admin screen (a real Supabase Auth session
    belonging to an admin-role user). Christian has since decided the admin
    screen lives in **Flowmatic Hub** instead, whose backend has no Supabase
    Auth session of its own — see `PHASE_9_HUB_ADMIN_PLAN.md` §4: Hub's
    actual integration will most likely use a `service_role` key (bypassing
    RLS by design, gated by Hub's own access control instead), so this RLS
    path is real, safe, and already verified, but probably isn't what Hub's
    integration ends up calling. Kept anyway — cheap, harmless sitting
    unused, and still relevant if AV Flash's own app ever gets an in-app
    admin surface later.
37. ~~`payment_provider`'s `CHECK` constraint has no explicit "manual"
    value.~~ **APPLIED 2026-09-07**, same migration as item 36 — `'manual'`
    is now a valid value, confirmed both by a successful write during
    testing and a rejected `'stripe'` write proving the constraint is still
    real.
38. ~~Paywall's "Subscribe" button is still a visible placeholder.~~
    **RESOLVED 2026-09-07 (Phase 9 Step B).** The disabled "Subscribe
    (coming soon)" button and the Google Play Billing/PayFast placeholder
    banner are gone; the screen now explains subscriptions are activated by
    AV Flash directly, with no button implying a self-serve checkout exists.
    ~~New, smaller gap: no real contact email in the copy.~~ **RESOLVED
    2026-09-08** — Christian approved a temporary demo contact address
    (`demo@aviflash.co.za`); applied to `app/paywall.tsx`'s banner, labeled
    "(temporary contact)" per his own instruction so it doesn't read as a
    permanent support address, and confirmed rendering correctly against a
    live locked test account. A real, permanent contact channel (or the
    existing-but-unused `support_requests` table wired into an actual
    in-app "request activation" flow) is still open for later — this is
    explicitly a temporary placeholder, not the final answer.
39. **No audit trail exists for manual activations** — acceptable at
    current/expected volume (`subscriptions.updated_at` plus whatever
    record-keeping already happens outside the app is enough for now), worth
    a lightweight log table if volume grows enough that "who changed this
    and when" becomes hard to reconstruct from memory.

## New from Phase 9 (Hub admin tooling — decision moved to Flowmatic Hub)

40. **Christian decided the admin activation/renew/cancel screen lives in
    Flowmatic Hub, not the AV Flash app itself.** Read-only reconnaissance
    of Hub's actual codebase (`PHASE_9_HUB_ADMIN_PLAN.md`) found it's an
    Electron desktop app with its own custom auth, not a website — none of
    Hub's own concepts (Supabase Auth, RLS-based admin access) carry over
    directly; a `service_role`-key-based integration is the fit, not the
    RLS work in item 36.
41. ~~Real conflict: Hub's `stage13-supabase-retired` test.~~ **RESOLVED
    2026-09-07, differently than expected.** The screen was built with the
    Aviflash project's URL and service_role key held entirely in Hub's
    `vault_entries` table, never in source — so the integration genuinely
    triggers none of that test's checks (confirmed: it passes 7/7,
    unmodified). Documented plainly in `BUILD_LOG.md` and a new dedicated
    test rather than left as a silent "it happens not to trip the regex" —
    the transparency this item originally asked for is satisfied by
    disclosure, not by needing an edited test file.
42. ~~No mechanism exists in Hub to grant access to two specific named
    people.~~ **RESOLVED DIFFERENTLY 2026-09-07** — rather than resolving
    which existing personal login is AV Flash's real Peet (item 9 was never
    answered), Christian and Peet now **share one new, dedicated Hub login**,
    `aviflash.admin`, with its own role, `'avflash_admin'`. This sidesteps
    the identity-ambiguity question entirely rather than answering it.
    **A real design mistake was caught before this account was built, not
    after:** the first draft of this gate was `role === 'admin' AND an
    allowlist` — reusing that shape for the new shared account would have
    required giving it the full `'admin'` role just to pass the allowlist
    check, silently granting every other admin capability (finances, every
    other client's data, the vault) along with it. Fixed by using a
    dedicated role instead of an allowlist layered on `'admin'` — see
    `BUILD_LOG.md`'s "shared account, dedicated role" entry for the full
    change. **RESOLVED 2026-09-08:** the `FLOWMATIC_BOOTSTRAP_AVFLASH_ADMIN_PASSWORD`
    idea named here turned out to be dead code (never called from Hub's
    app startup, would have thrown even if it were). Fixed properly by
    widening the Hub's existing Create User screen's role allowlist
    instead (Hub commit `70fc939`, shipped in `v4.22.4`). The
    `aviflash.admin` account now exists and Christian has logged into it
    successfully — see item 46.
43. **The Aviflash `service_role` key still doesn't exist in any vault** —
    the backend code that reads it (`avflashVaultConfig()` in
    `desktop-api-server.js`) is built and fails with a clear, specific
    error ("AV Flash admin is not configured yet...") until a vault entry
    named exactly `AV Flash — Aviflash Supabase (service_role)` is created
    via Hub's existing Passwords → Vault screen, with the Aviflash
    project's REST URL and its service_role key (from the Supabase
    dashboard directly — never seen or handled by this session). Real
    remaining step before the screen does anything. **RESOLVED
    2026-09-08:** the vault entry exists. It initially held a stale/
    incorrect key (caused a `502` on lookup — see item 48), which
    Christian fixed by rotating the key in the Aviflash Supabase project
    and updating the vault entry with the fresh one. Confirmed working
    end-to-end since.
44. **Nothing built this pass has been deployed.** It's source code in the
    local `flowmatic-hub-stage2-fresh` checkout only — no git commit, no
    push, no backend container redeploy, no new installer built or
    published. Hub's own guarded 5-step deploy runbook is a separate,
    explicit action for later.
45. **Hub commit reconciled onto the current mainline, still not pushed.**
    Origin's branch had moved 3 commits ahead (the v4.22.1 security lane —
    masked n8n key status, broader rate limiting, vault reveal audit
    logging) since the AV Flash admin commit was first made. Rebased onto
    it (new SHA, since rebase always produces one), preserving both the
    security work and the AV Flash work, deliberately excluding a third,
    unrelated, still-uncommitted Sales Partner AI/commissions feature
    sitting in the same shared checkout. The one real conflict (the IPC
    handler-count baseline comment, touched by both the rebase and that
    third feature's stash) was resolved to the correct number — verified
    by literally counting `ipcMain.handle(` occurrences, not just doing
    arithmetic — not by picking either side blindly. Re-verified twice
    since (once right after rebasing, once fresh in a follow-up pass): real
    build clean, secret scan clean, all but one pre-existing unrelated test
    still pass (that one asserts a stale IPC count from an even earlier,
    separately-committed feature and isn't this branch's file to fix). See
    `BUILD_LOG.md` for both passes' full detail. Branch is ahead 8/behind 0
    of origin — mechanically push-ready, but not pushed (needs explicit
    approval, per standing instruction).
46. **Hub admin screen smoke test, round 1 (2026-09-08) — partially passed.**
    Restricted-login test **passed**: `aviflash.admin` can log in and sees
    only the AV Flash admin page + Settings, nothing else. Student lookup/
    activate/cancel are **pending, not failed** — there's no known AV Flash
    student account to test against yet (Phase 8 hasn't had real signups).
    See `PHASE_9_TEST_STUDENT_PLAN.md` for the safe next step: create one
    clearly-marked test student, exercise lookup/activate/cancel against
    it, then clean it up. Nothing created, no Supabase touched, no
    service_role key used to write this item.
47. **Test student created (2026-09-08); Hub-side testing is now Christian's
    step.** Email `avflash.smoketest+student1@gmail.com`, created through
    the real app's own Register screen (anon key only, no service_role).
    Confirmed via read-only query: `status = trialing`, 7-day trial, no
    `paid_until` set — a normal fresh signup. **What Christian needs to
    do:** open Hub, log in as `aviflash.admin` (or `admin`), open the AV
    Flash admin page, search `avflash.smoketest+student1@gmail.com`, and
    run through activate/renew → cancel → (optionally) activate again with
    a past date to see the locked state, per `PHASE_9_TEST_STUDENT_PLAN.md`
    §§2–4. This session has no way to drive Christian's own Hub desktop
    session, so this part can't be done here. The test student is
    deliberately left in place (not cleaned up) until that testing is
    done — see item 48.
48. **Hub admin screen smoke test, round 2 (2026-09-08) — FULL PASS.**
    Christian ran lookup/activate/cancel against the item-47 test student.
    Lookup first failed with `Server request failed (502)` — traced (no
    Supabase touched, no key revealed) to a stale/incorrect `service_role`
    key in the Hub's vault entry, not a code defect (see item 43). Fixed
    by rotating the key in Supabase and updating the vault entry.
    Re-tested and **all confirmed passing**: `aviflash.admin` login +
    restricted access, vault/service_role connection, lookup, activate/
    renew, cancel. No real student account was touched. The AV Flash
    admin screen (Phase 9 Steps C/D/E) is now fully verified end-to-end
    in production. **Still open:** cleanup of the test student
    (`avflash.smoketest+student1@gmail.com`) — deliberately left in place,
    needs Christian's separate approval before deleting it or it can just
    be left cancelled, whichever he prefers.
49. **Roadmap review after Phase 9 closed out (2026-09-08).** With the Hub
    admin screen now fully live and tested (item 48), reviewed this whole
    file plus `BUILD_LOG.md` for what's next. **Phase 10 (starter content)
    is numerically next but hard-blocked** — item 4, no real quote text
    exists yet, needs Peet/Christian to source it; nothing to build against
    a placeholder. **Phase 12 (Play Store prep)** is blocked the same way by
    items 2/3/6/7 (account ownership, closed testers, revenue-share/
    payment-platform paperwork, POPIA review) — all business/legal
    decisions, not code. The actual next actionable work is closing out
    real-device testing debt still open from Phases 3 and 8 — see
    `PHASE_8_ANDROID_TEST_CHECKLIST.md` (new) for the exact list and what
    device/emulator Christian needs. Two small, decision-free gaps found
    and closed in the same pass: items 20 and 29 above.
50. **Stale placeholder copy fixed (2026-09-08).** Dashboard and Settings
    subtitles were leftover Phase-1 scaffold text ("Subject selection
    coming in Phase 4...", "...land here over the next phases") never
    updated once those phases actually shipped — Dashboard's was
    genuinely misleading, not just stale, since the features it called
    "coming" are fully built and visible on the same screen. Both changed
    to accurate, calm copy. `npx tsc --noEmit` clean. See `BUILD_LOG.md`
    for the short list of other safe-but-bigger polish items considered
    and not built this pass (un-archive UI, card-set rename, hardware
    back-button guards — the last bundled with the Android test pass
    instead of guessing at UX blind).
