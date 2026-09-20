import { View, Text, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ScreenHeader } from "@/src/components/screen-header";
import { Icon } from "@/src/components/icon";
import { AutoText } from "@/src/components/auto-text";
import { useApp } from "@/src/store/app-store";
import { formatRelative } from "@/src/utils/format";
import { makeStyles, useTheme } from "@/src/theme";

export default function Notifications() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const { state, markAllRead, markNotifRead } = useApp();

  // pinned custom notifications first, then newest first
  const sorted = [...state.notifs].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return b.ts - a.ts;
  });
  const hasUnread = state.notifs.some((n) => !n.read);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScreenHeader
        title="Notifications"
        right={
          hasUnread ? (
            <Pressable onPress={markAllRead} hitSlop={10} testID="notifications-read-all-button">
              <Text style={styles.readAll}>Read All</Text>
            </Pressable>
          ) : null
        }
      />

      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="bell-off-outline" size={40} color={colors.muted} />
          <Text style={styles.emptyText}>You&apos;re all caught up. No notifications right now.</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 10 }}>
          {sorted.map((n, i) => (
            <Animated.View key={n.id} entering={FadeInDown.delay(i * 40)}>
              <Pressable
                style={[styles.card, !n.read && styles.cardUnread]}
                onPress={() => markNotifRead(n.id)}
                testID={`notification-${n.id}`}
              >
                <View style={[styles.iconTile, { backgroundColor: colors.surfaceTertiary }]}>
                  <Icon name={n.icon} size={20} color={colors[n.tintKey as keyof typeof colors] as string} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    {n.pinned ? <Icon name="pin" size={13} color={colors.brandPrimary} /> : null}
                    <AutoText style={styles.title} lines={1}>{n.title}</AutoText>
                    {!n.read ? <View style={styles.unreadDot} /> : null}
                  </View>
                  <Text style={styles.body} numberOfLines={2}>{n.body}</Text>
                  <Text style={styles.time}>{formatRelative(n.ts)}</Text>
                </View>
              </Pressable>
            </Animated.View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  readAll: { color: colors.brandPrimary, fontSize: 16, fontWeight: "700" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 40 },
  emptyText: { color: colors.muted, fontSize: 15, textAlign: "center", lineHeight: 22 },
  card: { flexDirection: "row", gap: 12, backgroundColor: colors.surfaceSecondary, borderRadius: 16, padding: 13, borderWidth: 1, borderColor: colors.border },
  cardUnread: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  iconTile: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { flex: 1, color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brandPrimary, marginLeft: 6 },
  body: { color: colors.onSurfaceTertiary, fontSize: 13, marginTop: 4, lineHeight: 18 },
  time: { color: colors.muted, fontSize: 11, marginTop: 6 },
}));
