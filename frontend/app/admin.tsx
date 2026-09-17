import { useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { ScreenHeader } from "@/src/components/screen-header";
import { Icon } from "@/src/components/icon";
import { useApp, PayoutStatus } from "@/src/store/app-store";
import { useToast } from "@/src/components/toast";
import { formatPoints, formatRupees } from "@/src/utils/format";
import { makeStyles, useTheme } from "@/src/theme";

const STATUS_OPTS: PayoutStatus[] = ["pending", "successful", "failed"];

export default function Admin() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const {
    state,
    adminAdjust,
    setPayoutStatus,
    setProfile,
    setAdminPin,
    resetAll,
    exportBackup,
    importBackup,
    addCustomNotification,
  } = useApp();
  const { showToast } = useToast();

  const [pts, setPts] = useState("100");
  const [name, setName] = useState(state.profile.name);
  const [mobile, setMobile] = useState(state.profile.mobile);
  const [newPin, setNewPin] = useState("");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const totalEarned = state.txns.filter((t) => t.points > 0).reduce((a, t) => a + t.points, 0);
  const pendingPayouts = state.payouts.filter((p) => p.status === "pending").length;

  const adjust = (sign: number) => {
    const n = parseInt(pts, 10);
    if (!n) return showToast("Enter a valid amount.", "error");
    adminAdjust(sign * n, sign > 0 ? "Admin credit" : "Admin debit");
    showToast(`${sign > 0 ? "Added" : "Removed"} ${n} pts.`, "success");
  };

  const saveProfile = () => {
    setProfile({ name: name.trim() || "Guest", mobile: mobile.trim() });
    showToast("Profile updated.", "success");
  };

  const sendNotif = () => {
    if (!notifTitle.trim()) return showToast("Enter a notification title.", "error");
    addCustomNotification({ title: notifTitle.trim(), body: notifBody.trim() || "Tap to view details." });
    setNotifTitle("");
    setNotifBody("");
    showToast("Custom notification sent (pinned).", "success");
  };

  const savePin = () => {
    if (!/^\d{4,6}$/.test(newPin)) return showToast("PIN must be 4-6 digits.", "error");
    setAdminPin(newPin);
    setNewPin("");
    showToast("Admin PIN changed.", "success");
  };

  const onExport = async () => {
    await exportBackup();
    showToast("Backup exported. Save it to Drive or Files.", "success");
  };

  const onImport = async () => {
    const res = await importBackup();
    showToast(res.msg, res.ok ? "success" : "error");
  };

  const stats = [
    { icon: "star-four-points", label: "Balance", value: `${formatPoints(state.points)} pts` },
    { icon: "trending-up", label: "Total earned", value: `${formatPoints(totalEarned)} pts` },
    { icon: "bank-transfer-out", label: "Payouts", value: `${state.payouts.length}` },
    { icon: "timer-sand", label: "Pending", value: `${pendingPayouts}` },
  ];

  return (
    <View style={styles.container} key={refreshKey}>
      <StatusBar style="light" />
      <ScreenHeader
        title="Admin Panel"
        right={
          <Pressable onPress={() => { setRefreshKey((k) => k + 1); showToast("Refreshed.", "info"); }} hitSlop={10} testID="admin-refresh-button">
            <Icon name="refresh" size={24} color={colors.brandPrimary} />
          </Pressable>
        }
      />

      <KeyboardAwareScrollView
        bottomOffset={20}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 22 }}
      >
        {/* Stats */}
        <View style={styles.statGrid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Icon name={s.icon} size={22} color={colors.brandPrimary} />
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Points control */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Adjust points</Text>
          <TextInput
            style={styles.input}
            value={pts}
            onChangeText={(t) => setPts(t.replace(/[^0-9]/g, ""))}
            keyboardType="number-pad"
            placeholder="Amount"
            placeholderTextColor={colors.muted}
            testID="admin-points-input"
          />
          <View style={styles.rowBtns}>
            <Pressable style={[styles.smallBtn, { backgroundColor: colors.success }]} onPress={() => adjust(1)} testID="admin-add-points">
              <Icon name="plus" size={18} color={colors.onSuccess} />
              <Text style={[styles.smallBtnText, { color: colors.onSuccess }]}>Add</Text>
            </Pressable>
            <Pressable style={[styles.smallBtn, { backgroundColor: colors.error }]} onPress={() => adjust(-1)} testID="admin-remove-points">
              <Icon name="minus" size={18} color={colors.onError} />
              <Text style={[styles.smallBtnText, { color: colors.onError }]}>Remove</Text>
            </Pressable>
          </View>
        </View>

        {/* Payout management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Manage payouts</Text>
          {state.payouts.length === 0 ? (
            <Text style={styles.muted}>No payout requests yet.</Text>
          ) : (
            state.payouts.map((p) => (
              <View key={p.id} style={styles.payoutRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.payoutAmt}>{formatRupees(p.amountRupees)}</Text>
                  <Text style={styles.muted} numberOfLines={1}>{p.upi}</Text>
                </View>
                <View style={styles.statusBtns}>
                  {STATUS_OPTS.map((opt) => {
                    const active = p.status === opt;
                    const tint = opt === "successful" ? colors.success : opt === "failed" ? colors.error : colors.warning;
                    return (
                      <Pressable
                        key={opt}
                        onPress={() => setPayoutStatus(p.id, opt)}
                        style={[styles.statusPill, active && { backgroundColor: tint, borderColor: tint }]}
                        testID={`admin-status-${p.id}-${opt}`}
                      >
                        <Text style={[styles.statusPillText, active && { color: colors.onSurfaceInverse }]}>
                          {opt[0].toUpperCase()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Profile */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User profile</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Name" placeholderTextColor={colors.muted} testID="admin-name-input" />
          <TextInput style={[styles.input, { marginTop: 12 }]} value={mobile} onChangeText={(t) => setMobile(t.replace(/[^0-9]/g, "").slice(0, 10))} placeholder="Mobile number" placeholderTextColor={colors.muted} keyboardType="number-pad" testID="admin-mobile-input" />
          <Pressable style={styles.wideBtn} onPress={saveProfile} testID="admin-save-profile">
            <Text style={styles.wideBtnText}>Save profile</Text>
          </Pressable>
        </View>

        {/* Custom notification */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Send custom notification</Text>
          <Text style={styles.muted}>Custom notifications are pinned to the top of the user&apos;s notifications.</Text>
          <TextInput style={styles.input} value={notifTitle} onChangeText={setNotifTitle} placeholder="Title" placeholderTextColor={colors.muted} testID="admin-notif-title" />
          <TextInput style={[styles.input, { marginTop: 12 }]} value={notifBody} onChangeText={setNotifBody} placeholder="Message" placeholderTextColor={colors.muted} testID="admin-notif-body" />
          <Pressable style={styles.wideBtn} onPress={sendNotif} testID="admin-send-notif">
            <Text style={styles.wideBtnText}>Send notification</Text>
          </Pressable>
        </View>

        {/* PIN */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Change admin PIN</Text>
          <TextInput
            style={styles.input}
            value={newPin}
            onChangeText={(t) => setNewPin(t.replace(/[^0-9]/g, "").slice(0, 6))}
            keyboardType="number-pad"
            secureTextEntry
            placeholder="New 4-6 digit PIN"
            placeholderTextColor={colors.muted}
            testID="admin-pin-input"
          />
          <Pressable style={styles.wideBtn} onPress={savePin} testID="admin-save-pin">
            <Text style={styles.wideBtnText}>Update PIN</Text>
          </Pressable>
        </View>

        {/* Data / backup */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & backup</Text>
          <Text style={styles.muted}>
            All your data lives on this device. Export a backup file to keep it safe even if app data is cleared or
            reinstalled, then import it anytime.
          </Text>
          <View style={styles.rowBtns}>
            <Pressable style={[styles.smallBtn, { backgroundColor: colors.brandPrimary }]} onPress={onExport} testID="admin-export">
              <Icon name="export-variant" size={18} color={colors.onBrand} />
              <Text style={[styles.smallBtnText, { color: colors.onBrand }]}>Export</Text>
            </Pressable>
            <Pressable style={[styles.smallBtn, { backgroundColor: colors.surfaceTertiary }]} onPress={onImport} testID="admin-import">
              <Icon name="import" size={18} color={colors.onSurface} />
              <Text style={[styles.smallBtnText, { color: colors.onSurface }]}>Import</Text>
            </Pressable>
          </View>
          <Pressable
            style={styles.resetBtn}
            onPress={() => { resetAll(); showToast("All data reset.", "success"); }}
            testID="admin-reset"
          >
            <Icon name="delete-forever" size={18} color={colors.error} />
            <Text style={styles.resetText}>Reset all data</Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: {
    width: "47%",
    flexGrow: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { color: colors.onSurface, fontSize: 20, fontWeight: "900" },
  statLabel: { color: colors.muted, fontSize: 13 },
  section: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  sectionTitle: { color: colors.onSurface, fontSize: 17, fontWeight: "800" },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  input: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.onSurface,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowBtns: { flexDirection: "row", gap: 12 },
  smallBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },
  smallBtnText: { fontSize: 15, fontWeight: "800" },
  wideBtn: { backgroundColor: colors.brandPrimary, borderRadius: 12, paddingVertical: 15, alignItems: "center" },
  wideBtnText: { color: colors.onBrand, fontSize: 15, fontWeight: "800" },
  payoutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  payoutAmt: { color: colors.onSurface, fontSize: 16, fontWeight: "800" },
  statusBtns: { flexDirection: "row", gap: 8 },
  statusPill: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceTertiary,
  },
  statusPillText: { color: colors.onSurfaceTertiary, fontSize: 14, fontWeight: "800" },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.error,
  },
  resetText: { color: colors.error, fontSize: 15, fontWeight: "800" },
}));
