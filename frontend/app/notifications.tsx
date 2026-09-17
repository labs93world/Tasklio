import { useEffect } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ScreenHeader } from "@/src/components/screen-header";
import { Icon } from "@/src/components/icon";
import { useApp } from "@/src/store/app-store";
import { formatRelative } from "@/src/utils/format";
import { makeStyles, useTheme } from "@/src/theme";

export default function Notifications() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const { state, markAllRead, clearNotifs } = useApp();

  // Mark everything read when the user leaves this screen.
  useEffect(() => {
    return () => markAllRead();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScreenHeader
        title="Notifications"
        right={
          state.notifs.length > 0 ? (
            <Pressable onPress={clearNotifs} hitSlop={10} testID="notifications-clear-button">
              <Text style={styles.clear}>Clear</Text>
            </Pressable>
          ) : null
        }
      />

      {state.notifs.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="bell-off-outline" size={40} color={colors.muted} />
          <Text style={styles.emptyText}>You&apos;re all caught up. No notifications right now.</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 14 }}
        >
          {state.notifs.map((n, i) => (
            <Animated.View
              key={n.id}
              entering={FadeInDown.delay(i * 50)}
              style={[styles.card, !n.read && styles.cardUnread]}
              testID={`notification-${n.id}`}
            >
              <View style={[styles.iconTile, { backgroundColor: colors.surfaceTertiary }]}>
                <Icon name={n.icon} size={24} color={colors[n.tintKey] as string} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.title} numberOfLines={1}>
                    {n.title}
                  </Text>
                  {!n.read ? <View style={styles.unreadDot} /> : null}
                </View>
                <Text style={styles.body}>{n.body}</Text>
                <Text style={styles.time}>{formatRelative(n.ts)}</Text>
              </View>
            </Animated.View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  clear: { color: colors.brandPrimary, fontSize: 16, fontWeight: "700" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 40 },
  emptyText: { color: colors.muted, fontSize: 15, textAlign: "center", lineHeight: 22 },
  card: {
    flexDirection: "row",
    gap: 16,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardUnread: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  iconTile: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { flex: 1, color: colors.onSurface, fontSize: 17, fontWeight: "800" },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brandPrimary, marginLeft: 8 },
  body: { color: colors.onSurfaceTertiary, fontSize: 14, marginTop: 6, lineHeight: 20 },
  time: { color: colors.muted, fontSize: 13, marginTop: 10 },
}));
