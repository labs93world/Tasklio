// Rewarded-ad service (native).
//
// Uses react-native-google-mobile-ads, a NATIVE module that only works in a
// development/production build — NOT in Expo Go or web. We require it lazily
// inside try/catch: in Expo Go (module not linked) we fall back to a short
// simulated ad so the whole app stays functional and testable. A real APK
// build plays Google's TEST rewarded ad (TestIds.REWARDED).

let ads: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ads = require("react-native-google-mobile-ads");
} catch {
  ads = null;
}

let initialized = false;

export async function initAds(): Promise<void> {
  if (!ads || initialized) return;
  try {
    await ads.default().initialize();
    initialized = true;
  } catch {
    // ignore — fall back to simulated ads
  }
}

// Resolves true when a reward should be granted (ad watched / simulated),
// false if the user dismissed early or the ad failed.
export function showRewardedAd(): Promise<boolean> {
  if (!ads) return mockAd();
  const { RewardedAd, RewardedAdEventType, AdEventType, TestIds } = ads;
  const unitId = TestIds.REWARDED; // Google's official TEST rewarded unit id
  return new Promise<boolean>((resolve) => {
    let settled = false;
    let earned = false;
    const finish = (v: boolean) => {
      if (settled) return;
      settled = true;
      try {
        cleanup();
      } catch {
        /* noop */
      }
      resolve(v);
    };

    let rewarded: any;
    try {
      rewarded = RewardedAd.createForAdRequest(unitId, { requestNonPersonalizedAdsOnly: true });
    } catch {
      return finish(false);
    }

    const unLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      try {
        rewarded.show();
      } catch {
        finish(false);
      }
    });
    const unEarned = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      earned = true;
    });
    const unClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => finish(earned));
    const unError = rewarded.addAdEventListener(AdEventType.ERROR, () => finish(false));

    function cleanup() {
      unLoaded();
      unEarned();
      unClosed();
      unError();
    }

    try {
      rewarded.load();
    } catch {
      finish(false);
    }
    // Safety net so a stuck ad never blocks the UI forever.
    setTimeout(() => finish(earned), 25000);
  });
}

function mockAd(): Promise<boolean> {
  return new Promise((resolve) => setTimeout(() => resolve(true), 700));
}
