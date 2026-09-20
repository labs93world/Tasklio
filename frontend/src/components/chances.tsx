import { useState } from "react";
import { View, Text, Pressable, Modal, ActivityIndicator } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { Icon } from "@/src/components/icon";
import { AutoText } from "@/src/components/auto-text";
import { useApp } from "@/src/store/app-store";
import { showRewardedAd } from "@/src/ads";
import { makeStyles, useTheme } from "@/src/theme";

// Header badge: shows "Chances N", or a "Get chances" button when empty.
export function ChancesBadge({ gameId, onGetChances }: { gameId: string; onGetChances: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { chancesFor } = useApp();
  const n = chancesFor(gameId);

  if (n <= 0) {
    return (
      <Pressable style={styles.getBtn} onPress={onGetChances} testID="chances-get-button">
        <Icon name="movie-open-play" size={14} color={colors.onBrand} />
        <AutoText style={styles.getText}>Get chances</AutoText>
      </Pressable>
    );
  }
  return (
    <View style={styles.badge} testID="chances-badge">
      <Icon name="ticket-confirmation" size={13} color={colors.brandPrimary} />
      <AutoText style={styles.badgeText}>{`Chances ${n}`}</AutoText>
    </View>
  );
}

// Modal shown when a game is started with no chances left.
export function GetChancesModal({
  visible,
  gameId,
  onClose,
  onGranted,
}: {
  visible: boolean;
  gameId: string;
  onClose: () => void;
  onGranted?: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { chancesPerAd, addChances } = useApp();
  const [loading, setLoading] = useState(false);
  const per = chancesPerAd(gameId);

  const watch = async () => {
    if (loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setLoading(true);
    let ok = false;
    try {
      ok = await showRewardedAd();
    } finally {
      setLoading(false);
    }
    if (ok) {
      addChances(gameId);
      onClose();
      onGranted?.();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View entering={ZoomIn.duration(200)} style={styles.dialog} testID="get-chances-dialog">
          <View style={styles.iconWrap}>
            <Icon name="movie-open-play" size={34} color={colors.brandPrimary} />
          </View>
          <Text style={styles.title}>Out of chances</Text>
          <Text style={styles.body}>
            Watch a short video to get {per} more {per === 1 ? "chance" : "chances"} to play this game.
          </Text>
          <Pressable style={styles.btn} onPress={watch} disabled={loading} testID="get-chances-watch">
            {loading ? (
              <ActivityIndicator color={colors.onBrand} />
            ) : (
              <>
                <Icon name="play-circle" size={18} color={colors.onBrand} />
                <Text style={styles.btnText}>Get {per} Chances</Text>
              </>
            )}
          </Pressable>
          <Pressable style={styles.closeBtn} onPress={onClose} disabled={loading} testID="get-chances-close">
            <Text style={styles.closeText}>Not now</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 120,
  },
  badgeText: { color: colors.onSurface, fontSize: 13, fontWeight: "800" },
  getBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.brandPrimary,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: 130,
  },
  getText: { color: colors.onBrand, fontSize: 13, fontWeight: "800" },
  backdrop: { flex: 1, backgroundColor: "rgba(5,5,7,0.85)", alignItems: "center", justifyContent: "center", padding: 28 },
  dialog: { width: "100%", maxWidth: 340, backgroundColor: colors.surfaceSecondary, borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: 24, alignItems: "center" },
  iconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.brandPrimary },
  title: { color: colors.onSurface, fontSize: 20, fontWeight: "900", marginTop: 16 },
  body: { color: colors.onSurfaceTertiary, fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 10 },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.brandPrimary, borderRadius: 14, paddingVertical: 15, marginTop: 20, alignSelf: "stretch" },
  btnText: { color: colors.onBrand, fontSize: 16, fontWeight: "800" },
  closeBtn: { marginTop: 12, paddingVertical: 8 },
  closeText: { color: colors.muted, fontSize: 14, fontWeight: "600" },
}));
