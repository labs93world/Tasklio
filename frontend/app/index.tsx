import { useEffect } from "react";
import { View, Image } from "react-native";
import { useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

import { makeStyles, useTheme } from "@/src/theme";

export default function Splash() {
  const router = useRouter();
  const styles = useStyles();
  const { colors } = useTheme();

  const logoScale = useSharedValue(0.7);
  const logoOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const nameOpacity = useSharedValue(0);
  const nameTranslate = useSharedValue(12);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    logoScale.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.back(1.4)) });
    glowOpacity.value = withDelay(300, withTiming(1, { duration: 900 }));
    nameOpacity.value = withDelay(650, withTiming(1, { duration: 600 }));
    nameTranslate.value = withDelay(650, withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }));

    const timer = setTimeout(() => {
      router.replace("/home");
    }, 2600);
    return () => clearTimeout(timer);
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));
  const nameStyle = useAnimatedStyle(() => ({
    opacity: nameOpacity.value,
    transform: [{ translateY: nameTranslate.value }],
  }));

  return (
    <View style={styles.container} testID="splash-screen">
      <View style={styles.centerBlock}>
        <Animated.View style={[styles.glow, glowStyle, { backgroundColor: colors.brandPrimary }]} />
        <Animated.View style={logoStyle}>
          <Image
            source={require("../assets/images/tasklio-logo.png")}
            style={styles.logo}
            resizeMode="contain"
            testID="splash-logo"
          />
        </Animated.View>
        <Animated.Text style={[styles.appName, nameStyle]} testID="splash-app-name">
          Tasklio
        </Animated.Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  centerBlock: {
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.18,
    top: -20,
  },
  logo: {
    width: 180,
    height: 180,
  },
  appName: {
    marginTop: 24,
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 2,
    color: colors.brandPrimary,
  },
}));
