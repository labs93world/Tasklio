import { useState } from "react";
import { View, Text, Pressable, TextInput, Modal } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";

import { ScreenHeader } from "@/src/components/screen-header";
import { Icon } from "@/src/components/icon";
import { useApp, PayoutStatus } from "@/src/store/app-store";
import { useToast } from "@/src/components/toast";
import { formatPoints, pointsToRupees, formatRupees, formatDateShort, formatRelative } from "@/src/utils/format";
import { makeStyles, useTheme } from "@/src/theme";

const CHIPS = [100, 500, 1000];

const STATUS_STYLE: Record<PayoutStatus, { label: string; key: "warning" | "success" | "error"; icon: string }> = {
  pending: { label: "Pending", key: "warning", icon: "clock-outline" },
  successful: { label: "Successful", key: "success", icon: "check-circle" },
  failed: { label: "Rejected", key: "error", icon: "close-circle" },
};

export default function Wallet() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const { state, requestPayout } = useApp();
  const { showToast } = useToast();
  const router = useRouter();

  const [selected, setSelected] = useState(100);
  const [upi, setUpi] = useState("");
  const [tab, setTab] = useState<"activity" | "payouts">("activity");
  const [thanks, setThanks] = useState(false);

  const recent = state.txns.slice(0, 10);

  const rupees = selected / 100;
  const canRequest = state.points >= selected && /^[\w.\-]{2,}@[\w.\-]{2,}$/.test(upi);

  const onRequest = () => {
    const res = requestPayout(rupees, upi.trim());
    if (res.ok) {
      setUpi("");
      setThanks(true);
    } else {
      showToast(res.msg, "error");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScreenHeader title="Wallet" />

      <KeyboardAwareScrollView
        bottomOffset={20}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
      >
        {/* Balance card */}
        <LinearGradient
          colors={[colors.surfaceTertiary, colors.surfaceSecondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.balanceTop}>
            <Text style={styles.balanceLabel}>AVAILABLE BALANCE</Text>
            <Icon name="wallet" size={26} color={colors.brandPrimary} />
          </View>
          <Text style={styles.balancePts} testID="wallet-balance">
            {formatPoints(state.points)} pts
          </Text>
          <Text style={styles.balanceValue}>
            {formatRupees(pointsToRupees(state.points))} estimated value · 100 pts = ₹1
          </Text>
        </LinearGradient>

        {/* Amount chips */}
        <View style={styles.chipRow}>
          {CHIPS.map((c) => {
            const active = selected === c;
            return (
              <Pressable
                key={c}
                onPress={() => setSelected(c)}
                style={[styles.chip, active && styles.chipActive]}
                testID={`wallet-chip-${c}`}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* UPI input */}
        <View style={styles.inputWrap}>
          <Icon name="bank" size={20} color={colors.muted} />
          <TextInput
            style={styles.input}
            placeholder="Enter UPI ID · name@bank"
            placeholderTextColor={colors.muted}
            value={upi}
            onChangeText={setUpi}
            autoCapitalize="none"
            autoCorrect={false}
            testID="wallet-upi-input"
          />
        </View>

        {/* Error label above the request button */}
        {!canRequest ? (
          <Text style={styles.hint} testID="wallet-hint">
            {state.points < selected
              ? `You need ${formatPoints(selected)} pts for this payout.`
              : "Add a valid UPI ID to continue."}
          </Text>
        ) : null}

        {/* Request button */}
        <Pressable
          onPress={onRequest}
          disabled={!canRequest}
          style={[styles.payBtn, !canRequest && styles.payBtnDisabled]}
          testID="wallet-request-button"
        >
          <Text style={[styles.payBtnText, !canRequest && styles.payBtnTextDisabled]}>
            Request {formatRupees(rupees)} Payout
          </Text>
          <Icon name="arrow-right" size={22} color={canRequest ? colors.onBrand : colors.muted} />
        </Pressable>

        {/* History — selectable category: recent activity or payout history */}
        <View style={styles.segWrap} testID="wallet-history-tabs">
          <Pressable
            style={[styles.segBtn, tab === "activity" && styles.segBtnActive]}
            onPress={() => setTab("activity")}
            testID="wallet-tab-activity"
          >
            <Text style={[styles.segText, tab === "activity" && styles.segTextActive]}>Recent activity</Text>
          </Pressable>
          <Pressable
            style={[styles.segBtn, tab === "payouts" && styles.segBtnActive]}
            onPress={() => setTab("payouts")}
            testID="wallet-tab-payouts"
          >
            <Text style={[styles.segText, tab === "payouts" && styles.segTextActive]}>Payout history</Text>
          </Pressable>
        </View>

        {tab === "activity" ? (
          state.txns.length === 0 ? (
            <View style={styles.empty}>
              <Icon name="history" size={30} color={colors.muted} />
              <Text style={styles.emptyText}>No activity yet. Play a game to earn your first points!</Text>
            </View>
          ) : (
            <>
              <View style={{ gap: 10 }}>
                {recent.map((t) => (
                  <View key={t.id} style={styles.activityRow} testID={`wallet-activity-${t.id}`}>
                    <View style={styles.activityIcon}>
                      <Icon
                        name={t.kind === "payout" ? (t.points >= 0 ? "bank-transfer-in" : "bank-transfer-out") : "star-four-points"}
                        size={20}
                        color={t.points >= 0 ? colors.success : colors.brandPrimary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityTitle} numberOfLines={1}>{t.title}</Text>
                      <Text style={styles.activityTime}>{formatRelative(t.ts)}</Text>
                    </View>
                    <Text style={[styles.activityAmt, { color: t.points >= 0 ? colors.success : colors.error }]}>
                      {t.points >= 0 ? "+" : ""}{formatPoints(t.points)}
                    </Text>
                  </View>
                ))}
              </View>
              {state.txns.length > 10 ? (
                <Pressable style={styles.viewAll} onPress={() => router.push("/recent-activity")} testID="wallet-view-all-activity">
                  <Text style={styles.viewAllText}>View all</Text>
                  <Icon name="chevron-right" size={20} color={colors.brandPrimary} />
                </Pressable>
              ) : null}
            </>
          )
        ) : state.payouts.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="bank-transfer" size={30} color={colors.muted} />
            <Text style={styles.emptyText}>No payouts yet. Redeem your points to see them here.</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {state.payouts.map((p) => {
              const ss = STATUS_STYLE[p.status];
              const tint = colors[ss.key];
              return (
                <View key={p.id} style={styles.payoutRow} testID={`wallet-payout-${p.id}`}>
                  <View style={styles.payoutIcon}>
                    <Icon name="bank-transfer-out" size={22} color={colors.brandPrimary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.payoutAmt}>{formatRupees(p.amountRupees)}</Text>
                    <Text style={styles.payoutUpi} numberOfLines={1}>{p.upi}</Text>
                    <Text style={styles.payoutDate}>{formatDateShort(p.ts)}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: colors.surfaceTertiary }]}>
                    <Icon name={ss.icon} size={13} color={tint} />
                    <Text style={[styles.payoutStatus, { color: tint }]}>{ss.label}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </KeyboardAwareScrollView>

      {/* Thank-you popup after requesting a payout */}
      <Modal visible={thanks} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setThanks(false)}>
        <View style={styles.dialogBackdrop}>
          <View style={styles.dialog} testID="wallet-thanks-dialog">
            <View style={styles.dialogIcon}>
              <Icon name="check-decagram" size={40} color={colors.brandPrimary} />
            </View>
            <Text style={styles.dialogTitle}>Thank you!</Text>
            <Text style={styles.dialogBody}>
              Your payout request has been received and is being processed. You can track its status in Payout history.
            </Text>
            <Pressable
              style={styles.dialogBtn}
              onPress={() => {
                setThanks(false);
                setTab("payouts");
              }}
              testID="wallet-thanks-ok"
            >
              <Text style={styles.dialogBtnText}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  balanceCard: { borderRadius: 22, padding: 22, borderWidth: 1, borderColor: colors.border },
  balanceTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  balanceLabel: { color: colors.muted, fontSize: 12, fontWeight: "800", letterSpacing: 1.2 },
  balancePts: { color: colors.onSurface, fontSize: 44, fontWeight: "900", marginTop: 14 },
  balanceValue: { color: colors.onSurfaceTertiary, fontSize: 13, marginTop: 8 },
  chipRow: { flexDirection: "row", gap: 14, marginTop: 22 },
  chip: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.brandSecondary, borderColor: colors.brandPrimary },
  chipText: { color: colors.onSurfaceSecondary, fontSize: 20, fontWeight: "800" },
  chipTextActive: { color: colors.brandPrimary },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    paddingHorizontal: 18,
    marginTop: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, color: colors.onSurface, fontSize: 16, paddingVertical: 20 },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.brandPrimary,
    borderRadius: 16,
    paddingVertical: 20,
    marginTop: 22,
  },
  payBtnDisabled: { backgroundColor: colors.surfaceTertiary },
  payBtnText: { color: colors.onBrand, fontSize: 17, fontWeight: "800" },
  payBtnTextDisabled: { color: colors.muted },
  hint: { color: colors.muted, fontSize: 13, textAlign: "center", marginTop: 10 },
  segWrap: { flexDirection: "row", gap: 8, backgroundColor: colors.surfaceSecondary, borderRadius: 16, padding: 6, marginTop: 30, marginBottom: 16, borderWidth: 1, borderColor: colors.border },
  segBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  segBtnActive: { backgroundColor: colors.brandSecondary },
  segText: { color: colors.muted, fontSize: 14, fontWeight: "800" },
  segTextActive: { color: colors.brandPrimary },
  activityRow: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.surfaceSecondary, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border },
  activityIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  activityTitle: { color: colors.onSurfaceSecondary, fontSize: 15, fontWeight: "700" },
  activityTime: { color: colors.muted, fontSize: 12, marginTop: 2 },
  activityAmt: { fontSize: 16, fontWeight: "800" },
  viewAll: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 16, paddingVertical: 12 },
  viewAllText: { color: colors.brandPrimary, fontSize: 16, fontWeight: "800" },
  empty: { alignItems: "center", gap: 12, paddingVertical: 24, paddingHorizontal: 30 },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: "center", lineHeight: 20 },
  payoutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 16,
    padding: 14,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  payoutIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  payoutAmt: { color: colors.onSurface, fontSize: 18, fontWeight: "900" },
  payoutUpi: { color: colors.onSurfaceSecondary, fontSize: 13, marginTop: 2 },
  payoutDate: { color: colors.muted, fontSize: 12, marginTop: 3 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  payoutStatus: { fontSize: 12, fontWeight: "800" },
  dialogBackdrop: { flex: 1, backgroundColor: "rgba(5,5,7,0.85)", alignItems: "center", justifyContent: "center", padding: 28 },
  dialog: { width: "100%", maxWidth: 340, backgroundColor: colors.surfaceSecondary, borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: 24, alignItems: "center" },
  dialogIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  dialogTitle: { color: colors.onSurface, fontSize: 22, fontWeight: "900" },
  dialogBody: { color: colors.onSurfaceSecondary, fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 10 },
  dialogBtn: { backgroundColor: colors.brandPrimary, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 22, alignSelf: "stretch" },
  dialogBtnText: { color: colors.onBrand, fontSize: 16, fontWeight: "800" },
}));
