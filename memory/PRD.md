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
