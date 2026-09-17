import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";

import { ScreenHeader } from "@/src/components/screen-header";
import { Icon } from "@/src/components/icon";
import { useApp } from "@/src/store/app-store";
import { useToast } from "@/src/components/toast";
import { makeStyles, useTheme } from "@/src/theme";

const DURATION = 10;
const PER_TAP = 2;

export default function TapRace() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const { earnPoints } = useApp();
  const { showToast } = useToast();

  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [taps, setTaps] = useState(0);
  const [left, setLeft] = useState(DURATION);
  const timer = useRef<any>(null);
  const scale = useSharedValue(1);

  useEffect(() => () => clearInterval(timer.current), []);

  const start = () => {
    setTaps(0);
    setLeft(DURATION);
    setPhase("running");
    timer.current = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          clearInterval(timer.current);
          setPhase("done");
          return 0;
        }
        return l - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (phase === "done") {
      const reward = taps * PER_TAP;
      earnPoints({ gameId: "tap", points: reward, title: "Tap Race" });
      showToast(`${taps} taps · +${reward} pts`, "success");
    }
  }, [phase]);

  const onTap = () => {
    if (phase !== "running") return;
    setTaps((t) => t + 1);
    scale.value = withSpring(0.9, { damping: 6, stiffness: 400 }, () => {
      scale.value = withSpring(1);
    });
  };

  const tapStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScreenHeader title="Tap Race" />

      <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{taps}</Text>
            <Text style={styles.statLabel}>Taps</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: left <= 3 && phase === "running" ? colors.error : colors.onSurface }]}>
              {left}s
            </Text>
            <Text style={styles.statLabel}>Time left</Text>
          </View>
        </View>

        {phase === "running" ? (
          <Animated.View style={tapStyle}>
            <Pressable style={styles.tapBtn} onPress={onTap} testID="tap-race-button">
              <Icon name="gesture-tap" size={60} color={colors.onBrand} />
              <Text style={styles.tapBtnText}>TAP!</Text>
            </Pressable>
          </Animated.View>
        ) : (
          <View style={styles.centerZone}>
            <View style={styles.bolt}>
              <Icon name="lightning-bolt" size={56} color={colors.accentTap} />
            </View>
            <Text style={styles.title}>
              {phase === "done" ? `You scored ${taps * PER_TAP} points!` : "Tap as fast as you can!"}
            </Text>
            <Text style={styles.sub}>You have {DURATION} seconds. Each tap is worth {PER_TAP} points.</Text>
            <Pressable style={styles.startBtn} onPress={start} testID="tap-race-start">
              <Text style={styles.startText}>{phase === "done" ? "Play again" : "Start"}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  body: { flex: 1, alignItems: "center", paddingTop: 20, paddingHorizontal: 20 },
  statsRow: { flexDirection: "row", gap: 16, width: "100%" },
  statBox: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { color: colors.onSurface, fontSize: 34, fontWeight: "900" },
  statLabel: { color: colors.muted, fontSize: 13, marginTop: 4 },
  tapBtn: {
    marginTop: 60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.accentTap,
    alignItems: "center",
    justifyContent: "center",
  },
  tapBtnText: { color: colors.onBrand, fontSize: 28, fontWeight: "900", letterSpacing: 2, marginTop: 4 },
  centerZone: { flex: 1, alignItems: "center", justifyContent: "center" },
  bolt: {
    width: 110,
    height: 110,
    borderRadius: 32,
    backgroundColor: colors.accentTapSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: colors.onSurface, fontSize: 24, fontWeight: "800", marginTop: 24, textAlign: "center" },
  sub: { color: colors.onSurfaceTertiary, fontSize: 15, textAlign: "center", marginTop: 10, lineHeight: 21 },
  startBtn: {
    marginTop: 32,
    backgroundColor: colors.brandPrimary,
    borderRadius: 40,
    paddingVertical: 18,
    paddingHorizontal: 64,
  },
  startText: { color: colors.onBrand, fontSize: 20, fontWeight: "900", letterSpacing: 1 },
}));
