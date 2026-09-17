import { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Svg, { G, Path, Text as SvgText, Circle } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";

import { ScreenHeader } from "@/src/components/screen-header";
import { Icon } from "@/src/components/icon";
import { useApp } from "@/src/store/app-store";
import { useToast } from "@/src/components/toast";
import { GAMES } from "@/src/constants/games";
import { makeStyles, useTheme } from "@/src/theme";

const SEGMENTS = [50, 100, 10, 200, 20, 500, 30, 150];
const SEG = 360 / SEGMENTS.length;
const SIZE = 300;
const R = SIZE / 2;
const GAME = GAMES.find((g) => g.id === "spin")!;

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
function sectorPath(start: number, end: number) {
  const s = polar(R, R, R, end);
  const e = polar(R, R, R, start);
  const large = end - start <= 180 ? 0 : 1;
  return `M ${R} ${R} L ${s.x} ${s.y} A ${R} ${R} 0 ${large} 0 ${e.x} ${e.y} Z`;
}

export default function Spin() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const { earnPoints, canPlay } = useApp();
  const { showToast } = useToast();

  const rotation = useSharedValue(0);
  const [spinning, setSpinning] = useState(false);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      const { remainingMs } = canPlay(GAME.id, GAME.cooldownMs);
      setRemaining(remainingMs);
    }, 500);
    return () => clearInterval(t);
  }, [canPlay]);

  const finish = (idx: number) => {
    setSpinning(false);
    const won = SEGMENTS[idx];
    if (won > 0) {
      earnPoints({ gameId: GAME.id, points: won, title: "Spin & Win" });
      showToast(`You won ${won} points!`, "success");
    } else {
      earnPoints({ gameId: GAME.id, points: 0, title: "Spin & Win" });
      showToast("No luck this time. Try again soon!", "info");
    }
  };

  const spin = () => {
    if (spinning) return;
    const { ok, remainingMs } = canPlay(GAME.id, GAME.cooldownMs);
    if (!ok) {
      showToast(`Next spin in ${Math.ceil(remainingMs / 1000)}s.`, "info");
      return;
    }
    setSpinning(true);
    const idx = Math.floor(Math.random() * SEGMENTS.length);
    const centerAngle = idx * SEG + SEG / 2;
    const cur = ((rotation.value % 360) + 360) % 360;
    const desired = (360 - centerAngle + 360) % 360;
    let delta = (desired - cur + 360) % 360;
    delta += 360 * 5;
    rotation.value = withTiming(
      rotation.value + delta,
      { duration: 4200, easing: Easing.out(Easing.cubic) },
      (done) => {
        if (done) runOnJS(finish)(idx);
      },
    );
  };

  const wheelStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  const canSpin = remaining <= 0 && !spinning;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScreenHeader title="Spin & Win" />

      <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.blurb}>{GAME.blurb}</Text>

        <View style={styles.wheelWrap}>
          <View style={styles.pointer}>
            <Icon name="triangle" size={30} color={colors.brandPrimary} style={{ transform: [{ rotate: "180deg" }] }} />
          </View>
          <Animated.View style={wheelStyle}>
            <Svg width={SIZE} height={SIZE}>
              <G>
                {SEGMENTS.map((val, i) => {
                  const start = i * SEG;
                  const end = start + SEG;
                  const fill = i % 2 === 0 ? colors.brandPrimary : colors.surfaceTertiary;
                  const textColor = i % 2 === 0 ? colors.onBrand : colors.onSurface;
                  const mid = start + SEG / 2;
                  const tp = polar(R, R, R * 0.66, mid);
                  return (
                    <G key={i}>
                      <Path d={sectorPath(start, end)} fill={fill} stroke={colors.surface} strokeWidth={2} />
                      <SvgText
                        x={tp.x}
                        y={tp.y}
                        fill={textColor}
                        fontSize={20}
                        fontWeight="bold"
                        textAnchor="middle"
                        transform={`rotate(${mid}, ${tp.x}, ${tp.y})`}
                      >
                        {val}
                      </SvgText>
                    </G>
                  );
                })}
              </G>
              <Circle cx={R} cy={R} r={26} fill={colors.surface} stroke={colors.brandPrimary} strokeWidth={3} />
            </Svg>
          </Animated.View>
        </View>

        <Pressable
          style={[styles.spinBtn, !canSpin && styles.spinBtnDisabled]}
          onPress={spin}
          disabled={!canSpin}
          testID="spin-button"
        >
          <Text style={[styles.spinText, !canSpin && { color: colors.muted }]}>
            {spinning ? "Spinning..." : remaining > 0 ? `Wait ${Math.ceil(remaining / 1000)}s` : "SPIN"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  body: { flex: 1, alignItems: "center", paddingTop: 24, paddingHorizontal: 20 },
  blurb: { color: colors.onSurfaceTertiary, fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 30 },
  wheelWrap: { width: SIZE, height: SIZE + 24, alignItems: "center", justifyContent: "flex-end" },
  pointer: { position: "absolute", top: -6, zIndex: 5 },
  spinBtn: {
    marginTop: 40,
    backgroundColor: colors.brandPrimary,
    borderRadius: 40,
    paddingVertical: 20,
    paddingHorizontal: 70,
  },
  spinBtnDisabled: { backgroundColor: colors.surfaceTertiary },
  spinText: { color: colors.onBrand, fontSize: 22, fontWeight: "900", letterSpacing: 2 },
}));
