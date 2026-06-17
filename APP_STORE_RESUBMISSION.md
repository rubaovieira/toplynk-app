# App Store resubmission — Guidelines 1.2, 5.1.1(v), 1.5

Submission context: rejection of v1.0 (build 5), review date 2026-06-17.
This document summarizes the changes and the exact steps/notes for App Store Connect.

---

## ① Guideline 1.2 — User-Generated Content

Apple requires: (a) an EULA agreed before registering/logging in that states zero
tolerance for objectionable content and abusive users; (b) a way to flag
objectionable content; (c) a way to block abusive users; and the developer must act
on reports within 24h (remove content + eject the user).

What we implemented:

- **EULA acceptance gate** on the sign-up screen — a mandatory checkbox
  ("I have read and accept the Terms of Use (EULA) and the Privacy Policy,
  including the zero-tolerance policy for objectionable content and abusive users").
  Registration is blocked until it is checked. The login screen also shows a
  "By continuing you agree to the Terms of Use and Privacy Policy" line with links.
- **In-app EULA screen** (`/legal/eula`) with an explicit
  "Zero tolerance for objectionable content and abuse" section and the 24h
  moderation commitment. Reachable from sign-up, login, and Profile.
- **Flag / report content** — on any profile or chat, "⋮" → **Report**, choose a
  reason + optional details → `POST /reports`. Reports are stored
  (`content_reports`) for moderation to act on within 24h.
- **Block abusive users** — on any profile or chat, "⋮" → **Block** (with a
  confirmation). Blocking is enforced server-side: blocked users are removed from
  discovery and matches, cannot open/list/send chats in either direction.
  Manage/undo in **Profile → Blocked accounts**.

### Reviewer notes (paste into App Review notes + record this flow)
1. On the sign-up screen, show the EULA checkbox; tap the "Terms of Use (EULA)" link
   to open the in-app EULA (point out the zero-tolerance section). Show that the
   account cannot be created until the box is checked.
2. Open any user's profile or a chat → tap "⋮" (top right) → **Report** → pick a
   reason → Send. Show the confirmation.
3. Tap "⋮" → **Block** → confirm. Show the user disappears and that they can be
   managed in Profile → Blocked accounts.

---

## ② Guideline 5.1.1(v) — Account deletion

- New **Profile → Delete my account** flow with a clear confirmation modal.
  Calls `DELETE /users/me`. The account is permanently deleted: personal content
  (chats, matches, swipes, notifications, push tokens, blocks) is removed and the
  user record is anonymized (email/name scrubbed, profile/photos/location cleared),
  and `deleted_at` is set so the account can no longer log in. Irreversible.

### Reviewer notes
1. Sign in with the demo account.
2. Go to **Profile** → scroll down → **Delete my account**.
3. Confirm in the modal → account is deleted and the app returns to onboarding.
   (The same email can no longer sign in.)

---

## ③ Guideline 1.5 — Support URL

The previous Support URL (`https://www.toplynk.obora.com.br/suport`, note the typo)
returned an error. New functional static pages were created in
`apps/web-legal/public/` (`index.html`, `eula.html`, `privacy.html`), with a root
`vercel.json` that serves only this folder (no app build).

### Deploy (one command — needs your Vercel login)
From the repo root:

```bash
npx vercel@latest login      # one-time, opens the browser
npx vercel@latest --prod      # deploys; prints the production URL
```

This yields:

- **Support:** `<DEPLOY_URL>/` (help, contact, safety, links to policies)
- **EULA / Terms:** `<DEPLOY_URL>/eula`
- **Privacy:** `<DEPLOY_URL>/privacy`

(Alternatively, host these three HTML files on your existing
`toplynk.com.br` WordPress and use those URLs instead.)

### App Store Connect changes to make
- **Support URL** → set to the new Support page `<DEPLOY_URL>/`.
- **App Review Information → Notes** → paste the reviewer notes above and attach the
  screen recording.
- (Optional) **App Information → License Agreement** → you may paste the EULA text or
  keep the in-app EULA. The in-app gate is what satisfies 1.2.

> ⚠️ Confirm/replace the placeholder support email `suporte@toplynk.com.br` used in
> the app EULA and on the web pages with your real support inbox before resubmitting.

---

## Backend deploy note

A database migration was added (`1746920000000-UgcModerationAndAccountDeletion`):
new tables `user_blocks` and `content_reports`, plus `users.deleted_at` and
`users.eula_accepted_at`. It runs automatically on container start
(`RUN_MIGRATIONS_ON_START=true`). Deploy the API before submitting the build so the
new endpoints exist.

New endpoints: `POST /reports`, `POST/DELETE /users/:id/block`,
`GET /users/me/blocks`, `DELETE /users/me`.
