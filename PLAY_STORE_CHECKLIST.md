# AV Flash — Play Store / Privacy / Terms Checklist (prep for Phase 12)

Status: **checklist only — nothing here has been drafted, submitted, or published.**
Per the weekly worker-plan rules: no live deployment or Play Store submission happens
without Christian's explicit approval. This exists so Phase 12 has a concrete list to
work through once Phases 9–11 are done, not to be actioned now.

## 1. Store listing assets

| Item | Status |
|---|---|
| App icon | Have it — AviFlash logo, already wired into the app (Phase 1) |
| Feature graphic (1024×500) | Not started |
| Phone screenshots (min. 2, Google recommends more) | Not started — needs a real device/emulator to capture from, not the web preview used for dev testing |
| Short description (≤80 chars) | Not drafted |
| Full description (≤4000 chars) | Not drafted |
| App category, tags | Not decided |

## 2. Legal documents — blocked on the POPIA review

`TODO_DECISIONS.md` item 7 already flags that a South African POPIA / minor-consent
review hasn't happened, and it's named as a precondition in three of the original
client documents. **Deliberately not drafting Privacy Policy or Terms of Use text
here** — that's a legal-review deliverable, not something to generate speculatively,
especially given AV Flash's own users are Grade 8+ (very plausibly minors under
South African law, which has specific rules for processing children's data).

What the eventual Privacy Policy needs to accurately cover, based on what's actually
built so far (so whoever drafts it doesn't have to reverse-engineer it from the code):
- Data collected at registration: name, surname, phone, email, birth year, grade/year,
  country (`profiles` table).
- User-generated content: subject/deck/flashcard text and **images the student
  uploads** (`card_images`, private Supabase Storage bucket).
- Review/study history: `review_sessions` / `review_answers` (accuracy over time).
- Where it's stored: Supabase (Postgres + Storage), project `Aviflash`, region
  ap-southeast-2 — this needs to be named accurately in the policy (data residency
  is often asked about explicitly).
- Retention: `subscriptions.data_deletion_scheduled_at` already schedules a 90-day
  window after cancellation/expiry (Phase 2) — but the actual purge job that acts on
  that date isn't built yet (`TODO_DECISIONS.md` item 11). The policy shouldn't
  promise deletion behavior the app doesn't actually perform yet.
- Third parties data is shared with: Supabase (hosting/processor) today; a payment
  provider once Phase 9's decision is made (see that section below).
- Account deletion: Settings' "Delete account" isn't built yet either (Phase 4 note)
  — the policy needs to describe whatever the real flow ends up being, not a
  self-service delete button that doesn't exist.

Terms of Use will need, once drafted: subscription/trial terms (7-day trial, no
permanent free tier — already the app's actual behavior), refund policy (depends on
which payment provider Phase 9 lands on), acceptable use, account suspension/
termination grounds.

## 3. Account & access setup

- [ ] Confirm who owns the Google Play Console account (personal or org) — flagged
      as unconfirmed in the original discovery pass, still true.
- [ ] Recruit **12+ closed testers** — required for a new personal Play Console
      account to graduate out of closed testing; none named in any supplied
      document yet.
- [ ] Confirm EAS Build / app-signing setup (production build profile, keystore
      ownership and backup — losing this key means losing the ability to update
      the app under the same listing).

## 4. Technical release prep

- [ ] Real Android device/emulator pass for **everything built so far** (Phases
      1–8) — every phase in this repo has only been tested via web preview in this
      environment; none of it has run on an actual Android device yet.
- [ ] Low-spec/older device performance check (explicitly called for in the
      original master plan's Phase 12 test list).
- [ ] Production AAB build via EAS (`eas build --platform android --profile
      production`) — not an APK; Play Store requires AAB for new apps.
- [ ] Play Console's Data Safety section filled in accurately — this has to match
      the Privacy Policy exactly (Google checks for consistency), so it can't be
      done before that policy exists.
- [ ] Content rating questionnaire.
- [ ] Tester issue-reporting process — a simple form or support email, decided and
      documented before closed testing starts.

## 5. Full manual test pass (from the original master build plan's own Phase 12 list)

Register, login, Google sign-in (not built yet — Phase 3 follow-up), forgot
password, trial status, expired-subscription lock (paywall — built, needs a real
locked account to verify end-to-end), subjects add/rename/archive, decks/card sets
create/rename/move/archive, flashcards create/edit/archive, images upload/view/
remove (Phase 8 — storage/DB side verified, gallery picker itself still needs a
real device), review mode + scoring + previous-accuracy, logout/login session
persistence.

## Explicitly not done by this checklist

Nothing above has been drafted, filled in, or submitted. No Play Console changes,
no DNS/hosting changes (not applicable to AV Flash anyway — this is a mobile app,
not a website), no live billing. This is a punch list for Phase 12, prepared early
per the worker-plan's "prepare checklists" guidance under Low-risk allowed
behavior — not a signal that release is imminent.
