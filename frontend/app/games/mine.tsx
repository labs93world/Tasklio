import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { ScreenHeader } from "@/src/components/screen-header";
import { Icon } from "@/src/components/icon";
import { GameResult } from "@/src/components/game-result";
import { useApp } from "@/src/store/app-store";
import { makeStyles, useTheme } from "@/src/theme";

const PER = 20;
const TILES = 9;

function newBomb() { return Math.floor(Math.random() * TILES); }

export default function Mine() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const { earnPoints } = useApp();

  const [bomb, setBomb] = useState(newBomb);
  const [picked, setPicked] = useState<number[]>([]);
  const [dead, setDead] = useState(false);
  const [result, setResult] = useState<{ points: number; title: string; sub: string } | null>(null);

  const banked = picked.filter((i) => i !== bomb).length * PER;

  const pick = (i: number) => {
    if (dead || result || picked.includes(i)) return;
    const next = [...picked, i];
    setPicked(next);
    if (i === bomb) {
      setDead(true);
      earnPoints({ gameId: "mine", points: 0, title: "Mine Pick" });
      setTimeout(() => setResult({ points: 0, title: "Boom!", sub: "You hit the bomb and lost this round" }), 400);
    }
  };

  const cashOut = () => {
    if (dead || result || banked === 0) return;
    earnPoints({ gameId: "mine", points: banked, title: "Mine Pick" });
    setResult({ points: banked, title: "Cashed out!", sub: `You banked ${picked.length} safe tiles` });
  };

  const reset = () => { setBomb(newBomb()); setPicked([]); setDead(false); setResult(null); };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScreenHeader title="Mine Pick" />
      <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.blurb}>Each safe tile is {PER} points. Avoid the bomb and cash out anytime!</Text>
        <Text style={styles.banked}>Banked: {banked} pts</Text>

        <View style={styles.grid}>
          {Array.from({ length: TILES }).map((_, i) => {
            const open = picked.includes(i);
            const isBomb = i === bomb;
            return (
              <Pressable key={i} style={[styles.tile, open && (isBomb ? styles.tileBomb : styles.tileSafe)]} onPress={() => pick(i)} testID={`mine-tile-${i}`}>
                {open ? (
                  isBomb ? <Icon name="bomb" size={34} color={colors.error} /> : <Icon name="star-four-points" size={30} color={colors.success} />
                ) : (
                  <Icon name="help" size={26} color={colors.muted} />
                )}
              </Pressable>
            );
          })}
        </View>

        <Pressable style={[styles.cash, banked === 0 && styles.cashDisabled]} onPress={cashOut} disabled={banked === 0 || dead} testID="mine-cashout">
          <Text style={[styles.cashText, banked === 0 && { color: colors.muted }]}>Cash out {banked} pts</Text>
        </Pressable>
      </View>

      <GameResult visible={!!result} title={result?.title ?? ""} subtitle={result?.sub ?? ""} points={result?.points ?? 0} onPlayAgain={reset} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  body: { flex: 1, alignItems: "center", paddingTop: 20, paddingHorizontal: 20 },
  blurb: { color: colors.onSurfaceTertiary, fontSize: 15, textAlign: "center", lineHeight: 22 },
  banked: { color: colors.brandPrimary, fontSize: 18, fontWeight: "800", marginTop: 18 },
  grid: { width: 300, height: 300, flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 20 },
  tile: { width: 92, height: 92, borderRadius: 16, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  tileSafe: { backgroundColor: colors.surfaceTertiary, borderColor: colors.success },
  tileBomb: { backgroundColor: colors.accentTapSoft, borderColor: colors.error },
  cash: { marginTop: 28, backgroundColor: colors.brandPrimary, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 44 },
  cashDisabled: { backgroundColor: colors.surfaceTertiary },
  cashText: { color: colors.onBrand, fontSize: 17, fontWeight: "800" },
}));
