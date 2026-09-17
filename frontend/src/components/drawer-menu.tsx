import { Modal, Pressable, ScrollView, Share, Text, View, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { SlideInLeft, SlideOutLeft, FadeIn, FadeOut } from "react-native-reanimated";

import { Icon } from "@/src/components/icon";
import { useApp } from "@/src/store/app-store";
import { useToast } from "@/src/components/toast";
import { SHARE_MESSAGE, PLAY_STORE_URL, COMMUNITY_URL, HELP_MAILTO } from "@/src/constants/links";
import { makeStyles, useTheme } from "@/src/theme";

type Props = { visible: boolean; onClose: () => void };

export function DrawerMenu({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { state } = useApp();
  const { showToast } = useToast();

  const go = (path: string) => {
    onClose();
    setTimeout(() => router.push(path as any), 220);
  };

  const openUrl = async (url: string, label: string) => {
    onClose();
    const ok = await Linking.canOpenURL(url).catch(() => false);
    if (ok) Linking.openURL(url);
    else showToast(`${label} is unavailable right now.`, "info");
  };

  const onShare = () => {
    onClose();
    setTimeout(() => Share.share({ message: SHARE_MESSAGE }).catch(() => {}), 220);
  };

  const items = [
    { icon: "share-variant", label: "Share", onPress: onShare },
    { icon: "star-outline", label: "Rate us", onPress: () => openUrl(PLAY_STORE_URL, "Play Store") },
    { icon: "account-group", label: "Join Community", onPress: () => openUrl(COMMUNITY_URL, "Community") },
    { icon: "face-agent", label: "Help & Support", onPress: () => openUrl(HELP_MAILTO, "Email") },
    { icon: "file-document-outline", label: "Terms of use", onPress: () => go("/legal/terms") },
    { icon: "shield-check-outline", label: "Privacy Policy", onPress: () => go("/legal/privacy") },
  ];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.backdropWrap}>
        <Pressable style={styles.backdrop} onPress={onClose} testID="drawer-backdrop" />
      </Animated.View>
      <Animated.View
        entering={SlideInLeft.springify().damping(20)}
        exiting={SlideOutLeft}
        style={[styles.panel, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}
        testID="drawer-menu"
      >
        <View style={styles.topRow}>
          <Text style={styles.menuTitle}>Menu</Text>
          <Pressable onPress={onClose} hitSlop={10} testID="drawer-close-button">
            <Icon name="close" size={26} color={colors.onSurface} />
          </Pressable>
        </View>

        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Icon name="account" size={30} color={colors.onBrand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>
              {state.profile.name || "Guest"}
            </Text>
            <Text style={styles.mobile} numberOfLines={1}>
              {state.profile.mobile ? `+91 ${state.profile.mobile}` : "Not signed in"}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }} style={{ flex: 1 }}>
          <View style={{ gap: 4 }}>
            {items.map((it) => (
              <Pressable key={it.label} style={styles.row} onPress={it.onPress} testID={`drawer-${it.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
                <Icon name={it.icon} size={22} color={colors.onSurfaceSecondary} />
                <Text style={styles.rowLabel}>{it.label}</Text>
                <Icon name="chevron-right" size={22} color={colors.muted} />
              </Pressable>
            ))}
          </View>

          <Pressable style={styles.restricted} onPress={() => go("/restricted")} testID="drawer-restricted-area">
            <Icon name="shield-lock" size={22} color={colors.brandPrimary} />
            <Text style={styles.restrictedLabel}>Restricted Area</Text>
            <Icon name="chevron-right" size={22} color={colors.brandPrimary} />
          </Pressable>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  backdropWrap: { ...({ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 } as const) },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  panel: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: "82%",
    maxWidth: 360,
    backgroundColor: colors.surfaceSecondary,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingHorizontal: 20,
  },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  menuTitle: { color: colors.onSurface, fontSize: 24, fontWeight: "800" },
  profile: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 22 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  name: { color: colors.onSurface, fontSize: 22, fontWeight: "800" },
  mobile: { color: colors.muted, fontSize: 14, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 18 },
  row: { flexDirection: "row", alignItems: "center", gap: 16, paddingVertical: 15 },
  rowLabel: { flex: 1, color: colors.onSurfaceSecondary, fontSize: 17, fontWeight: "600" },
  restricted: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 15,
    paddingHorizontal: 14,
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.brandPrimary,
    backgroundColor: colors.brandSecondary,
  },
  restrictedLabel: { flex: 1, color: colors.brandPrimary, fontSize: 17, fontWeight: "700" },
}));
