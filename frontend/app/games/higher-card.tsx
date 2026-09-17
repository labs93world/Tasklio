import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { ScreenHeader } from "@/src/components/screen-header";
import { GameResult } from "@/src/components/game-result";
import { useApp } from "@/src/store/app-store";
import { makeStyles } from "@/src/theme";

const rand = () => Math.floor(Math.random() * 13) + 1;
const label = (n: number) => (n === 1 ? "A" : n === 11 ? "J" : n === 12 ? "Q" : n === 13 ? "K" : String(n));

export default function HigherCard() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { earnPoints } = useApp();

  const [player, setPlayer] = useState<number | null>(null);
  const [app, setApp] = useState<number | null>(null);
  const [result, setResult] = useState<{ points: number; title: string; sub: string } | null>(null);

  const draw = () => {
    const p = rand();
    const a = rand();
    setPlayer(p);
    setApp(a);
    const points = p > a ? 50 : p === a ? 20 : 0;
    const title = p > a ? "You win!" : p === a ? "It's a tie" : "App wins";
    const sub = `You drew ${label(p)}, app drew ${label(a)}`;
    earnPoints({ gameId: "higher", points, title: "Higher Card" });
    setTimeout(() => setResult({ points, title, sub }), 400);
  };

  const reset = () => { setPlayer(null); setApp(null); setResult(null); };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScreenHeader title="Higher Card" />
      <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.blurb}>Draw a higher card than the app to win 50 points.</Text>
        <View style={styles.row}>
          <View style={styles.side}>
            <Text style={styles.sideLabel}>YOU</Text>
            <View style={[styles.card, styles.cardYou]}><Text style={styles.cardNum}>{player ? label(player) : "?"}</Text></View>
          </View>
          <View style={styles.side}>
            <Text style={styles.sideLabel}>APP</Text>
            <View style={styles.card}><Text style={styles.cardNum}>{app ? label(app) : "?"}</Text></View>
          </View>
        </View>
        <Pressable style={styles.draw} onPress={draw} testID="higher-draw"><Text style={styles.drawText}>Draw</Text></Pressable>
      </View>

      <GameResult visible={!!result} title={result?.title ?? ""} subtitle={result?.sub ?? ""} points={result?.points ?? 0} onPlayAgain={reset} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  body: { flex: 1, alignItems: "center", paddingTop: 24, paddingHorizontal: 20 },
  blurb: { color: colors.onSurfaceTertiary, fontSize: 15, textAlign: "center", marginBottom: 36 },
  row: { flexDirection: "row", gap: 24 },
  side: { alignItems: "center", gap: 12 },
  sideLabel: { color: colors.muted, fontSize: 14, fontWeight: "800", letterSpacing: 1 },
  card: { width: 130, height: 190, borderRadius: 20, backgroundColor: colors.surfaceSecondary, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  cardYou: { borderColor: colors.brandPrimary },
  cardNum: { color: colors.onSurface, fontSize: 64, fontWeight: "900" },
  draw: { marginTop: 44, backgroundColor: colors.brandPrimary, borderRadius: 40, paddingVertical: 18, paddingHorizontal: 70 },
  drawText: { color: colors.onBrand, fontSize: 20, fontWeight: "900" },
}));
