import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";

import { Icon } from "@/src/components/icon";
import { makeStyles, useTheme } from "@/src/theme";

type Props = {
  visible: boolean;
  title: string;
  subtitle: string;
  points: number;
  onPlayAgain: () => void;
  playAgainLabel?: string;
  playAgainDisabled?: boolean;
};

// Shared reward screen shown at the end of every game.
export function GameResult({
  visible,
  title,
  subtitle,
  points,
  onPlayAgain,
  playAgainLabel = "Play again",
  playAgainDisabled = false,
}: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();

  if (!visible) return null;

  return (
    <Animated.View entering={FadeIn.duration(200)} style={styles.overlay} testID="game-result">
      <Animated.View entering={ZoomIn.springify().damping(16)} style={styles.card}>
        <View style={styles.trophy}>
          <Icon name="trophy" size={52} color={colors.brandPrimary} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Text style={styles.points} testID="game-result-points">
          {points > 0 ? `+${points} points earned` : "No points this time"}
        </Text>

        <Pressable
          style={[styles.playBtn, playAgainDisabled && styles.playBtnDisabled]}
          onPress={onPlayAgain}
          disabled={playAgainDisabled}
          testID="game-result-play-again"
        >
          <Text style={[styles.playText, playAgainDisabled && { color: colors.muted }]}>{playAgainLabel}</Text>
        </Pressable>
        <Pressable style={styles.homeBtn} onPress={() => router.replace("/home")} testID="game-result-home">
          <Text style={styles.homeText}>Back to home</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const useStyles = makeStyles((colors) => ({
  overlay: {
    ...({ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const),
    backgroundColor: "rgba(5,5,7,0.94)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    zIndex: 50,
  },
  card: { alignItems: "center", width: "100%" },
  trophy: {
    width: 120,
    height: 120,
    borderRadius: 34,
    backgroundColor: colors.brandSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.brandPrimary,
  },
  title: { color: colors.onSurface, fontSize: 28, fontWeight: "900", marginTop: 26 },
  subtitle: { color: colors.onSurfaceTertiary, fontSize: 17, marginTop: 10 },
  points: { color: colors.brandPrimary, fontSize: 20, fontWeight: "800", marginTop: 8 },
  playBtn: {
    marginTop: 34,
    backgroundColor: colors.brandPrimary,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 64,
    minWidth: 220,
    alignItems: "center",
  },
  playBtnDisabled: { backgroundColor: colors.surfaceTertiary },
  playText: { color: colors.onBrand, fontSize: 18, fontWeight: "800" },
  homeBtn: { marginTop: 16, paddingVertical: 10 },
  homeText: { color: colors.muted, fontSize: 15, fontWeight: "600" },
}));
