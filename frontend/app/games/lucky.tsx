import { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeIn } from "react-native-reanimated";

import { ScreenHeader } from "@/src/components/screen-header";
import { Icon } from "@/src/components/icon";
import { GameResult } from "@/src/components/game-result";
import { useApp } from "@/src/store/app-store";
import { GAMES } from "@/src/constants/games";
import { makeStyles, useTheme } from "@/src/theme";

const REWARDS = [25, 50, 75, 100, 150, 250];
const GAME = GAMES.find((g) => g.id === "lucky")!;

function dealCards() {
  return [...REWARDS].sort(() => Math.random() - 0.5).slice(0, 4).map((reward, i) => ({ key: i, reward, revealed: false }));
}

export default function Lucky() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const { earnPoints, canPlay } = useApp();

  const [cards, setCards] = useState(dealCards);
  const [picked, setPicked] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [result, setResult] = useState<{ points: number } | null>(null);

  useEffect(() => {
    const t = setInterval(() => setRemaining(canPlay(GAME.id, GAME.cooldownMs).remainingMs), 500);
    return () => clearInterval(t);
  }, [canPlay]);

  const pick = (idx: number) => {
    if (picked || !canPlay(GAME.id, GAME.cooldownMs).ok) return;
    setPicked(true);
    setCards((cs) => cs.map((c, i) => (i === idx ? { ...c, revealed: true } : c)));
    const reward = cards[idx].reward;
    earnPoints({ gameId: GAME.id, points: reward, title: "Lucky Draw" });
    setTimeout(() => setResult({ points: reward }), 600);
  };

  const reset = () => {
    setCards(dealCards());
    setPicked(false);
    setResult(null);
  };

  const canPlayNow = remaining <= 0;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScreenHeader title="Lucky Draw" />

      <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.blurb}>{GAME.blurb}</Text>
        <View style={styles.grid}>
          {cards.map((c, idx) => (
            <Pressable key={c.key} style={[styles.card, c.revealed && styles.cardRevealed]} onPress={() => pick(idx)} disabled={picked || !canPlayNow} testID={`lucky-card-${idx}`}>
              {c.revealed ? (
                <Animated.View entering={FadeIn} style={{ alignItems: "center" }}>
                  <Text style={styles.reward}>{c.reward}</Text>
                  <Text style={styles.rewardUnit}>points</Text>
                </Animated.View>
              ) : (
                <Icon name="help-rhombus" size={44} color={picked ? colors.muted : colors.accentLucky} />
              )}
            </Pressable>
          ))}
        </View>
        <Text style={styles.hint}>{canPlayNow ? "Tap one card to reveal your reward." : `Next draw in ${Math.ceil(remaining / 1000)}s`}</Text>
      </View>

      <GameResult
        visible={!!result}
        title="Lucky you!"
        subtitle="You revealed a mystery reward"
        points={result?.points ?? 0}
        playAgainLabel={canPlayNow ? "Draw again" : `Draw in ${Math.ceil(remaining / 1000)}s`}
        playAgainDisabled={!canPlayNow}
        onPlayAgain={reset}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  body: { flex: 1, alignItems: "center", paddingTop: 24, paddingHorizontal: 20 },
  blurb: { color: colors.onSurfaceTertiary, fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 30 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 18 },
  card: { width: 140, height: 180, borderRadius: 20, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: colors.border },
  cardRevealed: { backgroundColor: colors.accentLuckySoft, borderColor: colors.accentLucky },
  reward: { color: colors.brandPrimary, fontSize: 44, fontWeight: "900" },
  rewardUnit: { color: colors.onSurfaceTertiary, fontSize: 15, marginTop: 2 },
  hint: { color: colors.muted, fontSize: 14, marginTop: 34, textAlign: "center" },
}));
