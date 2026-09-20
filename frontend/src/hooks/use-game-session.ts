import { useState } from "react";

import { useApp } from "@/src/store/app-store";

type PendingResult = { points: number; title: string; subtitle: string };

// Centralizes the per-game "chances" gate + the claim/reward flow so every
// game screen stays tiny. A round costs one chance; the reward is granted only
// after the user taps Claim (which plays a rewarded ad in GameResult).
export function useGameSession(gameId: string, earnTitle: string) {
  const { chancesFor, consumeChance, earnPoints } = useApp();
  const [getModal, setGetModal] = useState(false);
  const [result, setResult] = useState<PendingResult | null>(null);

  // Attempt to begin a round: consumes a chance, or opens the Get-Chances
  // modal and returns false when none are left.
  const startRound = (): boolean => {
    if (chancesFor(gameId) > 0) {
      consumeChance(gameId);
      return true;
    }
    setGetModal(true);
    return false;
  };

  const finishRound = (points: number, title: string, subtitle: string) =>
    setResult({ points, title, subtitle });

  // Called by GameResult AFTER the rewarded ad completes: grant + close.
  const claim = () => {
    if (result && result.points > 0) earnPoints({ gameId, points: result.points, title: earnTitle });
    setResult(null);
  };

  return {
    chances: chancesFor(gameId),
    getModal,
    setGetModal,
    result,
    startRound,
    finishRound,
    claim,
  };
}
