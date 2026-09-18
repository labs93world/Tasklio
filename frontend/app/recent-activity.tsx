import { View, Text, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { ScreenHeader } from "@/src/components/screen-header";
import { Icon } from "@/src/components/icon";
import { useApp } from "@/src/store/app-store";
import { formatPoints, formatDateShort } from "@/src/utils/format";
import { makeStyles, useTheme } from "@/src/theme";

export default function RecentActivity() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const { state } = useApp();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScreenHeader title="Recent Activity" />

      {state.txns.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="history" size={40} color={colors.muted} />
          <Text style={styles.emptyText}>No activity yet. Play a game to earn points!</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 10 }}>
          {state.txns.map((t) => (
            <View key={t.id} style={styles.row} testID={`activity-${t.id}`}>
              <View style={styles.icon}>
                <Icon
                  name={t.kind === "payout" ? (t.points >= 0 ? "bank-transfer-in" : "bank-transfer-out") : t.kind === "adjust" ? "tune-variant" : "star-four-points"}
                  size={20}
                  color={t.points >= 0 ? colors.success : colors.brandPrimary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>{t.title}</Text>
                <Text style={styles.time}>{formatDateShort(t.ts)}</Text>
              </View>
              <Text style={[styles.amt, { color: t.points >= 0 ? colors.success : colors.error }]}>
                {t.points >= 0 ? "+" : ""}{formatPoints(t.points)}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 40 },
  emptyText: { color: colors.muted, fontSize: 15, textAlign: "center", lineHeight: 22 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.surfaceSecondary, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border },
  icon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  title: { color: colors.onSurfaceSecondary, fontSize: 15, fontWeight: "700" },
  time: { color: colors.muted, fontSize: 12, marginTop: 2 },
  amt: { fontSize: 16, fontWeight: "800" },
}));
