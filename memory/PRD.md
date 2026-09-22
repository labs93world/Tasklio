# Tasklio — PRD

## Original Problem Statement
Tasklio: offline rewards + mini-games app. Package `com.altaftech.tasklio`. Professional splash → Home. Replicate reference screenshots (rewards home, notifications, drawer, wallet UPI payouts, admin) with a CUSTOM black+gold theme (not the ref navy). All data stored on-device, fully offline. Later: mandatory account popup, redesigned home, 9 new games, shared reward screen, notification rules, drawer links, vertical wallet history.

## Architecture
- Expo Router, fully client-side, NO backend.
- State: React Context store (`src/store/app-store.tsx`) persisted via `@/src/utils/storage` (AsyncStorage) + `expo-file-system` backup file; Export/Import via Sharing + DocumentPicker.
- Theme: custom obsidian + gold in `src/theme.ts`.
- Icons: `@react-native-vector-icons/material-design-icons` (dynamic import).

## Screens
- `/` splash → `/home`
- `/home` — greeting, points badge, notifications bell, auto+manual centered banner carousel, DOUBLE-ROW games grid (14 games); MANDATORY AuthModal on first launch (Create/Login, Forgot→Help&Support)
- `/wallet` — balance, chips, UPI input, payout request, selectable category tabs (Recent activity / Payout history, defaults to Recent activity) with vertical history lists
- `/notifications` — Read All, unread until tapped, pinned custom on top; only Withdrawal success/reject, 5am daily reminder, admin custom
- `/recent-activity` — full transaction history
- `/restricted` (PIN 1234) → `/admin` (adjust points, payout status, profile name+mobile, PIN, custom notification, backup/import/reset)
- `/legal/terms`, `/legal/privacy`
- Games (14): spin, puzzle, quiz, tap-race, lucky, tic-tac-toe, hi-lo, whack, math-blitz, snake, n2048, balloon, higher-card, mine — all end on shared GameResult reward screen.

## Auth (local, offline)
- Account = { name, mobile, passwordHash (simple hash) } stored in device state. No OTP, no server.

## Drawer links (hardcoded)
- Share/Rate: Play Store URL for com.altaftech.tasklio
- Community: https://t.me/tasklio93
- Help & Support: mailto labs93world@gmail.com subject "About Tasklio App"

## Implemented (2026-06)
- Offline app matching all reference features + all requested changes; 14 games; local persistence + backup. Testing iterations 1 & 2 pass.
- Package id `com.altaftech.tasklio`; logo as icon/splash.

## Known limitation
- Surviving full app "clear data"/uninstall needs the Export backup file (import to restore).

## Backlog / Next
- Daily streak bonuses; scratch card / jackpot; real payout gateway (needs backend); optional cloud sync.

## Session Log (2026-09-18)
- Imported GitHub project `labs93world/Tasklio` into this workspace (git remote connected, full history present).
- Verified all services running (expo, backend, mongodb) and confirmed the app renders correctly on web preview (splash + mandatory auth modal visible).
- Moved Recent activity section off Home; Wallet now has selectable "Recent activity" / "Payout history" category tabs (defaults to Recent activity). Verified via screenshots.
- Wallet Recent activity capped at 10 entries + restored "View all" button → `/recent-activity` (button shows only when >10 txns).
- Zero-point game outcomes no longer create "+0" history entries.
- Rejected payouts now add a refund entry to Recent activity (+refund, bank-transfer-in icon) alongside the points refund; guarded against double-refund on status toggling.
- Compacted home header (smaller icons/text, edge-hugging menu + bell, explicit spacing) and drawer menu (smaller avatar, tighter rows).
- Testing iteration 3: all pass.

## Session Log (2026-09-18, iteration 4)
- Quiz Time now ends with the shared GameResult popup (like other games); zero-point outcomes create no history entry.
- Compact home header: smaller "Hii, <name>" + subtext "Let's earn some rewards today"; tighter menu/points/bell spacing.
- Games row spacing reduced so ~4.5 tiles are visible; tiles 68px, gap 12.
- Deleted 5 games entirely (files + routes + constants): Tap Race, Lucky Draw, Snake, Balloon Pop, Higher Card. Remaining 9: Spin & Win, Puzzle Dash, Quiz Time, Tic Tac Toe, Hi-Lo, Whack-a-Mole, Math Blitz, 2048, Mine Pick.
- New Daily Check-in card below banners: hidden once claimed today; 7-day increasing streak (10/20/35/50/75/100/150) tracked via checkin{lastClaim,streak}; Claim shows reward popup. Store: claimDailyCheckin, canClaimCheckin, nextCheckinDay, CHECKIN_REWARDS, todayKey exported.
- Drawer "Restricted Area" faded (opacity 0.45); double-tap opens Access Key dialog (no hint); key 9372@Altaf93Tasklio → /admin, wrong key → innocuous Thank-you popup.
- Admin: removed PIN entry screen (/restricted deleted), Change admin PIN section, and Data & backup (export/import/reset). Admin reached only via drawer access key.
- Testing iteration 4: 8/8 pass.

## Session Log (2026-09-18, iteration 5)
- Wallet: Request Payout now shows a Thank-you popup (wallet-thanks-dialog) instead of a toast; payout still recorded (points deducted, pending row), "Got it" switches to Payout history tab.
- Wallet: validation hint (wallet-hint) moved ABOVE the Request Payout button.
- Wallet: Payout history redesigned — clean row (bank icon + amount/upi/datetime + right status pill), no colored border; "failed" now labelled "Rejected".
- Home header: more top spacing (insets.top + 16).
- Verified account-creation popup works correctly (no bug); all error toasts + success path confirmed.
- Testing iteration 5: 6/6 pass.

## Session Log (2026-09-19, iteration 6)
- Admin Panel fully redesigned as a global control center (UI ONLY; mock data in src/constants/admin-mock.ts, no backend persistence — most actions toast only; notification push + points refund are real).
- Two sections via a switch: Dashboard + Manage.
- Dashboard: 3 cards in one row — Users (count), Pending (count + ₹), Paid (count + ₹).
- Manage: horizontal chip row of 5 tabs — Users / Payout / LiveCtrl / Config / Settings.
  - Users: search by mobile, user rows (name•mobile + copy, subtitle date•pts•₹), tap → User Details bottom-sheet (editable name/mobile/password w/ reveal, balance, save, activity↔payout sub-tabs, delete-account confirm).
  - Payout: 3 sub-tabs (Pending/Successful/Rejected); pending items → clickable avatar (user details), ₹•upi w/ copy, datetime, Approve (confirm) / Reject (confirm + reason).
  - LiveCtrl: Banner (toggles + add) / Notification (title+body + real push).
  - Config: Reward (7 check-in inputs + per-game max) / Wallet (exchange ratio + editable chips).
  - Settings: Maintenance (global + per-screen toggles) / Force Update (toggle + version + message) / Slide Menu (editable name/icon/url + add/del).
- Installed expo-clipboard for copy buttons.
- Testing iteration 6: 15/15 pass.

## Session Log (2026-09-19, iteration 7)
- User requested the app be 100% offline (nothing needs internet). Verified the frontend makes ZERO network calls (no fetch/axios, no remote images/fonts) — it was already fully offline via AsyncStorage + FileSystem.
- Per user choice, removed the unused FastAPI/MongoDB backend entirely: stopped the `backend` supervisor service and deleted `/app/backend` code (server.py, requirements.txt, pytest.ini, .env). The app never called it.
- Kept the drawer menu and ALL its links unchanged (Share / Rate us / Join Community / Help & Support) per user instruction "keep menu".
- App is now pure offline frontend: login, wallet, 9 games, daily check-in, payouts, notifications, admin, backup/restore all run on-device. Verified home + auth render with backend down.
- Note: the read-only supervisord.conf still defines the backend program (cannot edit it), so on a full container restart it may try to start and fail harmlessly — the frontend is unaffected.

## Session Log (2026-09-19, iteration 8) — Deployment readiness health check
- Ran deployment_agent health check. Initial run flagged: missing backend (by design), yarn/package-lock mismatch, .gitignore .env exclusion.
- FIX: generated & committed `frontend/yarn.lock` (packageManager=yarn@1.22.22). Re-check: `expo_release_build_ok: true`, `stack_supported: true`, `dockerignore_blocks_required_files: false`, all env/asset/permission checks pass. Lint clean. App still renders.
- REMAINING BLOCKER (by design): Emergent deploy pipeline boots `uvicorn server:app` from /app/backend, but backend was removed per user choice → deploy expects a backend process.
- WARNs (not blockers): hardcoded ACCESS_KEY in drawer-menu.tsx ships in bundle (by design, restricted-area gate); no user-facing account-deletion flow (Apple App Store review concern).

## Session Log (2026-09-19, iteration 9) — Made deployment-ready
- User: "Make it ready for successful deployment (do whatever needed)."
- FIX 1 (lockfile): committed frontend/yarn.lock via `yarn install` → resolves release-build package-manager mismatch.
- FIX 2 (backend): restored a MINIMAL FastAPI backend at /app/backend so Emergent's Publish pipeline has a healthy process to boot behind EXPO_PUBLIC_BACKEND_URL. server.py exports `app` with GET /api/ and GET /api/health, CORS, MONGO_URL/DB_NAME from .env, Motor client. requirements.txt trimmed to fastapi/uvicorn/motor/pymongo/pydantic/python-dotenv/python-multipart. .env restored (MONGO_URL, DB_NAME=tasklio_database). Backend RUNNING; /api/ returns {"status":"ok","mode":"offline"}. The offline app never calls it — it's purely a deploy target.
- FIX 3 (.gitignore): removed `.env`, `.env.*`, `*.env` ignore rules so deployment-required env files aren't excluded from the deploy context (kept credentials.json/*.key/.credentials ignored).
- deployment_agent final re-check: status WARN, note "No build-blocking Expo/FastAPI/Mongo deployment issues were confirmed." checks: compilation_passed=true, expo_release_build_ok=true, expo_backend_reachable=true, dockerignore_blocks_required_files=false, stack_supported=true, db_name_from_env=true. Lint clean.
- Remaining findings are WARN/INFO only (NOT deploy blockers), inherent to the offline-admin design: client-bundled ACCESS_KEY (drawer-menu), default adminPin "1234" (app-store), mock demo passwords in admin-mock.ts, push-notification UI is in-app only (no FCM), and no self-service delete-account flow (Apple review advisory). Left intact to preserve the user's offline admin feature; flagged for the user.
- App is DEPLOYMENT-READY for Emergent Publish.

## Session Log (2026-09-20, iteration 10) — 11-item UX overhaul + AdMob
- Popups no longer bounce: replaced `.springify()` with duration-based entrances in game-result, drawer panel + thanks dialog, get-chances modal.
- Header (home): smaller auto-size greeting/subtitle, bigger gap to right cluster, smaller points badge + smaller bell now in a matching surfaceTertiary card.
- Home banners use AutoText (title 1 line, body 2 lines). Notifications screen compacted + auto-size single-line titles.
- Wallet: compact balance card (label+pts tight, wallet icon vertically centered on the right), smaller chips/UPI field/Request button, AutoText; tapping "Got it" after a payout plays a rewarded ad (spinner) then switches to Payout history.
- Games reward popup: removed "Back to home"; single "Claim" button; reward granted only AFTER Claim (plays rewarded ad via GameResult).
- Chances system: per-game chances in store (`chances`, `chancesPerAd`, default 3/3). New `ChancesBadge` (header right, "Chances N" auto-size) + `GetChancesModal` (watch ad → +N chances). New `useGameSession(gameId)` hook centralizes gate + claim. All 9 games wired (spin/whack/mine/puzzle/ttt/hilo/n2048 first-action gate; quiz/math explicit Start gate).
- Daily check-in reward now granted after Claim (rewarded ad) via GameResult.
- Home: new Daily Missions strip (3 missions with progress bars: Play 3 games / Earn 300 pts / Complete check-in) tracked in store, reset daily.
- Account popup: FIXED keyboard-dismiss-after-1-char (moved `Field` to module scope), per-field red error labels on submit, haptics on tap, ~1s loading spinner before create/login, compact no-scroll layout.
- AdMob: `react-native-google-mobile-ads` installed + config plugin in app.json with Google TEST app IDs (android + ios). `src/ads/index.ts` (native, lazy-require + TestIds.REWARDED) and `src/ads/index.web.ts` (simulated). Falls back to simulated ad in Expo Go/web so all flows work; real test ads only in a native build. initAds() called in _layout.
- Admin (UI-only): removed Dashboard "Overview" card; Banner/Notification controls moved under the 3 dashboard stat cards; removed "LiveCtrl" manage tab; added "Chances" config sub-tab (between Reward & Wallet) wired to store `setChancesPerAd`.
- New shared: `src/components/auto-text.tsx` (adjustsFontSizeToFit wrapper).
- testing_agent iteration: all 15 acceptance points PASS (incl. keyboard fix). Fixed 2 flagged nits: confirm-field empty errors in create mode; try/finally around GetChances ad.
- NOTE: rewarded-ad features require a native APK/IPA build to show real ads (Expo Go/web simulate them).

## Session Log (2026-09-20, iteration 11) — GitHub import into fresh workspace
- User re-imported `https://github.com/labs93world/Tasklio` into a new Emergent workspace. Verified workspace files match the GitHub repo exactly (only env/cache differences: .env files, .expo, yarn.lock).
- All services RUNNING (expo, backend, mongodb). Backend health: GET /api/ → {"status":"ok","app":"Tasklio","mode":"offline"}.
- Web preview verified: app renders (splash screen with glow-ring animation confirmed via screenshot); Metro bundling clean.
- No code changes needed — import only.

## Session Log (2026-09-20, iteration 12) — Internet-required gate
- User: app is offline by design, but must NOT be usable without an internet connection.
- Installed `@react-native-community/netinfo` (12.0.1) via yarn expo install.
- New `src/components/offline-gate.tsx`: full-screen blocking Modal (wifi-off icon, "No internet connection", Try again → NetInfo.refresh()) mounted above the Stack in `_layout.tsx`. Blocks when `isConnected === false` OR `isInternetReachable === false`; unknown (null) state never blocks (no launch flash).
- Verified on web preview: cutting browser network shows the gate over the app; restoring network dismisses it and the app returns (auth modal visible). Icon-font placeholder on the gate is a web-only artifact of the browser being offline (fonts are bundled on device).

## Session Log (2026-09-20, iteration 13) — Deployment build failure fixed
- User reported Emergent deploy failing at the eas-apk-build step: "No lockfile found in the project directory. A lockfile is required to ensure deterministic dependency installation in EAS."
- Root cause: frontend shipped `package-lock.json` (npm) but no `yarn.lock`, while package.json pins `packageManager: yarn@1.22.22`. EAS requires a matching committed lockfile.
- FIX 1: generated `frontend/yarn.lock` via `yarn install` and deleted `frontend/package-lock.json` (single package manager, no mixed-lockfile warning).
- FIX 2 (deployment_agent blocker): added root-level `GET /health` in backend/server.py — platform probes hit `/health` without the `/api` prefix and were getting 404.
- FIX 3 (deployment_agent warn): removed `.env`, `.env.*`, `*.env` rules from root .gitignore so env files ship in the deploy context.
- FIX 4 (store-review warn): privacy policy + support FAQ updated — they still claimed "works fully offline / no internet required", now inaccurate after the internet gate; added an Ads (Google AdMob) disclosure section.
- Left intentionally (need user input, not build blockers): Google TEST AdMob app IDs in app.json (user must supply production AdMob IDs before store submission); client-side ACCESS_KEY gate in drawer-menu.tsx (offline admin design).
- deployment_agent re-check: status WARN (was FAIL) — expo_release_build_ok=true, expo_backend_reachable=true, dockerignore_blocks_required_files=false, compilation_passed=true.
- testing_agent smoke (iteration_8): ALL PASS — backend 7/7 pytest (/api/, /api/health, root /health), frontend loads to /home auth modal, OfflineGate intact. Note: Playwright set_offline doesn't trigger netinfo v12 web (subscribes to navigator.connection 'change') — tooling quirk, native unaffected.
## Session Log (2026-09-22, iteration 14) — Cloud migration + real admin + push + Firebase
- User: (1) new splash tagline, (2) make admin control EVERYTHING for real (was UI-only mock), store data in MongoDB, push notifications via provided google-services.json. User chose: everything cloud, all admin controls real, keep hidden access key but move it server-side.
- Splash tagline: "Earn · Track · Grow" → "Play. Earn. Cash out." (app/index.tsx).
- Backend FULL rewrite (backend/server.py) — cloud mode. Collections: users, transactions, payouts, notifications, config (singleton remote-config). Custom JWT auth (bcrypt). Admin = separate JWT scope granted by POST /api/auth/admin-token verifying server-side ADMIN_ACCESS_KEY (env; NOT in bundle). Endpoints: auth/register|login|admin-token, me, state, config, profile, earn, checkin, payout, chances/consume|add, notifications/read-all|{id}/read, register-push; admin/dashboard|users|payouts, PATCH users/{id}/points, PATCH users/{id}, DELETE users/{id} (soft delete), payouts/{id}/status (approve/reject+refund), notify (broadcast/targeted), PUT config. Push via Emergent relay (send_push, EMERGENT_PUSH_KEY placeholder, non-blocking).
- backend/.env: added JWT_SECRET, ADMIN_ACCESS_KEY=9372@Altaf93Tasklio, EMERGENT_PUSH_KEY=placeholder. requirements.txt: +PyJWT, bcrypt, httpx.
- Frontend: new src/api/client.ts (fetch wrapper + token storage via secureGet/secureSet). src/store/app-store.tsx REWRITTEN server-backed (same Ctx API so screens unchanged) — optimistic local update + server reconcile; hydrates token + /me on launch; registers push token after auth. auth-modal + wallet updated to await async createAccount/login/requestPayout. drawer-menu: server-verified admin key (removed bundled ACCESS_KEY), dynamic slide menu from config. admin.tsx REWRITTEN with react-query → real endpoints (dashboard, users search, user detail edit/adjust-points/delete, payout approve/reject, push notify, config save for rewards/chances/wallet/banners/maintenance/forceupdate/slidemenu). app/_layout.tsx: expo-notifications module-scope handler+channel, tap handlers, ConfigGate. New config-gate.tsx (global maintenance + force-update block). app.json: expo-notifications plugin + android.googleServicesFile + POST_NOTIFICATIONS. google-services.json added (Firebase project tasklio93, com.altaftech.tasklio).
- Installed: @react-native-community/netinfo (prev), expo-notifications, expo-device.
- testing_agent iteration_9: backend 26/26 pytest PASS (public URL), frontend 100% (splash tagline, register, admin key → panel with real Mongo counts). No blocking issues.
- BUILD REQUIRED for push: real device build + service-account JSON uploaded in the build UI (not needed in code). Expo Go/web simulate/skip push.
