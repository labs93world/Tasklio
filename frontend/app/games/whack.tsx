import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { ScreenHeader } from "@/src/components/screen-header";
import { Icon } from "@/src/components/icon";
import { GameResult } from "@/src/components/game-result";
import { useApp } from "@/src/store/app-store";
import { makeStyles, useTheme } from "@/src/theme";

const DURATION = 15;
const PER = 5;

export default function Whack() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const { earnPoints } = useApp();

  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [active, setActive] = useState(-1);
  const [hits, setHits] = useState(0);
  const [left, setLeft] = useState(DURATION);
  const clock = useRef<any>(null);
  const mole = useRef<any>(null);

  useEffect(() => () => { clearInterval(clock.current); clearInterval(mole.current); }, []);

  const start = () => {
    setHits(0);
    setLeft(DURATION);
    setPhase("running");
    setActive(Math.floor(Math.random() * 9));
    mole.current = setInterval(() => setActive(Math.floor(Math.random() * 9)), 750);
    clock.current = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          clearInterval(clock.current);
          clearInterval(mole.current);
          setActive(-1);
          setPhase("done");
          return 0;
        }
        return l - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (phase === "done") earnPoints({ gameId: "whack", points: hits * PER, title: "Whack-a-Mole" });
  }, [phase]);

  const whack = (i: number) => {
    if (phase !== "running" || i !== active) return;
    setHits((h) => h + 1);
    setActive(-1);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScreenHeader title="Whack-a-Mole" />
      <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.statsRow}>
          <Text style={styles.stat}>Hits: {hits}</Text>
          <Text style={[styles.stat, { color: left <= 3 && phase === "running" ? colors.error : colors.onSurface }]}>{left}s</Text>
        </View>

        <View style={styles.grid}>
          {Array.from({ length: 9 }).map((_, i) => (
            <Pressable key={i} style={styles.hole} onPress={() => whack(i)} testID={`whack-hole-${i}`}>
              {active === i ? <Icon name="rodent" size={44} color={colors.accentTap} /> : <View style={styles.holeInner} />}
            </Pressable>
          ))}
        </View>

        {phase === "idle" ? (
          <Pressable style={styles.start} onPress={start} testID="whack-start"><Text style={styles.startText}>Start</Text></Pressable>
        ) : phase === "running" ? (
          <Text style={styles.hint}>Tap the moles! Each is worth {PER} points.</Text>
        ) : null}
      </View>

      <GameResult visible={phase === "done"} title="Time's up!" subtitle={`You whacked ${hits} moles`} points={hits * PER} onPlayAgain={start} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  body: { flex: 1, alignItems: "center", paddingTop: 20, paddingHorizontal: 20 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginBottom: 24 },
  stat: { color: colors.onSurface, fontSize: 20, fontWeight: "800" },
  grid: { width: 300, height: 300, flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  hole: { width: 92, height: 92, borderRadius: 46, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  holeInner: { width: 30, height: 12, borderRadius: 6, backgroundColor: colors.surfaceTertiary },
  start: { marginTop: 36, backgroundColor: colors.brandPrimary, borderRadius: 40, paddingVertical: 18, paddingHorizontal: 64 },
  startText: { color: colors.onBrand, fontSize: 20, fontWeight: "900" },
  hint: { color: colors.muted, fontSize: 14, marginTop: 30, textAlign: "center" },
}));
