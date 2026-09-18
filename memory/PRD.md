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
