# MOODCHAT — Single-File Messenger

A complete, production-style messenger built as **one single `index.html`** (HTML in `<body>`, CSS in `<style>`, JavaScript in `<script type="module">`). The only extra files are the OneSignal service worker, the Netlify push function, and the security-rules / config files described below.

> **REMEMBER: the main app is only one single `index.html` file. No multi-file frontend architecture.**

---

## ✨ Features

| Area | What you get |
|---|---|
| **Auth** | Supabase **Email OTP** (6-digit code), remember-me / auto-login, profile setup (name, unique username, avatar via Cloudinary) |
| **Material You theming** | Dynamic palette generator, theme modes (System / Light / Dark / From-wallpaper / Manual), accent colors, bubble styles, live preview, reset |
| **Wallpapers** | 8 gradient categories, global **and** per-chat, dim / blur / bubble-opacity sliders, preview, saved to Firebase + localStorage. Text stays readable |
| **Friend requests** | pending / accepted / rejected / blocked; chat locked until accepted; only one request message; only the receiver accepts/rejects |
| **Messages** | text / image / video / voice / sticker / doodle / call-log / system; reply, edit, delete-for-me, unsend, retry, timestamps, date separators, unread counts, last-message preview |
| **Ticks** | clock = sending · 1 gray = sent · 2 gray = delivered · 2 blue = seen · red = failed (seen gated by `document.visibilityState` + active chat) |
| **Presence** | online / offline / last seen / **typing…** / **recording voice…** via Realtime Database + `onDisconnect` |
| **Voice notes** | MediaRecorder, timer, animated bars, cancel/send, WhatsApp-style playback, uploaded to Cloudinary |
| **Calls** | WebRTC audio + video, incoming/outgoing UI, mute, camera toggle, switch camera, speaker, timer, call log, RTDB signaling |
| **Emoji & stickers** | categorized emoji picker + recents; sticker packs + recents (SVG data-URI placeholders) |
| **Doodle** | full-screen vector canvas (pen / highlighter / arrow / eraser), undo/redo/clear, strokes stored as JSON and **re-rendered to canvas** inside the chat |
| **Drag system** | long-press a doodle/sticker → move, pinch-scale, two-finger rotate, kept in bounds, z-index layering (transform saved separately from the drawing) |
| **Nicknames** | Instagram-style, chat-specific (`chats/{chatId}/nicknames/{userId}`), system messages on change/remove, shown in header / sender name / profile popup / conversation list, real-time |
| **Push** | **OneSignal** Web Push (frontend subscribes; Netlify function sends server-side) |

---

## 📁 Files

```
index.html                         ← the entire app (HTML + CSS + JS)
OneSignalSDKWorker.js              ← OneSignal service worker (MUST be at site root)
netlify/functions/sendNotification.js  ← serverless push sender (uses REST API key)
netlify.toml                       ← Netlify build + headers config
firestore.rules                    ← Firestore security rules
database.rules.json                ← Realtime Database security rules
README.md                          ← this file
```

---

## 🔑 Credentials (already integrated in `index.html`)

These are wired into the `// PASTE ... HERE` config block at the top of the module script.

| Service | Value used |
|---|---|
| **Supabase URL** | `https://pupwtdupqcbceahmgrwc.supabase.co` |
| **Supabase anon key** | `sb_publishable_dnyeFg6dYj5fYGKhqQHWwA_-tvrSXc0` |
| **Firebase project** | `moodchat-f13a0` |
| **Firebase databaseURL** | `https://moodchat-f13a0-default-rtdb.firebaseio.com` |
| **Cloudinary cloud** | `djlt2chgd` |
| **Cloudinary preset** | `moodchat_media_unsigned` (unsigned) |
| **OneSignal App ID** | `0e5b7061-29ed-4647-acc7-f032f75e4f09` |
| **OneSignal Safari Web ID** | `web.onesignal.auto.3d9f0610-6ae1-419f-862e-705396ff3ef1` |
| **OneSignal REST API key** | **server-side only** — set as a Netlify env var, never in `index.html` |

---

## ⚙️ Setup — step by step

### 1) Supabase (Email OTP)
1. Supabase Dashboard → **Authentication → Providers → Email** → enable.
2. **Authentication → Email Templates → Magic Link / OTP**: make sure the template includes the `{{ .Token }}` (6-digit code).
3. **Authentication → URL Configuration**: add your site URL (e.g. `https://gensgithub.netlify.app`) to **Site URL** and **Redirect URLs**.
4. Nothing else — the app calls `signInWithOtp` then `verifyOtp`.

### 2) Firebase
1. Firebase Console → create / open project **moodchat-f13a0**.
2. **Build → Firestore Database** → Create database.
3. **Build → Realtime Database** → Create database → copy the URL into the config if different.
4. Paste **`firestore.rules`** into Firestore → Rules → Publish.
5. Paste **`database.rules.json`** into Realtime Database → Rules → Publish.
6. (Optional) create the composite index Firestore suggests for the user-search query (`username >= / <=`).

> The rules ship in **DEV/DEMO** mode (open) because the app uses **Supabase auth, not Firebase Auth**, so `request.auth` is null. For real production, see **"Locking down Firebase"** below.

### 3) Cloudinary
1. Cloudinary Dashboard → **Settings → Upload → Upload presets**.
2. Create an **unsigned** preset named exactly `moodchat_media_unsigned`.
3. (Recommended) restrict allowed formats / max file size on that preset.

### 4) OneSignal (Web Push)
1. OneSignal → your app → **Settings → Web** configuration.
2. Site URL: `https://gensgithub.netlify.app` (or your domain).
3. Make sure the **service worker path** is the root: `OneSignalSDKWorker.js` (already provided).
4. Frontend uses only the **App ID** + **Safari Web ID** (already in `index.html`).
5. The **REST API key** goes into Netlify env vars (next step) — never the frontend.

### 5) Netlify
1. Connect the GitHub repo `Horizon003/Mood-Chat1` (branch `main`) to Netlify.
2. Build settings: no build command needed; **publish directory = `.`**, **functions directory = `netlify/functions`** (already in `netlify.toml`).
3. **Site settings → Environment variables**, add:
   ```
   ONESIGNAL_APP_ID        = 0e5b7061-29ed-4647-acc7-f032f75e4f09
   ONESIGNAL_REST_API_KEY  = <your os_v2_app_... REST key — keep secret>
   FIREBASE_DATABASE_URL   = https://moodchat-f13a0-default-rtdb.firebaseio.com
   ```
4. Deploy. The push endpoint will be:
   `https://gensgithub.netlify.app/.netlify/functions/sendNotification`
   (the app already points `NETLIFY_SEND_NOTIFICATION_URL` at the relative path, which works on the same domain).

---

## ⚠️ Netlify-specific changes you must make

1. **Place `OneSignalSDKWorker.js` in the repo root** (it already is). Netlify serves it at `/OneSignalSDKWorker.js`.
2. **Add the 3 environment variables** above (the REST API key is required to actually send pushes).
3. Keep `netlify.toml` at the repo root so the function + headers deploy.
4. If you use a **custom domain**, update `web_url` inside `netlify/functions/sendNotification.js`.

---

## 🔒 Locking down Firebase for real production (recommended)

Because the client signs in with Supabase, Firebase sees no auth token. Two options:

- **Quick/demo:** keep the open rules (fine for testing, **not** safe for public launch).
- **Proper:** in the Netlify function (or a new one), mint a **Firebase Custom Token** from the verified Supabase session, return it to the client, call `signInWithCustomToken()`, then enable **MODE B** rules in `firestore.rules` and tighten `database.rules.json`. After that `request.auth.uid` equals the MOODCHAT uid and all per-user/per-chat checks apply.

---

## 🧪 Testing checklist

- [ ] Open the site → splash → **Email OTP**: enter email, receive 6-digit code, verify.
- [ ] First login → **profile setup** (name + unique username + avatar) saves.
- [ ] Reload with "Keep me signed in" → **auto-login** works; unchecking logs out on reload.
- [ ] **Search** a user by username/email → send a **chat request** with one message.
- [ ] Second account: request shows in **Requests** tab → **Accept** → chat unlocks; **Reject** locks it.
- [ ] Send **text**; verify **ticks** progress sending → sent → delivered → seen (blue).
- [ ] Open chat on receiver while visible → sender sees **blue ticks**; background → stays delivered.
- [ ] **Typing…** and **recording voice…** appear in the header.
- [ ] **Voice note**: hold mic → timer + bars → send → playback works.
- [ ] **Image/video** attach → uploads to Cloudinary → tap opens **full-screen viewer**.
- [ ] **Emoji** picker inserts at cursor + recents; **stickers** send + recents.
- [ ] **Doodle**: draw → send → renders in chat (canvas) → long-press → **move/scale/rotate**.
- [ ] **Reply / edit / delete-for-me / unsend** all work.
- [ ] **Nicknames**: set/remove → system message appears → header + list update live.
- [ ] **Theme**: switch modes, change accent, bubble style, reset → live preview.
- [ ] **Wallpaper**: pick global + per-chat, adjust dim/blur/opacity → text stays readable.
- [ ] **Calls**: audio + video, accept/reject/end, mute, camera toggle, switch camera, call log saved.
- [ ] **Push**: enable notifications in Settings → second device/account receives a OneSignal push when you're not active in that chat; clicking it opens the chat.

---

## 🚀 Production checklist

- [ ] Switch Firebase rules to **MODE B** + custom-token sign-in.
- [ ] Add a **TURN server** to `ICE.iceServers` in `index.html` (STUN alone fails on strict NATs).
- [ ] Lock the Cloudinary unsigned preset (formats, size, moderation).
- [ ] Set Supabase **Site URL / Redirect URLs** to the production domain.
- [ ] Set all Netlify env vars (REST API key secret).
- [ ] Verify `OneSignalSDKWorker.js` is reachable at `https://YOUR-SITE/OneSignalSDKWorker.js`.
- [ ] Test push on real iOS/Android/desktop browsers (HTTPS required).
- [ ] Review Firestore indexes for the search + chat queries.
- [ ] Add rate-limiting / abuse protection to the Netlify function if exposing publicly.
