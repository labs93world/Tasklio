import { useEffect } from "react";
import { View, Image, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
} from "react-native-reanimated";

import { makeStyles, useTheme } from "@/src/theme";

const { width } = Dimensions.get("window");
const RING = Math.min(width * 0.72, 300);

export default function Splash() {
  const router = useRouter();
  const styles = useStyles();
  const { colors } = useTheme();

  const intro = useSharedValue(0); // logo entrance 0->1
  const ring = useSharedValue(0); // ring rotation
  const shimmer = useSharedValue(0); // sweep across logo
  const text = useSharedValue(0); // wordmark + tagline
  const progress = useSharedValue(0); // loading bar
  const pulse = useSharedValue(0); // glow breathing

  useEffect(() => {
    intro.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.back(1.3)) });
    ring.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.linear }), -1, false);
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    shimmer.value = withDelay(
      500,
      withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.cubic) }), -1, false),
    );
    text.value = withDelay(700, withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) }));
    progress.value = withDelay(300, withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.cubic) }));

    const timer = setTimeout(() => router.replace("/home"), 2900);
    return () => clearTimeout(timer);
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.22, 0.42]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.95, 1.08]) }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(intro.value, [0, 1], [0, 0.55]),
    transform: [{ rotate: `${ring.value * 360}deg` }, { scale: interpolate(intro.value, [0, 1], [0.6, 1]) }],
  }));
  const ringStyle2 = useAnimatedStyle(() => ({
    opacity: interpolate(intro.value, [0, 1], [0, 0.35]),
    transform: [{ rotate: `${-ring.value * 360}deg` }, { scale: interpolate(intro.value, [0, 1], [0.6, 1]) }],
  }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: intro.value,
    transform: [
      { scale: interpolate(intro.value, [0, 1], [0.5, 1]) },
      { translateY: interpolate(intro.value, [0, 1], [16, 0]) },
    ],
  }));
  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.4, 0.6, 1], [0, 0.8, 0.8, 0]),
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-RING * 0.6, RING * 0.6]) }, { rotate: "18deg" }],
  }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: text.value,
    transform: [{ translateY: interpolate(text.value, [0, 1], [14, 0]) }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(text.value, [0, 0.5, 1], [0, 0, 1]),
  }));
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  const barWrapStyle = useAnimatedStyle(() => ({ opacity: text.value }));

  return (
    <View style={styles.container} testID="splash-screen">
      <StatusBar style="light" />
      <LinearGradient
        colors={["#0A0A0A", "#000000", "#0A0700"]}
        style={styles.bg}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <View style={styles.center}>
        <View style={styles.logoZone}>
          <Animated.View style={[styles.glow, glowStyle]}>
            <LinearGradient
              colors={[colors.brandPrimary, "transparent"]}
              style={styles.glowFill}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 1, y: 1 }}
            />
          </Animated.View>

          <Animated.View style={[styles.ring, ringStyle]} />
          <Animated.View style={[styles.ringInner, ringStyle2]} />

          <Animated.View style={logoStyle}>
            <View style={styles.logoDisc}>
              <Image
                source={require("../assets/images/tasklio-logo.png")}
                style={styles.logo}
                resizeMode="cover"
                testID="splash-logo"
              />
              <Animated.View style={[styles.shimmer, shimmerStyle, { pointerEvents: "none" }]}>
                <LinearGradient
                  colors={["transparent", "rgba(255,255,255,0.55)", "transparent"]}
                  style={styles.shimmerFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </Animated.View>
            </View>
          </Animated.View>
        </View>

        <Animated.Text style={[styles.word, wordStyle]} testID="splash-app-name">
          TASKLIO
        </Animated.Text>
        <Animated.Text style={[styles.tagline, taglineStyle]} testID="splash-tagline">
          Earn · Track · Grow
        </Animated.Text>
      </View>

      <Animated.View style={[styles.barWrap, barWrapStyle]}>
        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, barStyle]} />
        </View>
      </Animated.View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  bg: { ...StyleSheetAbsolute() },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  logoZone: {
    width: RING,
    height: RING,
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: RING * 0.9,
    height: RING * 0.9,
    borderRadius: RING,
    overflow: "hidden",
  },
  glowFill: { flex: 1, borderRadius: RING },
  ring: {
    position: "absolute",
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 1.5,
    borderColor: colors.brandPrimary,
    borderStyle: "dashed",
  },
  ringInner: {
    position: "absolute",
    width: RING * 0.8,
    height: RING * 0.8,
    borderRadius: RING / 2,
    borderWidth: 1,
    borderColor: colors.brandSecondary,
  },
  logo: { width: RING * 0.6, height: RING * 0.6 },
  logoDisc: {
    width: RING * 0.6,
    height: RING * 0.6,
    borderRadius: RING,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.brandPrimary,
    backgroundColor: "#000000",
  },
  shimmer: { position: "absolute", top: 0, bottom: 0, width: 60, left: RING * 0.2 },
  shimmerFill: { flex: 1 },
  word: {
    marginTop: 34,
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: 6,
    color: colors.brandPrimary,
  },
  tagline: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 3,
    color: colors.muted,
    textTransform: "uppercase",
  },
  barWrap: {
    position: "absolute",
    bottom: 64,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  barTrack: {
    width: 140,
    height: 3,
    borderRadius: 3,
    backgroundColor: colors.surfaceTertiary,
    overflow: "hidden",
  },
  barFill: { height: 3, borderRadius: 3, backgroundColor: colors.brandPrimary },
}));

function StyleSheetAbsolute() {
  return { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 };
}
