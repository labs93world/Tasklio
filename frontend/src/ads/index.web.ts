// Rewarded-ad service (web fallback).
// AdMob's native SDK has no web build, so on web we simulate a short ad and
// grant the reward. Metro picks this file for web and src/ads/index.ts on native.

export async function initAds(): Promise<void> {}

export function showRewardedAd(): Promise<boolean> {
  return new Promise((resolve) => setTimeout(() => resolve(true), 500));
}
