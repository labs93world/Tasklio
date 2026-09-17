# Tasklio — PRD

## Original Problem Statement
Tasklio: a rewards + mini-games mobile app. Package `com.altaftech.tasklio`. Professional splash → Home. Later, user asked to replicate 5 reference screenshots (rewards home, notifications, drawer menu, wallet with UPI payouts, admin panel) but with our OWN enhanced theme (NOT the navy from the refs) and to store ALL data on-device so the app runs fully offline.

## Architecture
- Expo Router (React Native), fully client-side, **no backend**.
- State: React Context store (`src/store/app-store.tsx`) persisted to device via `@/src/utils/storage` (AsyncStorage) + an `expo-file-system` backup file. Export/Import backup via Sharing + DocumentPicker.
- Theme: custom **obsidian + gold** palette in `src/theme.ts` (matches the gold logo; deliberately different from reference navy).
- Icons: `@react-native-vector-icons/material-design-icons` (dynamic import, Expo Go compatible).

## Screens
- `/` splash (animated coin badge, rings, shimmer, loading bar) → `/home`
- `/home` — greeting, points badge, notifications bell (unread dot), banner carousel, game tiles, wallet card, recent activity, slide-in drawer
- `/wallet` — balance (100 pts = ₹1), amount chips, UPI input, payout request, payout history (Pending/Successful/Failed)
- `/notifications` — list with unread dots + Clear
- `/restricted` — PIN gate (default 1234) → `/admin`
- `/admin` — stats, adjust points, manage payout status, edit profile, change PIN, backup/import/reset
- `/support`, `/legal/terms`, `/legal/privacy`
- Games: `/games/spin` (SVG wheel), `/games/puzzle` (memory match), `/games/quiz` (trivia), `/games/tap-race` (10s tap), `/games/lucky` (card draw)

## Implemented (2026-06)
- Full offline rewards app matching all 5 reference features, own gold theme.
- 5 playable games awarding points; wallet payouts; notifications; drawer; PIN-gated admin.
- Local persistence + Export/Import backup. Tested 12/12 flows pass.
- Package id set to `com.altaftech.tasklio`; logo used as icon/splash.

## Known limitation
- Surviving a full app "clear data"/uninstall requires the Export backup file (import to restore). Pure local storage alone is wiped by the OS on clear-data; backup file gives best-effort recovery.

## Backlog / Next
- More games / daily streak bonuses.
- Real payout gateway (needs backend + user's provider) — currently local status simulation via admin.
- Optional cloud sync/auth if user ever wants cross-device data.
