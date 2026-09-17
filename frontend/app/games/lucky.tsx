import { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeIn } from "react-native-reanimated";

import { ScreenHeader } from "@/src/components/screen-header";
import { Icon } from "@/src/components/icon";
import { useApp } from "@/src/store/app-store";
import { useToast } from "@/src/components/toast";
import { GAMES } from "@/src/constants/games";
import { makeStyles, useTheme } from "@/src/theme";

const REWARDS = [25, 50, 75, 100, 150, 250];
const GAME = GAMES.find((g) => g.id === "lucky")!;

function dealCards() {
  const shuffled = [...REWARDS].sort(() => Math.random() - 0.5).slice(0, 4);
  return shuffled.map((reward, i) => ({ key: i, reward, revealed: false }));
}

export default function Lucky() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const { earnPoints, canPlay } = useApp();
  const { showToast } = useToast();

  const [cards, setCards] = useState(dealCards);
  const [picked, setPicked] = useState(false);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      const { remainingMs } = canPlay(GAME.id, GAME.cooldownMs);
      setRemaining(remainingMs);
    }, 500);
    return () => clearInterval(t);
  }, [canPlay]);

  const pick = (idx: number) => {
    if (picked) return;
    const { ok, remainingMs } = canPlay(GAME.id, GAME.cooldownMs);
    if (!ok) {
      showToast(`Next draw in ${Math.ceil(remainingMs / 1000)}s.`, "info");
      return;
    }
    setPicked(true);
    setCards((cs) => cs.map((c, i) => (i === idx ? { ...c, revealed: true } : c)));
    const reward = cards[idx].reward;
    earnPoints({ gameId: GAME.id, points: reward, title: "Lucky Draw" });
    showToast(`You revealed ${reward} points!`, "success");
  };

  const reset = () => {
    setCards(dealCards());
    setPicked(false);
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
            <Pressable
              key={c.key}
              style={[styles.card, c.revealed && styles.cardRevealed]}
              onPress={() => pick(idx)}
              disabled={picked || !canPlayNow}
              testID={`lucky-card-${idx}`}
            >
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

        {picked ? (
          <Pressable
            style={[styles.again, !canPlayNow && styles.againDisabled]}
            onPress={reset}
            disabled={!canPlayNow}
            testID="lucky-play-again"
          >
            <Text style={[styles.againText, !canPlayNow && { color: colors.muted }]}>
              {canPlayNow ? "Draw again" : `Wait ${Math.ceil(remaining / 1000)}s`}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.hint}>Tap one card to reveal your reward.</Text>
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  body: { flex: 1, alignItems: "center", paddingTop: 24, paddingHorizontal: 20 },
  blurb: { color: colors.onSurfaceTertiary, fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 30 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 18 },
  card: {
    width: 140,
    height: 180,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  cardRevealed: { backgroundColor: colors.accentLuckySoft, borderColor: colors.accentLucky },
  reward: { color: colors.brandPrimary, fontSize: 44, fontWeight: "900" },
  rewardUnit: { color: colors.onSurfaceTertiary, fontSize: 15, marginTop: 2 },
  hint: { color: colors.muted, fontSize: 14, marginTop: 34, textAlign: "center" },
  again: {
    marginTop: 34,
    backgroundColor: colors.brandPrimary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 50,
  },
  againDisabled: { backgroundColor: colors.surfaceTertiary },
  againText: { color: colors.onBrand, fontSize: 17, fontWeight: "800" },
}));
