# Phase 9 — Safe test-student plan for the Hub admin screen

**Status: EXECUTED — full pass, 2026-09-08.** Originally written as
planning only, after a smoke test that passed the restricted-login check
but couldn't test student lookup/activate/cancel (no AV Flash student
account existed yet). Since then:

- §1 was carried out — one test student was created via the app's own
  Register screen (Option A below), email
  `avflash.smoketest+student1@gmail.com`.
- §§2–4 (lookup, activate/renew, cancel) were all run by Christian against
  that test student and **all passed**. Lookup initially returned
  `Server request failed (502)`, traced to a stale/incorrect Aviflash
  `service_role` key in the Hub's vault entry — not a defect in this plan
  or the underlying code. Fixed by rotating the key in Supabase and
  updating the vault entry; re-tested and passed.
- §5 (cleanup) has **not** been done yet — the test student is
  deliberately still in place, pending Christian's separate approval on
  whether to delete it or just leave it cancelled.

Full record: `BUILD_LOG.md`'s "Hub admin screen smoke test, round 2" entry
and `TODO_DECISIONS.md` item 48 (this repo), and
`flowmatic-hub-stage2-fresh/PLANNING/V4.22.4-AVFLASH-ADMIN-FIX-RELEASE-EVIDENCE-2026-09-08.md`
§4 (Hub repo).

The rest of this document is kept as originally written, as the
step-by-step reference for what was actually followed.

Every step below uses only the same tools a real Hub admin or a real AV
Flash student already has — Christian's own Supabase dashboard login and
his own Hub `aviflash.admin`/admin session. No step in this plan needs a
service_role key to be typed, copied, or seen by anyone; the one place a
service_role key is used (the Hub's lookup/activate/cancel routes reading
the vault entry server-side) is existing, already-reviewed code — not
something this plan adds to or changes.

## 1. Create or identify one harmless test student

Two equally safe options — pick whichever is less friction for Christian.

**Option A — sign up through the real app (closest to a real user).**
Run the AV Flash app (Expo dev build, or a real device if Phase 8's build
is installed anywhere) and sign up with a clearly-fake, unmistakably-test
email, for example:

```
avflash.smoketest+student1@gmail.com
```

(the `+student1` alias means it lands in the same real inbox Christian
already checks, but is trivially filterable/searchable and unmistakably
not a real customer). This goes through the app's own public sign-up flow
— the same publishable/anon key every real student's device already uses,
nothing new or elevated. `handle_new_user` (the existing Postgres trigger,
already reviewed in `PHASE_2_SUPABASE_PLAN.md`) fires exactly as it would
for a real signup: creates a `profiles` row and a `subscriptions` row with
`status='trialing'`, `trial_ends_at` = now + 7 days.

**Option B — create the user from the Supabase dashboard directly.**
Aviflash project → Authentication → Add user → enter the same kind of
test email, set any password (or send an invite email — Christian's
choice). This is a normal action inside Christian's own already-authenticated
dashboard session — not an API call, not a key of any kind, same as
Option A in effect: it still fires `handle_new_user` and produces the
same `profiles` + `subscriptions` shape.

**Either way:** use a test email nobody could mistake for a real student,
and note the exact email string somewhere Christian will remember it for
steps 2–5 (a scratch note is fine — it gets deleted in step 5 anyway).

## 2. Test lookup

In Hub, log in as `aviflash.admin` (or as `admin`, which also has this
screen — Christian's own admin login already passed this same UI, just
not the role-restriction check). Open the AV Flash admin page, search by
the exact test email from step 1.

**Expect to see:** the test student's name/email, `status = trialing`,
`trial_ends_at` ≈ signup time + 7 days, `paid_until` = empty/null,
`payment_provider` = empty/null. If the search returns nothing, the most
likely cause is a typo'd email — re-check step 1's exact string before
assuming anything is broken.

## 3. Test activate/renew without affecting a real user

The screen's own design is what makes this safe: every action targets
whatever email was just searched for, resolved to that one user's row —
there's no student list, no "select all," no way to act on a batch. The
actual safety step is simple and manual: **before clicking Activate,
visually confirm the name/email shown on screen is the test student's,
not anyone else's** — same discipline as double-checking a payment
recipient before confirming a transfer.

Enter a `paid_until` date a few days in the future, submit. Re-run the
lookup from step 2 and confirm: `status = active`, `paid_until` = the
date just entered, `payment_provider = manual`.

## 4. Test cancel/expire

**Cancel:** re-lookup the same test student, use the Cancel action.
Re-lookup again and confirm `status = cancelled`, and — per the screen's
own documented design — `paid_until` is left exactly as it was, not
cleared (cancellation records history, it doesn't erase it).

**Expire (the "subscription lapsed" state, not the same as cancel):**
there's no dedicated "expire" button — the way to reach that state is to
use Activate/Renew again but enter a `paid_until` date in the past (e.g.
yesterday). Whether the date field accepts a past date at all is worth
noting as an observation during this test, not assumed beforehand. If it
does: confirm the Hub lookup still shows `status = active` with a past
`paid_until` (this is the exact shape `computeAccess()` was fixed to
catch in Phase 9 Step A). Then, to close the loop end-to-end, sign into
the AV Flash app itself as the test student and confirm the paywall shows
"Your subscription ended on `<that date>`" rather than granting access —
this is the one part of the test that verifies the Hub write and the
app's own read/lock logic agree with each other, not just that the Hub
screen looks right in isolation.

## 5. Clean up / reset afterward

Do this regardless of whether every check above passed — a synthetic
account has no reason to sit in the live production database once its
job is done.

1. **Quick option:** leave it in the `cancelled` state from step 4. A
   cancelled test account is harmless and indistinguishable from a real
   cancelled user's row.
2. **Full removal (recommended once testing is done):** Supabase
   dashboard → Authentication → find the test email → Delete user. This
   is, again, a normal dashboard action inside Christian's own session —
   not an API call. Worth a quick visual check in Table Editor afterward
   that the matching `profiles` and `subscriptions` rows are gone too
   (they're expected to cascade-delete with the `auth.users` row per the
   Phase 2 schema design, but confirming once is cheap and removes any
   doubt rather than assuming).

## What this plan deliberately does not do

No student was created, no Supabase action taken, and no service_role key
used to write this document. It also doesn't touch Play Store, payment
providers, n8n, or any Hub deploy/publish/tag step — none of that is
needed to run this test, and none of it is in scope here.
