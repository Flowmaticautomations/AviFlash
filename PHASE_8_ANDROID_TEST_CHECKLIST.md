# Phase 8 — Android real-device test checklist

Planning only — nothing in this checklist has been run. Written because
Phase 8 (image support for flashcards) is fully built and passed every
check this environment can perform, but a real Android device is needed
for the rest — the exact gap Phase 8's own brief called out ("final
gallery testing must happen on Android"). See `BUILD_LOG.md`'s Phase 8
entry for the full detail behind each item below.

## What device/emulator you actually need

**Simplest path — no EAS account, no Play Console, no cost:** install
**Expo Go** from the Play Store on any Android phone, then from this repo
run:
```
npx expo start
```
and scan the QR code. This runs the exact same JS bundle as the web
preview, but on real Android — real camera, real gallery, real photo
file sizes. This is enough for everything in §1 below.

**An Android emulator (Android Studio's AVD) is a partial substitute**,
not a full one: it can exercise the permission-prompt flow and multi-select
UI using synthetic images pushed into its virtual Photos app, but its
"camera" is either a webcam passthrough or a fully synthetic test pattern
— it won't produce a genuine multi-megabyte JPEG the way a real phone
camera does, which is specifically the case §1.3 below needs to prove.
Fine for a quick UI sanity check; not a substitute for the real thing.

No EAS build is needed for this pass — item 2 in `TODO_DECISIONS.md`
(Expo/EAS/Play account ownership) is still an open decision, and Expo Go
sidesteps it entirely for this level of testing.

## §1. Phase 8 — image support (the primary gap)

Everything below was already verified against the real dev database via
direct REST calls standing in for the picker (see `BUILD_LOG.md`) — what's
untested is specifically the native picker/camera interaction itself.

1. **Photo-library permission prompt** — tap "add image" on a card for the
   first time this install. Confirm the OS permission dialog shows the
   configured message ("AV Flash needs access to your photos so you can
   add images to your flashcards.") and that both Allow and Deny are
   handled gracefully (Deny shouldn't crash the app — confirm it just
   returns to the form with no image added).
2. **Multi-select from the real gallery** — New Card screen, add up to 3
   images to one side in a single picker session. Confirm all 3 land as
   separate staged images, not merged/overwritten.
3. **Real photo compression** — pick a normal, unedited modern phone photo
   (typically 2–8 MB). After it uploads, confirm in Supabase Storage
   (Table Editor or dashboard file browser) that the stored file is
   meaningfully smaller (`compressImage()` targets 1280px max dimension,
   JPEG quality 0.7) — this is the one thing a synthetic 1×1 test JPEG
   could never prove.
4. **View Cards, edit mode, on a real photo** — confirm the thumbnail
   renders correctly (not stretched/rotated wrong — real phone photos
   carry EXIF orientation data a synthetic test image doesn't), the ×
   remove button works, and re-adding up to the 3-per-side cap still
   triggers the same "Max 3 images" disabled state already confirmed via
   direct API calls.
5. **Review mode, real images** — open a card with real photos in Review,
   confirm "View Question image (N)" / "View Answer image (N)" buttons
   appear at the right point (answer-side only after "Show Answer"), and
   the modal preview renders correctly at real resolution, not just the
   1×1 black square already proven in the browser-token test.
6. **Reject-at-4 with a real picker session** — attempt to add a 4th image
   to a side that already has 3. Confirm the picker either can't be
   opened (button already disabled, per current UI) or, if reached
   anyway, the same trigger-rejection message already confirmed
   server-side surfaces cleanly in the UI rather than as a raw error.

## §2. Worth bundling into the same device session (not new Phase 8 work)

These are still-open real-device gaps from **Phase 3**, unrelated to
images specifically, but efficient to check in the same sitting rather
than a separate device pass later (`TODO_DECISIONS.md` item 15):

- Confirming a real signup email and completing the "check your email"
  flow end to end.
- Logging in for real afterward, confirming profile-completion asks for
  the fields that couldn't be saved before a session existed.
- Seeing the paywall screen render correctly for a genuinely locked
  account (not just via the browser dev-tools technique used so far).
- Confirming the app installs and launches cleanly as an actual Android
  build (Expo Go still counts as "real Android," just not yet a
  standalone installed APK — that's the separate EAS-build step item 2
  blocks, not needed for this checklist).

## What this checklist does not cover

Camera capture (`ImagePicker.launchCameraAsync`) isn't built yet — Phase 8
deliberately shipped gallery-only (see `TODO_DECISIONS.md` item 34). This
checklist is only for what's already built and waiting on a real device to
confirm; it's not a request to build camera capture.

## Reporting back

For each numbered item above: pass/fail, and for any fail, exactly what
happened (screenshot if easy) — same level of detail `BUILD_LOG.md`
already uses elsewhere in this repo, so a future session can act on it
without needing to ask follow-up questions.
