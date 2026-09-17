import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeIn } from "react-native-reanimated";

import { ScreenHeader } from "@/src/components/screen-header";
import { Icon } from "@/src/components/icon";
import { useApp } from "@/src/store/app-store";
import { useToast } from "@/src/components/toast";
import { makeStyles, useTheme } from "@/src/theme";

const ICONS = ["heart", "star", "diamond-stone", "bell", "flower", "leaf", "lightning-bolt", "cube"];

type Card = { key: number; icon: string; flipped: boolean; matched: boolean };

function buildDeck(): Card[] {
  const pairs = [...ICONS, ...ICONS];
  return pairs
    .map((icon, i) => ({ key: i, icon, flipped: false, matched: false }))
    .sort(() => Math.random() - 0.5)
    .map((c, i) => ({ ...c, key: i }));
}

export default function Puzzle() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const { earnPoints } = useApp();
  const { showToast } = useToast();

  const [deck, setDeck] = useState<Card[]>(buildDeck);
  const [picked, setPicked] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);
  const [won, setWon] = useState(false);

  const matchedCount = useMemo(() => deck.filter((c) => c.matched).length, [deck]);

  useEffect(() => {
    if (matchedCount === deck.length && !won) {
      setWon(true);
      const reward = Math.max(50, 300 - moves * 10);
      earnPoints({ gameId: "puzzle", points: reward, title: "Puzzle Dash" });
      showToast(`Solved in ${moves} moves! +${reward} pts`, "success");
    }
  }, [matchedCount]);

  const onFlip = (idx: number) => {
    if (locked || deck[idx].flipped || deck[idx].matched) return;
    const next = deck.map((c, i) => (i === idx ? { ...c, flipped: true } : c));
    const nowPicked = [...picked, idx];
    setDeck(next);
    setPicked(nowPicked);

    if (nowPicked.length === 2) {
      setMoves((m) => m + 1);
      setLocked(true);
      const [a, b] = nowPicked;
      if (next[a].icon === next[b].icon) {
        setTimeout(() => {
          setDeck((d) => d.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c)));
          setPicked([]);
          setLocked(false);
        }, 400);
      } else {
        setTimeout(() => {
          setDeck((d) => d.map((c, i) => (i === a || i === b ? { ...c, flipped: false } : c)));
          setPicked([]);
          setLocked(false);
        }, 800);
      }
    }
  };

  const restart = () => {
    setDeck(buildDeck());
    setPicked([]);
    setMoves(0);
    setWon(false);
    setLocked(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScreenHeader
        title="Puzzle Dash"
        right={
          <Pressable onPress={restart} hitSlop={10} testID="puzzle-restart-button">
            <Icon name="refresh" size={24} color={colors.brandPrimary} />
          </Pressable>
        }
      />

      <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.statRow}>
          <Text style={styles.stat}>Moves: {moves}</Text>
          <Text style={styles.stat}>
            Pairs: {matchedCount / 2}/{deck.length / 2}
          </Text>
        </View>

        <View style={styles.grid}>
          {deck.map((c, idx) => {
            const faceUp = c.flipped || c.matched;
            return (
              <Pressable
                key={c.key}
                style={[styles.cardCell, faceUp && styles.cardUp, c.matched && styles.cardMatched]}
                onPress={() => onFlip(idx)}
                testID={`puzzle-card-${idx}`}
              >
                {faceUp ? (
                  <Animated.View entering={FadeIn.duration(150)}>
                    <Icon name={c.icon} size={30} color={c.matched ? colors.success : colors.accentPuzzle} />
                  </Animated.View>
                ) : (
                  <Icon name="help" size={26} color={colors.muted} />
                )}
              </Pressable>
            );
          })}
        </View>

        {won ? (
          <Pressable style={styles.playAgain} onPress={restart} testID="puzzle-play-again">
            <Text style={styles.playAgainText}>Play again</Text>
          </Pressable>
        ) : (
          <Text style={styles.hint}>Fewer moves earn more points (min 50).</Text>
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  body: { flex: 1, alignItems: "center", paddingTop: 16, paddingHorizontal: 20 },
  statRow: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginBottom: 20 },
  stat: { color: colors.onSurfaceSecondary, fontSize: 16, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 12, width: "100%" },
  cardCell: {
    width: 68,
    height: 68,
    borderRadius: 14,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardUp: { backgroundColor: colors.accentPuzzleSoft, borderColor: colors.accentPuzzle },
  cardMatched: { backgroundColor: colors.surfaceTertiary, borderColor: colors.success },
  hint: { color: colors.muted, fontSize: 14, marginTop: 28, textAlign: "center" },
  playAgain: {
    marginTop: 28,
    backgroundColor: colors.brandPrimary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 50,
  },
  playAgainText: { color: colors.onBrand, fontSize: 17, fontWeight: "800" },
}));
