import { useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Share, Text, TextInput, View, Linking, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { SlideInLeft, SlideOutLeft, FadeIn, FadeOut, ZoomIn } from "react-native-reanimated";

import { Icon } from "@/src/components/icon";
import { useApp } from "@/src/store/app-store";
import { useToast } from "@/src/components/toast";
import { api, setAdminToken } from "@/src/api/client";
import { SHARE_MESSAGE } from "@/src/constants/links";
import { makeStyles, useTheme } from "@/src/theme";

type Props = { visible: boolean; onClose: () => void };

export function DrawerMenu({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { state } = useApp();
  const { showToast } = useToast();

  const [keyModal, setKeyModal] = useState(false);
  const [thanksModal, setThanksModal] = useState(false);
  const [accessKey, setAccessKey] = useState("");
  const [checking, setChecking] = useState(false);
  const lastTap = useRef(0);

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

  // Handle an admin-configured slide-menu item by its url/route shape.
  const onMenuItem = (url: string, label: string) => {
    if (!url || url === "app://share") return onShare();
    if (url.startsWith("/")) return go(url);
    return openUrl(url, label);
  };

  // Restricted area opens only on a double tap, then asks for the access key.
  const onRestrictedPress = () => {
    const now = Date.now();
    if (now - lastTap.current < 400) {
      lastTap.current = 0;
      setAccessKey("");
      setKeyModal(true);
    } else {
      lastTap.current = now;
    }
  };

  // The access key is verified SERVER-SIDE (never bundled in the app). A valid
  // key returns an admin-scoped token which unlocks the admin panel.
  const submitKey = async () => {
    const val = accessKey.trim();
    if (!val || checking) return;
    setChecking(true);
    try {
      const data = await api<{ token: string }>("/auth/admin-token", { method: "POST", auth: false, body: { admin_key: val } });
      await setAdminToken(data.token);
      setChecking(false);
      setKeyModal(false);
      setAccessKey("");
      onClose();
      setTimeout(() => router.push("/admin" as any), 220);
    } catch {
      setChecking(false);
      setKeyModal(false);
      setAccessKey("");
      setThanksModal(true);
    }
  };

  const menu = state.config.slideMenu?.length
    ? state.config.slideMenu.map((m) => ({ icon: m.icon, label: m.label, onPress: () => onMenuItem(m.url, m.label) }))
    : [{ icon: "share-variant", label: "Share", onPress: onShare }];

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.backdropWrap}>
        <Pressable style={styles.backdrop} onPress={onClose} testID="drawer-backdrop" />
      </Animated.View>
      <Animated.View
        entering={SlideInLeft.duration(260)}
        exiting={SlideOutLeft}
        style={[styles.panel, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}
        testID="drawer-menu"
      >
        <View style={styles.topRow}>
          <Text style={styles.menuTitle}>Menu</Text>
          <Pressable onPress={onClose} hitSlop={10} testID="drawer-close-button">
            <Icon name="close" size={22} color={colors.onSurface} />
          </Pressable>
        </View>

        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Icon name="account" size={24} color={colors.onBrand} />
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
          <View style={{ gap: 2 }}>
            {menu.map((it) => (
              <Pressable key={it.label} style={styles.row} onPress={it.onPress} testID={`drawer-${it.label.toLowerCase().replace(/[^a-z]+/g, "-")}`}>
                <Icon name={it.icon} size={20} color={colors.onSurfaceSecondary} />
                <Text style={styles.rowLabel}>{it.label}</Text>
                <Icon name="chevron-right" size={20} color={colors.muted} />
              </Pressable>
            ))}
          </View>

          <Pressable style={styles.restricted} onPress={onRestrictedPress} testID="drawer-restricted-area">
            <Icon name="shield-lock" size={20} color={colors.muted} />
            <Text style={styles.restrictedLabel}>Restricted Area</Text>
            <Icon name="chevron-right" size={20} color={colors.muted} />
          </Pressable>
        </ScrollView>
      </Animated.View>

      {/* Access key prompt (no hint) */}
      <Modal visible={keyModal} transparent animationType="fade" onRequestClose={() => setKeyModal(false)}>
        <Pressable style={styles.centerBackdrop} onPress={() => setKeyModal(false)}>
          <Pressable style={styles.dialog} onPress={() => {}} testID="access-key-dialog">
            <View style={styles.dialogIcon}>
              <Icon name="key-variant" size={26} color={colors.brandPrimary} />
            </View>
            <Text style={styles.dialogTitle}>Access Key</Text>
            <TextInput
              style={styles.keyInput}
              value={accessKey}
              onChangeText={setAccessKey}
              placeholder="Enter access key"
              placeholderTextColor={colors.muted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              testID="access-key-input"
            />
            <Pressable style={styles.dialogBtn} onPress={submitKey} disabled={checking} testID="access-key-submit">
              {checking ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.dialogBtnText}>Continue</Text>}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Innocuous "thanks" popup on wrong key */}
      <Modal visible={thanksModal} transparent animationType="fade" onRequestClose={() => setThanksModal(false)}>
        <Pressable style={styles.centerBackdrop} onPress={() => setThanksModal(false)}>
          <Animated.View entering={ZoomIn.duration(200)} style={styles.dialog} testID="thanks-dialog">
            <View style={[styles.dialogIcon, { backgroundColor: colors.brandSecondary }]}>
              <Icon name="heart" size={26} color={colors.brandPrimary} />
            </View>
            <Text style={styles.dialogTitle}>Thank you!</Text>
            <Text style={styles.dialogBody}>Thanks for being with Tasklio. Keep playing to earn more rewards!</Text>
            <Pressable style={styles.dialogBtn} onPress={() => setThanksModal(false)} testID="thanks-close">
              <Text style={styles.dialogBtnText}>You&apos;re welcome</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
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
    width: "80%",
    maxWidth: 330,
    backgroundColor: colors.surfaceSecondary,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingHorizontal: 18,
  },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  menuTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "800" },
  profile: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  name: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  mobile: { color: colors.muted, fontSize: 13, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12 },
  rowLabel: { flex: 1, color: colors.onSurfaceSecondary, fontSize: 15, fontWeight: "600" },
  restricted: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 12,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceTertiary,
    opacity: 0.45,
  },
  restrictedLabel: { flex: 1, color: colors.onSurfaceTertiary, fontSize: 15, fontWeight: "700" },
  centerBackdrop: { flex: 1, backgroundColor: "rgba(5,5,7,0.82)", alignItems: "center", justifyContent: "center", padding: 32 },
  dialog: { width: "100%", maxWidth: 340, backgroundColor: colors.surfaceSecondary, borderRadius: 22, padding: 24, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  dialogIcon: { width: 60, height: 60, borderRadius: 18, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.brandPrimary },
  dialogTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "900", marginTop: 16 },
  dialogBody: { color: colors.onSurfaceTertiary, fontSize: 14, textAlign: "center", marginTop: 10, lineHeight: 20 },
  keyInput: {
    width: "100%",
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.onSurface,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 18,
  },
  dialogBtn: { width: "100%", backgroundColor: colors.brandPrimary, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 16 },
  dialogBtnText: { color: colors.onBrand, fontSize: 16, fontWeight: "800" },
}));
