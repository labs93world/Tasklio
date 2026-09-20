import { useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { Icon } from "@/src/components/icon";
import { showRewardedAd } from "@/src/ads";
import { makeStyles, useTheme } from "@/src/theme";

type Props = {
  visible: boolean;
  title: string;
  subtitle: string;
  points: number;
  // Called AFTER the rewarded ad completes; grants the reward and closes.
  onClaim: () => void;
  claimLabel?: string;
};

// Shared reward screen shown at the end of every game / daily check-in.
// Tapping Claim plays a rewarded ad, then grants the reward.
export function GameResult({ visible, title, subtitle, points, onClaim, claimLabel = "Claim" }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [claiming, setClaiming] = useState(false);

  if (!visible) return null;

  const handleClaim = async () => {
    if (claiming) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setClaiming(true);
    try {
      if (points > 0) await showRewardedAd();
    } finally {
      setClaiming(false);
      onClaim();
    }
  };

  return (
    <Animated.View entering={FadeIn.duration(180)} style={styles.overlay} testID="game-result">
      <Animated.View entering={ZoomIn.duration(220)} style={styles.card}>
        <View style={styles.trophy}>
          <Icon name="trophy" size={52} color={colors.brandPrimary} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Text style={styles.points} testID="game-result-points">
          {points > 0 ? `+${points} points ready` : "No points this time"}
        </Text>

        <Pressable
          style={[styles.playBtn, claiming && styles.playBtnDisabled]}
          onPress={handleClaim}
          disabled={claiming}
          testID="game-result-claim"
        >
          {claiming ? (
            <ActivityIndicator color={colors.onBrand} />
          ) : (
            <Text style={styles.playText}>{points > 0 ? claimLabel : "Continue"}</Text>
          )}
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
}));
