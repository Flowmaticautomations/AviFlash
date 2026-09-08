# AV Flash — Phase 9 Steps A & B: Handoff for Christian & Peet

**2026-09-07. This is a summary for review, not a technical build log** (that's
`BUILD_LOG.md`, if either of you ever wants the full detail). Nothing below
requires any action except §3 and §4, which need a decision before the next
piece of work starts.

## 1. What changed

AV Flash's billing model for now is **manual activation** — Peet/Christian
mark a student as paid after receiving payment outside the app (bank
transfer, etc.), not an in-app checkout. Two small, safe pieces of that were
built this pass:

- **A — fixed a real gap:** previously, once a student was marked "active,"
  the app never checked whether their paid period had actually ended. A
  manually-activated student would stay unlocked forever unless someone
  remembered to go back and change their status by hand. Now the app checks
  the paid-through date itself and locks the student out automatically once
  it passes — no one has to remember to do it.
- **B — rewrote what a locked-out student sees.** The old screen had a
  "Subscribe" button that didn't do anything (payment wasn't built yet) and
  talked about Google Play Billing / PayFast still being decided — both
  accurate at the time, both stale now that manual activation is the actual
  plan. The screen now explains that AV Flash activates subscriptions
  directly, with the exact date something expired shown to the student.

**Not built yet, on purpose:** anything Peet/Christian would use *from
inside the app* to actually activate a student — that's still just a plan
(§4 below), no code exists for it.

## 2. What a student sees now, in each state

| Situation | What they see |
|---|---|
| **On the 7-day free trial** | Normal use of the app, with a banner: "Trial active until {date}." Unchanged from before. |
| **Manually activated (paid)** | Normal use of the app, with a new banner: "Active until {date}." This is new — previously a paid student had no way to see when their access actually ran out. |
| **Trial ended, never paid** | Locked out. Screen says: "Your 7-day free trial ended on {date}." plus an explanation that AV Flash activates subscriptions directly (no self-serve checkout exists), and a note to contact AV Flash to activate. |
| **Was paid, that period has now ended** | Locked out (this is the new part — see §1). Screen says: "Your subscription ended on {date}." with the same contact explanation. |
| **Cancelled by admin** | Locked out. Screen says: "Your subscription was cancelled." — distinct wording from "ended," since these mean different things (a student stopping vs. simply not renewing). |

## 3. Decision needed from Peet: the contact method

The locked-out screen currently says "Contact AV Flash to activate or renew
your subscription" — **with no actual email, phone number, or WhatsApp
listed**, because none was invented for this pass. Peet needs to supply:

- The actual contact detail (email/phone/WhatsApp — whichever is real) to
  put in that sentence, **and**
- Sign-off on the exact wording — it's customer-facing text and should read
  the way Peet wants a locked-out student to be spoken to, not just
  whatever got drafted here.

This is a small, low-risk change to make once the answer exists.

## 4. Decisions needed before the admin-tooling work (not started)

Three more pieces were planned but **deliberately not built this pass**:
a screen for Peet/Christian to look up a student and see their subscription,
the database permission change that screen needs to work at all, and the
actual activate/renew/cancel buttons. Before any of that starts, both of you
need to weigh in on:

1. **Is an in-app admin screen actually wanted yet?** Right now, activating
   someone manually can already be done today — via the Supabase project's
   own dashboard (the database AV Flash runs on) — with zero new building.
   An in-app screen is nicer, but is real work, and only worth it once
   looking things up in the database directly becomes a real bottleneck.
2. **Applying the database permission change** — a specific, already-drafted
   change that lets an admin account read and update *other* students'
   subscription records (nobody can do that today, including Christian/Peet,
   without going into the database directly). This needs your go-ahead
   before it's applied — nothing has been applied yet.
3. **Who actually gets admin access?** Christian, Peet, both? Whoever holds
   it can see every student's account details and change anyone's paid
   status, so this shouldn't default to "whoever built the feature" — it's
   your call.

Until these three are answered, the current state (Steps A & B, live in the
app; admin tooling, planned but not built) is a safe place to sit — nothing
is broken, nothing is missing that blocks manual activation from happening
today via the database dashboard.

## 5. Confirmation

No code was touched to produce this document, no database change was made,
no Play Store activity happened, and no payment provider was touched — this
is a summary of Steps A and B, which were built and tested in the prior
session (see `BUILD_LOG.md`'s "Phase 9 — Steps A & B built" entry for the
full technical record, including the live test pass against a throwaway
account).
