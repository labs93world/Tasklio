# Tasklio — PRD

## Original Problem Statement
Build a mobile app "Tasklio". Logo provided (gold/black). Package `com.altaftech.tasklio`. App opens with a professional splash screen, then a Home screen that is kept fully blank for now (user will specify later).

## Architecture
- Expo Router (React Native), file-based routing.
- `app/index.tsx` → animated professional splash screen (auto-navigates to Home after ~2.6s).
- `app/home.tsx` → fully blank Home screen (black canvas).
- Theme: black/gold palette in `src/theme.ts` matching the logo.
- No backend required yet.

## Branding
- App name: Tasklio
- Logo saved as icon, adaptive-icon, splash-image (from uploaded gold logo).
- Splash background: black.

## Implemented (2026-06)
- Professional animated splash: logo scale/fade + gold glow + "Tasklio" wordmark.
- Blank Home screen.
- Black/gold theme tokens.
- App icon + native splash configured in app.json.

## Backlog / Next
- Home screen content (awaiting user's spec).
