import { useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";

import { ScreenHeader } from "@/src/components/screen-header";
import { Icon } from "@/src/components/icon";
import { useApp, PayoutStatus } from "@/src/store/app-store";
import { useToast } from "@/src/components/toast";
import { formatPoints, pointsToRupees, formatRupees, formatDateShort } from "@/src/utils/format";
import { makeStyles, useTheme } from "@/src/theme";

const CHIPS = [100, 500, 1000];

const STATUS_STYLE: Record<PayoutStatus, { label: string; key: "warning" | "success" | "error" }> = {
  pending: { label: "Pending", key: "warning" },
  successful: { label: "Successful", key: "success" },
  failed: { label: "Failed", key: "error" },
};

export default function Wallet() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const { state, requestPayout } = useApp();
  const { showToast } = useToast();

  const [selected, setSelected] = useState(100);
  const [upi, setUpi] = useState("");

  const rupees = selected / 100;
  const canRequest = state.points >= selected && /^[\w.\-]{2,}@[\w.\-]{2,}$/.test(upi);

  const onRequest = () => {
    const res = requestPayout(rupees, upi.trim());
    showToast(res.msg, res.ok ? "success" : "error");
    if (res.ok) setUpi("");
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
        {!canRequest ? (
          <Text style={styles.hint}>
            {state.points < selected
              ? `You need ${formatPoints(selected)} pts for this payout.`
              : "Add a valid UPI ID to continue."}
          </Text>
        ) : null}

        {/* History */}
        <Text style={styles.historyTitle}>Payout history</Text>
        {state.payouts.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="bank-transfer" size={30} color={colors.muted} />
            <Text style={styles.emptyText}>No payouts yet. Redeem your points to see them here.</Text>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            {state.payouts.map((p) => {
              const ss = STATUS_STYLE[p.status];
              const tint = colors[ss.key];
              return (
                <View
                  key={p.id}
                  style={[styles.payoutCard, { borderColor: tint }]}
                  testID={`wallet-payout-${p.id}`}
                >
                  <View style={styles.payoutTop}>
                    <Text style={styles.payoutAmt}>{formatRupees(p.amountRupees)}</Text>
                    <Text style={styles.payoutUpi} numberOfLines={1}>
                      {p.upi}
                    </Text>
                  </View>
                  <View style={styles.payoutBottom}>
                    <Text style={styles.payoutDate}>{formatDateShort(p.ts)}</Text>
                    <Text style={[styles.payoutStatus, { color: tint }]}>{ss.label}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </KeyboardAwareScrollView>
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
  historyTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "800", marginTop: 30, marginBottom: 16 },
  empty: { alignItems: "center", gap: 12, paddingVertical: 24, paddingHorizontal: 30 },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: "center", lineHeight: 20 },
  payoutCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    backgroundColor: colors.surfaceSecondary,
  },
  payoutTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  payoutAmt: { color: colors.onSurface, fontSize: 22, fontWeight: "900" },
  payoutUpi: { color: colors.muted, fontSize: 13, flexShrink: 1, textAlign: "right" },
  payoutBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18 },
  payoutDate: { color: colors.muted, fontSize: 12 },
  payoutStatus: { fontSize: 13, fontWeight: "800" },
}));
