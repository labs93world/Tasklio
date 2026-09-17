import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeIn } from "react-native-reanimated";

import { ScreenHeader } from "@/src/components/screen-header";
import { Icon } from "@/src/components/icon";
import { GameResult } from "@/src/components/game-result";
import { useApp } from "@/src/store/app-store";
import { makeStyles, useTheme } from "@/src/theme";

const DURATION = 15;
const PER = 5;
const { width } = Dimensions.get("window");
const AREA_W = width - 40;
const AREA_H = 460;
const SIZE = 76;

export default function Balloon() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const { earnPoints } = useApp();

  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [pops, setPops] = useState(0);
  const [left, setLeft] = useState(DURATION);
  const clock = useRef<any>(null);

  useEffect(() => () => clearInterval(clock.current), []);

  const spawn = () => {
    setPos({
      x: Math.random() * (AREA_W - SIZE),
      y: Math.random() * (AREA_H - SIZE),
    });
  };

  const start = () => {
    setPops(0);
    setLeft(DURATION);
    setPhase("running");
    spawn();
    clock.current = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) { clearInterval(clock.current); setPhase("done"); return 0; }
        return l - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (phase === "done") earnPoints({ gameId: "balloon", points: pops * PER, title: "Balloon Pop" });
  }, [phase]);

  const pop = () => {
    if (phase !== "running") return;
    setPops((p) => p + 1);
    spawn();
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScreenHeader title="Balloon Pop" />
      <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.statsRow}>
          <Text style={styles.stat}>Popped: {pops}</Text>
          <Text style={[styles.stat, { color: left <= 3 && phase === "running" ? colors.error : colors.onSurface }]}>{left}s</Text>
        </View>

        <View style={styles.area}>
          {phase === "running" ? (
            <Animated.View key={`${pos.x}-${pos.y}`} entering={FadeIn.duration(120)} style={{ position: "absolute", left: pos.x, top: pos.y }}>
              <Pressable style={styles.balloon} onPress={pop} testID="balloon-pop">
                <Icon name="balloon" size={44} color={colors.onBrand} />
              </Pressable>
            </Animated.View>
          ) : phase === "idle" ? (
            <View style={styles.center}>
              <Text style={styles.blurb}>Pop as many balloons as you can in {DURATION}s. Each is {PER} points.</Text>
              <Pressable style={styles.start} onPress={start} testID="balloon-start"><Text style={styles.startText}>Start</Text></Pressable>
            </View>
          ) : null}
        </View>
      </View>

      <GameResult visible={phase === "done"} title="Time's up!" subtitle={`You popped ${pops} balloons`} points={pops * PER} onPlayAgain={start} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  body: { flex: 1, paddingTop: 20, paddingHorizontal: 20 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  stat: { color: colors.onSurface, fontSize: 20, fontWeight: "800" },
  area: { width: AREA_W, height: AREA_H, borderRadius: 20, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  balloon: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: colors.accentLucky, alignItems: "center", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  blurb: { color: colors.onSurfaceTertiary, fontSize: 16, textAlign: "center", lineHeight: 23, marginBottom: 28 },
  start: { backgroundColor: colors.brandPrimary, borderRadius: 40, paddingVertical: 18, paddingHorizontal: 64 },
  startText: { color: colors.onBrand, fontSize: 20, fontWeight: "900" },
}));
