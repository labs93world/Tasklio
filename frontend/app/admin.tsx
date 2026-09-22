import { useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, Modal, Switch, ActivityIndicator } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Clipboard from "expo-clipboard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { ScreenHeader } from "@/src/components/screen-header";
import { Icon } from "@/src/components/icon";
import { useToast } from "@/src/components/toast";
import { api } from "@/src/api/client";
import { formatPoints, formatRupees, formatDateShort } from "@/src/utils/format";
import { makeStyles, useTheme } from "@/src/theme";
import { GAMES } from "@/src/constants/games";

type ManageTab = "users" | "payout" | "config" | "settings";
type PS = "pending" | "successful" | "failed";

type AUser = { id: string; name: string; mobile: string; points: number; createdAt: number; txns: any[]; payouts: any[] };
type APayout = { id: string; amountRupees: number; upi: string; status: PS; ts: number; reason?: string; user: { id: string; name: string; mobile: string } | null };

const MANAGE_TABS: { id: ManageTab; label: string; icon: string }[] = [
  { id: "users", label: "Users", icon: "account-group" },
  { id: "payout", label: "Payout", icon: "bank-transfer" },
  { id: "config", label: "Config", icon: "tune-vertical" },
  { id: "settings", label: "Settings", icon: "cog" },
];

const STATUS_META: Record<PS, { label: string; key: "warning" | "success" | "error"; icon: string }> = {
  pending: { label: "Pending", key: "warning", icon: "clock-outline" },
  successful: { label: "Successful", key: "success", icon: "check-circle" },
  failed: { label: "Rejected", key: "error", icon: "close-circle" },
};

export default function Admin() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const qc = useQueryClient();

  const [section, setSection] = useState<"dashboard" | "manage">("dashboard");
  const [manageTab, setManageTab] = useState<ManageTab>("users");
  const [payoutTab, setPayoutTab] = useState<PS>("pending");
  const [liveTab, setLiveTab] = useState<"banner" | "notification">("banner");
  const [configTab, setConfigTab] = useState<"reward" | "chances" | "wallet">("reward");
  const [settingsTab, setSettingsTab] = useState<"maintenance" | "update" | "menu">("maintenance");

  const [userQuery, setUserQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<AUser | null>(null);
  const [detailTab, setDetailTab] = useState<"activity" | "payouts">("activity");
  const [revealPw, setRevealPw] = useState(false);
  const [editName, setEditName] = useState("");
  const [editMobile, setEditMobile] = useState("");
  const [editPw, setEditPw] = useState("");
  const [adjust, setAdjust] = useState("");

  const [confirm, setConfirm] = useState<{ kind: "approve" | "reject" | "delete"; payout?: APayout; user?: AUser } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");

  // ---- queries ----
  const dashQ = useQuery({ queryKey: ["admin-dash"], queryFn: () => api("/admin/dashboard", { admin: true }) });
  const usersQ = useQuery({ queryKey: ["admin-users", userQuery], queryFn: () => api<AUser[]>(`/admin/users?q=${encodeURIComponent(userQuery)}`, { admin: true }) });
  const payoutsQ = useQuery({ queryKey: ["admin-payouts"], queryFn: () => api<APayout[]>("/admin/payouts", { admin: true }) });
  const configQ = useQuery({ queryKey: ["admin-config"], queryFn: () => api("/config", { auth: false }) });

  // editable config forms (seeded from configQ)
  const cfg = configQ.data as any;
  const [form, setForm] = useState<any>(null);
  const f = form ?? cfg ?? {};
  const setF = (patch: any) => setForm({ ...(form ?? cfg), ...patch });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["admin-dash"] });
    qc.invalidateQueries({ queryKey: ["admin-users"] });
    qc.invalidateQueries({ queryKey: ["admin-payouts"] });
    qc.invalidateQueries({ queryKey: ["admin-config"] });
  };

  const saveConfig = useMutation({
    mutationFn: (patch: any) => api("/admin/config", { admin: true, method: "PUT", body: patch }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-config"] }); showToast("Saved.", "success"); },
    onError: (e: any) => showToast(e?.message || "Save failed.", "error"),
  });

  const notifyM = useMutation({
    mutationFn: (b: { title: string; body: string; userId?: string }) => api("/admin/notify", { admin: true, method: "POST", body: b }),
    onSuccess: (r: any) => { setNotifTitle(""); setNotifBody(""); showToast(`Sent to ${r.recipients} user(s).`, "success"); },
    onError: (e: any) => showToast(e?.message || "Send failed.", "error"),
  });

  const pointsM = useMutation({
    mutationFn: (b: { id: string; delta: number }) => api(`/admin/users/${b.id}/points`, { admin: true, method: "PATCH", body: { delta: b.delta, note: "Admin adjustment" } }),
    onSuccess: (u: any) => { setSelectedUser(u); setAdjust(""); invalidateAll(); showToast("Points updated.", "success"); },
    onError: (e: any) => showToast(e?.message || "Failed.", "error"),
  });

  const editM = useMutation({
    mutationFn: (b: { id: string; name: string; mobile: string; password?: string }) => api(`/admin/users/${b.id}`, { admin: true, method: "PATCH", body: { name: b.name, mobile: b.mobile, password: b.password || undefined } }),
    onSuccess: (u: any) => { setSelectedUser(u); setEditPw(""); invalidateAll(); showToast("User updated.", "success"); },
    onError: (e: any) => showToast(e?.message || "Failed.", "error"),
  });

  const statusM = useMutation({
    mutationFn: (b: { id: string; status: PS; reason?: string }) => api(`/admin/payouts/${b.id}/status`, { admin: true, method: "POST", body: { status: b.status, reason: b.reason } }),
    onSuccess: () => { invalidateAll(); showToast("Payout updated.", "success"); },
    onError: (e: any) => showToast(e?.message || "Failed.", "error"),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => api(`/admin/users/${id}`, { admin: true, method: "DELETE" }),
    onSuccess: () => { setSelectedUser(null); invalidateAll(); showToast("Account deleted.", "info"); },
    onError: (e: any) => showToast(e?.message || "Failed.", "error"),
  });

  const dash = (dashQ.data as any) ?? { users: 0, pendingCount: 0, pendingAmt: 0, paidCount: 0, paidAmt: 0 };
  const users = usersQ.data ?? [];
  const payouts = payoutsQ.data ?? [];
  const filteredPayouts = useMemo(() => payouts.filter((p) => p.status === payoutTab), [payouts, payoutTab]);

  const copy = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    showToast(`${label} copied`, "success");
  };

  const openUser = (u: AUser) => {
    setSelectedUser(u);
    setEditName(u.name);
    setEditMobile(u.mobile);
    setEditPw("");
    setAdjust("");
    setDetailTab("activity");
    setRevealPw(false);
  };

  const onConfirm = () => {
    if (!confirm) return;
    if (confirm.kind === "approve" && confirm.payout) statusM.mutate({ id: confirm.payout.id, status: "successful" });
    if (confirm.kind === "reject" && confirm.payout) statusM.mutate({ id: confirm.payout.id, status: "failed", reason: rejectReason.trim() || undefined });
    if (confirm.kind === "delete" && confirm.user) deleteM.mutate(confirm.user.id);
    setConfirm(null);
    setRejectReason("");
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScreenHeader title="Admin Panel" />

      <View style={styles.sectionSwitch}>
        {(["dashboard", "manage"] as const).map((s) => (
          <Pressable key={s} onPress={() => setSection(s)} style={[styles.sectionBtn, section === s && styles.sectionBtnActive]} testID={`admin-section-${s}`}>
            <Icon name={s === "dashboard" ? "view-dashboard" : "cog-outline"} size={18} color={section === s ? colors.onBrand : colors.muted} />
            <Text style={[styles.sectionBtnText, section === s && styles.sectionBtnTextActive]}>{s === "dashboard" ? "Dashboard" : "Manage"}</Text>
          </Pressable>
        ))}
      </View>

      {section === "manage" ? (
        <View style={styles.chipRowWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {MANAGE_TABS.map((t) => {
              const active = manageTab === t.id;
              return (
                <Pressable key={t.id} onPress={() => setManageTab(t.id)} style={[styles.chip, active && styles.chipActive]} testID={`admin-tab-${t.id}`}>
                  <Icon name={t.icon} size={16} color={active ? colors.brandPrimary : colors.muted} />
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <KeyboardAwareScrollView bottomOffset={20} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 16 }}>
        {/* DASHBOARD */}
        {section === "dashboard" ? (
          <>
            <View style={styles.dashRow}>
              <View style={[styles.dashCard, { borderColor: colors.brandPrimary }]} testID="admin-dash-users">
                <Icon name="account-group" size={22} color={colors.brandPrimary} />
                <Text style={styles.dashValue}>{dash.users}</Text>
                <Text style={styles.dashLabel}>Users</Text>
              </View>
              <View style={[styles.dashCard, { borderColor: colors.warning }]} testID="admin-dash-pending">
                <Icon name="clock-outline" size={22} color={colors.warning} />
                <Text style={styles.dashValue}>{dash.pendingCount}</Text>
                <Text style={styles.dashLabel}>Pending</Text>
                <Text style={styles.dashSub}>{formatRupees(dash.pendingAmt)}</Text>
              </View>
              <View style={[styles.dashCard, { borderColor: colors.success }]} testID="admin-dash-paid">
                <Icon name="check-circle" size={22} color={colors.success} />
                <Text style={styles.dashValue}>{dash.paidCount}</Text>
                <Text style={styles.dashLabel}>Paid</Text>
                <Text style={styles.dashSub}>{formatRupees(dash.paidAmt)}</Text>
              </View>
            </View>

            <SubTabs styles={styles} value={liveTab} onChange={(v: any) => setLiveTab(v)} options={[{ id: "banner", label: "Banner" }, { id: "notification", label: "Notification" }]} />
            {liveTab === "banner" ? (
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Home banners</Text>
                {(f.banners ?? []).map((b: any, i: number) => (
                  <View key={i} style={styles.listRow} testID={`admin-banner-${i}`}>
                    <Icon name="image" size={18} color={colors.brandPrimary} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{b.title}</Text>
                      <Text style={styles.rowSub} numberOfLines={1}>{b.route}</Text>
                    </View>
                    <Switch value={b.enabled} onValueChange={(v) => setF({ banners: f.banners.map((x: any, j: number) => (j === i ? { ...x, enabled: v } : x)) })} trackColor={{ true: colors.brandPrimary, false: colors.surfaceTertiary }} thumbColor={colors.onSurface} testID={`admin-banner-toggle-${i}`} />
                  </View>
                ))}
                <Pressable style={styles.wideBtn} onPress={() => saveConfig.mutate({ banners: f.banners })} testID="admin-save-banners">
                  <Text style={styles.wideBtnText}>Save banners</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Push notification</Text>
                <Text style={styles.muted}>Sent to all users (push + in-app), pinned to the top of their notifications.</Text>
                <TextInput style={styles.input} placeholder="Title" placeholderTextColor={colors.muted} value={notifTitle} onChangeText={setNotifTitle} testID="admin-notif-title" />
                <TextInput style={styles.input} placeholder="Message" placeholderTextColor={colors.muted} value={notifBody} onChangeText={setNotifBody} testID="admin-notif-body" />
                <Pressable style={styles.wideBtn} onPress={() => notifTitle.trim() ? notifyM.mutate({ title: notifTitle.trim(), body: notifBody.trim() || "Tap to view details." }) : showToast("Enter a title.", "error")} disabled={notifyM.isPending} testID="admin-push-notif">
                  {notifyM.isPending ? <ActivityIndicator color={colors.onBrand} /> : <Text style={styles.wideBtnText}>Push to all users</Text>}
                </Pressable>
              </View>
            )}
          </>
        ) : null}

        {/* USERS */}
        {section === "manage" && manageTab === "users" ? (
          <>
            <View style={styles.searchWrap}>
              <Icon name="magnify" size={20} color={colors.muted} />
              <TextInput style={styles.searchInput} placeholder="Search by mobile number" placeholderTextColor={colors.muted} value={userQuery} onChangeText={(t) => setUserQuery(t.replace(/[^0-9]/g, "").slice(0, 10))} keyboardType="number-pad" testID="admin-user-search" />
              {userQuery ? <Pressable onPress={() => setUserQuery("")} hitSlop={10} testID="admin-user-search-clear"><Icon name="close-circle" size={18} color={colors.muted} /></Pressable> : null}
            </View>
            {usersQ.isLoading ? <ActivityIndicator color={colors.brandPrimary} /> : users.length === 0 ? (
              <Text style={styles.muted}>No user found.</Text>
            ) : (
              users.map((u) => (
                <Pressable key={u.id} style={styles.userRow} onPress={() => openUser(u)} testID={`admin-user-${u.id}`}>
                  <View style={styles.avatar}><Icon name="account" size={22} color={colors.brandPrimary} /></View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.userTitleRow}>
                      <Text style={styles.userName} numberOfLines={1}>{u.name} • {u.mobile}</Text>
                      <Pressable onPress={() => copy(u.mobile, "Mobile")} hitSlop={8} testID={`admin-user-copy-${u.id}`}><Icon name="content-copy" size={15} color={colors.muted} /></Pressable>
                    </View>
                    <Text style={styles.userSub} numberOfLines={1}>{formatDateShort(u.createdAt)} • {formatPoints(u.points)}pts • {formatRupees(u.points / 100)}</Text>
                  </View>
                  <Icon name="chevron-right" size={20} color={colors.muted} />
                </Pressable>
              ))
            )}
          </>
        ) : null}

        {/* PAYOUT */}
        {section === "manage" && manageTab === "payout" ? (
          <>
            <SubTabs styles={styles} value={payoutTab} onChange={(v: any) => setPayoutTab(v)} options={[{ id: "pending", label: "Pending" }, { id: "successful", label: "Successful" }, { id: "failed", label: "Rejected" }]} />
            {payoutsQ.isLoading ? <ActivityIndicator color={colors.brandPrimary} /> : filteredPayouts.length === 0 ? (
              <Text style={styles.muted}>No {STATUS_META[payoutTab].label.toLowerCase()} payouts.</Text>
            ) : (
              filteredPayouts.map((p) => (
                <View key={p.id} style={styles.payoutCard} testID={`admin-payout-${p.id}`}>
                  <View style={styles.payoutHead}>
                    <View style={styles.avatarSm}><Icon name="account" size={18} color={colors.brandPrimary} /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.userName} numberOfLines={1}>{p.user?.name} • {p.user?.mobile}</Text>
                      <View style={styles.upiRow}>
                        <Text style={styles.payoutSub} numberOfLines={1}>{formatRupees(p.amountRupees)} • {p.upi}</Text>
                        <Pressable onPress={() => copy(p.upi, "UPI ID")} hitSlop={8} testID={`admin-payout-copy-${p.id}`}><Icon name="content-copy" size={14} color={colors.muted} /></Pressable>
                      </View>
                      <Text style={styles.payoutTime}>{formatDateShort(p.ts)}</Text>
                    </View>
                  </View>
                  {p.status === "pending" ? (
                    <View style={styles.payoutActions}>
                      <Pressable style={[styles.actBtn, { backgroundColor: colors.success }]} onPress={() => setConfirm({ kind: "approve", payout: p })} testID={`admin-approve-${p.id}`}>
                        <Icon name="check" size={16} color={colors.onSuccess} /><Text style={[styles.actBtnText, { color: colors.onSuccess }]}>Approve</Text>
                      </Pressable>
                      <Pressable style={[styles.actBtn, { backgroundColor: colors.error }]} onPress={() => { setRejectReason(""); setConfirm({ kind: "reject", payout: p }); }} testID={`admin-reject-${p.id}`}>
                        <Icon name="close" size={16} color={colors.onError} /><Text style={[styles.actBtnText, { color: colors.onError }]}>Reject</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.statusRow}>
                      <Icon name={STATUS_META[p.status].icon} size={15} color={colors[STATUS_META[p.status].key]} />
                      <Text style={[styles.statusText, { color: colors[STATUS_META[p.status].key] }]}>{STATUS_META[p.status].label}</Text>
                      {p.reason ? <Text style={styles.reasonText} numberOfLines={1}>· {p.reason}</Text> : null}
                    </View>
                  )}
                </View>
              ))
            )}
          </>
        ) : null}

        {/* CONFIG */}
        {section === "manage" && manageTab === "config" ? (
          <>
            <SubTabs styles={styles} value={configTab} onChange={(v: any) => setConfigTab(v)} options={[{ id: "reward", label: "Reward" }, { id: "chances", label: "Chances" }, { id: "wallet", label: "Wallet" }]} />
            {configTab === "reward" ? (
              <>
                <View style={styles.panel}>
                  <Text style={styles.panelTitle}>Daily check-in rewards</Text>
                  <View style={styles.checkinGrid}>
                    {(f.checkinRewards ?? []).map((r: number, i: number) => (
                      <View key={i} style={styles.checkinItem}>
                        <Text style={styles.checkinDay}>Day {i + 1}</Text>
                        <TextInput style={styles.miniInput} value={String(r)} keyboardType="number-pad" onChangeText={(t) => setF({ checkinRewards: f.checkinRewards.map((x: number, j: number) => (j === i ? parseInt(t.replace(/[^0-9]/g, "") || "0", 10) : x)) })} testID={`admin-checkin-${i}`} />
                      </View>
                    ))}
                  </View>
                  <Pressable style={styles.wideBtn} onPress={() => saveConfig.mutate({ checkinRewards: f.checkinRewards })} testID="admin-save-checkin"><Text style={styles.wideBtnText}>Save rewards</Text></Pressable>
                </View>
                <View style={styles.panel}>
                  <Text style={styles.panelTitle}>Per-game max reward</Text>
                  {GAMES.map((g) => (
                    <View key={g.id} style={styles.listRow}>
                      <Icon name="gamepad-variant" size={18} color={colors.brandPrimary} />
                      <Text style={[styles.rowTitle, { flex: 1 }]} numberOfLines={1}>{g.title}</Text>
                      <TextInput style={styles.miniInput} value={String((f.gameMaxReward ?? {})[g.id] ?? 500)} keyboardType="number-pad" onChangeText={(t) => setF({ gameMaxReward: { ...f.gameMaxReward, [g.id]: parseInt(t.replace(/[^0-9]/g, "") || "0", 10) } })} testID={`admin-gamereward-${g.id}`} />
                    </View>
                  ))}
                  <Pressable style={styles.wideBtn} onPress={() => saveConfig.mutate({ gameMaxReward: f.gameMaxReward })} testID="admin-save-gamerewards"><Text style={styles.wideBtnText}>Save game rewards</Text></Pressable>
                </View>
              </>
            ) : configTab === "chances" ? (
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Chances per rewarded ad</Text>
                {GAMES.map((g) => (
                  <View key={g.id} style={styles.listRow}>
                    <Icon name="ticket-confirmation" size={18} color={colors.brandPrimary} />
                    <Text style={[styles.rowTitle, { flex: 1 }]} numberOfLines={1}>{g.title}</Text>
                    <TextInput style={styles.miniInput} value={String((f.chancesPerAd ?? {})[g.id] ?? 3)} keyboardType="number-pad" onChangeText={(t) => setF({ chancesPerAd: { ...f.chancesPerAd, [g.id]: parseInt(t.replace(/[^0-9]/g, "") || "0", 10) } })} testID={`admin-chances-${g.id}`} />
                  </View>
                ))}
                <Pressable style={styles.wideBtn} onPress={() => saveConfig.mutate({ chancesPerAd: f.chancesPerAd })} testID="admin-save-chances"><Text style={styles.wideBtnText}>Save chances</Text></Pressable>
              </View>
            ) : (
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Exchange ratio</Text>
                <View style={styles.ratioRow}>
                  <TextInput style={[styles.miniInput, { width: 90 }]} value={String(f.pointsPerRupee ?? 100)} keyboardType="number-pad" onChangeText={(t) => setF({ pointsPerRupee: parseInt(t.replace(/[^0-9]/g, "") || "1", 10) })} testID="admin-ratio" />
                  <Text style={styles.rowSub}>points = ₹1</Text>
                </View>
                <Text style={[styles.panelTitle, { marginTop: 18 }]}>Point chips</Text>
                <View style={styles.chipsEditRow}>
                  {(f.chips ?? []).map((c: number, i: number) => (
                    <View key={i} style={styles.chipEdit}>
                      <TextInput style={styles.miniInput} value={String(c)} keyboardType="number-pad" onChangeText={(t) => setF({ chips: f.chips.map((x: number, j: number) => (j === i ? parseInt(t.replace(/[^0-9]/g, "") || "0", 10) : x)) })} testID={`admin-chip-${i}`} />
                      <Pressable onPress={() => setF({ chips: f.chips.filter((_: any, j: number) => j !== i) })} hitSlop={8} testID={`admin-chip-del-${i}`}><Icon name="close-circle" size={16} color={colors.error} /></Pressable>
                    </View>
                  ))}
                  <Pressable style={styles.chipAdd} onPress={() => setF({ chips: [...(f.chips ?? []), 0] })} testID="admin-chip-add"><Icon name="plus" size={18} color={colors.brandPrimary} /></Pressable>
                </View>
                <Pressable style={styles.wideBtn} onPress={() => saveConfig.mutate({ pointsPerRupee: f.pointsPerRupee, chips: f.chips })} testID="admin-save-wallet"><Text style={styles.wideBtnText}>Save wallet config</Text></Pressable>
              </View>
            )}
          </>
        ) : null}

        {/* SETTINGS */}
        {section === "manage" && manageTab === "settings" ? (
          <>
            <SubTabs styles={styles} value={settingsTab} onChange={(v: any) => setSettingsTab(v)} options={[{ id: "maintenance", label: "Maintenance" }, { id: "update", label: "Force Update" }, { id: "menu", label: "Slide Menu" }]} />
            {settingsTab === "maintenance" ? (
              <View style={styles.panel}>
                <View style={styles.listRow}>
                  <Icon name="wrench" size={18} color={colors.warning} />
                  <Text style={[styles.rowTitle, { flex: 1 }]}>Global maintenance</Text>
                  <Switch value={!!f.maintenance?.global} onValueChange={(v) => setF({ maintenance: { ...f.maintenance, global: v } })} trackColor={{ true: colors.brandPrimary, false: colors.surfaceTertiary }} thumbColor={colors.onSurface} testID="admin-maint-global" />
                </View>
                <Pressable style={styles.wideBtn} onPress={() => saveConfig.mutate({ maintenance: f.maintenance })} testID="admin-save-maint"><Text style={styles.wideBtnText}>Save maintenance</Text></Pressable>
              </View>
            ) : settingsTab === "update" ? (
              <View style={styles.panel}>
                <View style={styles.listRow}>
                  <Icon name="update" size={18} color={colors.warning} />
                  <Text style={[styles.rowTitle, { flex: 1 }]}>Force update</Text>
                  <Switch value={!!f.forceUpdate?.enabled} onValueChange={(v) => setF({ forceUpdate: { ...f.forceUpdate, enabled: v } })} trackColor={{ true: colors.brandPrimary, false: colors.surfaceTertiary }} thumbColor={colors.onSurface} testID="admin-force-toggle" />
                </View>
                <Text style={styles.rowSub}>Minimum required version</Text>
                <TextInput style={styles.input} value={f.forceUpdate?.minVersion ?? "1.0.0"} onChangeText={(t) => setF({ forceUpdate: { ...f.forceUpdate, minVersion: t } })} placeholder="1.0.0" placeholderTextColor={colors.muted} testID="admin-min-version" />
                <Text style={styles.rowSub}>Update message</Text>
                <TextInput style={styles.input} value={f.forceUpdate?.message ?? ""} onChangeText={(t) => setF({ forceUpdate: { ...f.forceUpdate, message: t } })} placeholder="Update message" placeholderTextColor={colors.muted} multiline testID="admin-update-msg" />
                <Pressable style={styles.wideBtn} onPress={() => saveConfig.mutate({ forceUpdate: f.forceUpdate })} testID="admin-save-update"><Text style={styles.wideBtnText}>Save update settings</Text></Pressable>
              </View>
            ) : (
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Slide menu buttons</Text>
                {(f.slideMenu ?? []).map((m: any, i: number) => (
                  <View key={i} style={styles.menuEdit} testID={`admin-menu-${i}`}>
                    <View style={styles.menuEditHead}>
                      <Icon name={m.icon} size={18} color={colors.brandPrimary} />
                      <TextInput style={[styles.miniInput, { flex: 1 }]} value={m.label} onChangeText={(t) => setF({ slideMenu: f.slideMenu.map((x: any, j: number) => (j === i ? { ...x, label: t } : x)) })} testID={`admin-menu-label-${i}`} />
                      <Pressable onPress={() => setF({ slideMenu: f.slideMenu.filter((_: any, j: number) => j !== i) })} hitSlop={8} testID={`admin-menu-del-${i}`}><Icon name="close-circle" size={16} color={colors.error} /></Pressable>
                    </View>
                    <TextInput style={styles.input} value={m.icon} onChangeText={(t) => setF({ slideMenu: f.slideMenu.map((x: any, j: number) => (j === i ? { ...x, icon: t } : x)) })} placeholder="icon name" placeholderTextColor={colors.muted} testID={`admin-menu-icon-${i}`} />
                    <TextInput style={styles.input} value={m.url} onChangeText={(t) => setF({ slideMenu: f.slideMenu.map((x: any, j: number) => (j === i ? { ...x, url: t } : x)) })} placeholder="url / route" placeholderTextColor={colors.muted} autoCapitalize="none" testID={`admin-menu-url-${i}`} />
                  </View>
                ))}
                <Pressable style={styles.wideBtnOutline} onPress={() => setF({ slideMenu: [...(f.slideMenu ?? []), { icon: "link", label: "New item", url: "" }] })} testID="admin-menu-add"><Icon name="plus" size={18} color={colors.brandPrimary} /><Text style={styles.wideBtnOutlineText}>Add menu item</Text></Pressable>
                <Pressable style={styles.wideBtn} onPress={() => saveConfig.mutate({ slideMenu: f.slideMenu })} testID="admin-save-menu"><Text style={styles.wideBtnText}>Save slide menu</Text></Pressable>
              </View>
            )}
          </>
        ) : null}
      </KeyboardAwareScrollView>

      {/* USER DETAILS */}
      <Modal visible={!!selectedUser} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setSelectedUser(null)}>
        <View style={styles.sheetBackdrop}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} testID="admin-user-details">
            {selectedUser ? (
              <>
                <View style={styles.sheetHandle} />
                <View style={styles.sheetHead}>
                  <View style={styles.avatar}><Icon name="account" size={24} color={colors.brandPrimary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetName}>{selectedUser.name}</Text>
                    <Text style={styles.rowSub}>Joined {formatDateShort(selectedUser.createdAt)}</Text>
                  </View>
                  <Pressable onPress={() => setSelectedUser(null)} hitSlop={10} testID="admin-user-close"><Icon name="close" size={22} color={colors.onSurface} /></Pressable>
                </View>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 8 }} style={{ maxHeight: 480 }}>
                  <View><Text style={styles.fieldLabel}>Name</Text><View style={styles.fieldRow}><TextInput style={styles.fieldInput} value={editName} onChangeText={setEditName} testID="admin-detail-name" /></View></View>
                  <View><Text style={styles.fieldLabel}>Mobile number</Text><View style={styles.fieldRow}><TextInput style={styles.fieldInput} value={editMobile} onChangeText={(t) => setEditMobile(t.replace(/[^0-9]/g, "").slice(0, 10))} keyboardType="number-pad" testID="admin-detail-mobile" /><Pressable onPress={() => copy(editMobile, "Mobile")} hitSlop={8}><Icon name="content-copy" size={16} color={colors.muted} /></Pressable></View></View>
                  <View><Text style={styles.fieldLabel}>New password (optional)</Text><View style={styles.fieldRow}><TextInput style={styles.fieldInput} value={editPw} onChangeText={setEditPw} placeholder="Leave blank to keep" placeholderTextColor={colors.muted} secureTextEntry={!revealPw} testID="admin-detail-password" /><Pressable onPress={() => setRevealPw((v) => !v)} hitSlop={8} testID="admin-detail-pw-toggle"><Icon name={revealPw ? "eye-off" : "eye"} size={18} color={colors.muted} /></Pressable></View></View>

                  <View style={styles.balanceCard}>
                    <View><Text style={styles.rowSub}>Balance</Text><Text style={styles.balanceVal}>{formatPoints(selectedUser.points)} pts</Text></View>
                    <Text style={styles.balanceInr}>{formatRupees(selectedUser.points / 100)}</Text>
                  </View>

                  <Text style={styles.fieldLabel}>Adjust points (+ add / - deduct)</Text>
                  <View style={styles.adjustRow}>
                    <TextInput style={[styles.miniInput, { flex: 1 }]} value={adjust} onChangeText={(t) => setAdjust(t.replace(/[^0-9-]/g, ""))} keyboardType="numbers-and-punctuation" placeholder="e.g. 100 or -50" placeholderTextColor={colors.muted} testID="admin-adjust-input" />
                    <Pressable style={styles.adjustBtn} onPress={() => { const d = parseInt(adjust, 10); if (!isNaN(d) && d !== 0) pointsM.mutate({ id: selectedUser.id, delta: d }); }} testID="admin-adjust-apply"><Text style={styles.wideBtnText}>Apply</Text></Pressable>
                  </View>

                  <Pressable style={styles.wideBtn} onPress={() => editM.mutate({ id: selectedUser.id, name: editName.trim(), mobile: editMobile, password: editPw })} testID="admin-detail-save"><Text style={styles.wideBtnText}>Save changes</Text></Pressable>

                  <SubTabs styles={styles} value={detailTab} onChange={(v: any) => setDetailTab(v)} options={[{ id: "activity", label: "Recent activity" }, { id: "payouts", label: "Payout history" }]} />
                  {detailTab === "activity"
                    ? (selectedUser.txns.length === 0 ? <Text style={styles.muted}>No activity.</Text> : selectedUser.txns.map((t: any) => (
                        <View key={t.id} style={styles.miniRow}>
                          <Icon name="star-four-points" size={16} color={colors.brandPrimary} />
                          <Text style={[styles.rowTitle, { flex: 1 }]} numberOfLines={1}>{t.title}</Text>
                          <Text style={[styles.rowTitle, { color: t.points >= 0 ? colors.success : colors.error }]}>{t.points >= 0 ? "+" : ""}{formatPoints(t.points)}</Text>
                        </View>
                      )))
                    : (selectedUser.payouts.length === 0 ? <Text style={styles.muted}>No payouts.</Text> : selectedUser.payouts.map((p: any) => (
                        <View key={p.id} style={styles.miniRow}>
                          <Icon name={STATUS_META[p.status as PS].icon} size={16} color={colors[STATUS_META[p.status as PS].key]} />
                          <View style={{ flex: 1 }}><Text style={styles.rowTitle} numberOfLines={1}>{formatRupees(p.amountRupees)} • {p.upi}</Text><Text style={styles.rowSub}>{formatDateShort(p.ts)}</Text></View>
                          <Text style={[styles.statusText, { color: colors[STATUS_META[p.status as PS].key] }]}>{STATUS_META[p.status as PS].label}</Text>
                        </View>
                      )))}

                  <Pressable style={styles.deleteBtn} onPress={() => setConfirm({ kind: "delete", user: selectedUser })} testID="admin-detail-delete"><Icon name="delete-forever" size={18} color={colors.error} /><Text style={styles.deleteText}>Delete account</Text></Pressable>
                </ScrollView>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* CONFIRM */}
      <Modal visible={!!confirm} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setConfirm(null)}>
        <View style={styles.dialogBackdrop}>
          <View style={styles.dialog} testID="admin-confirm-dialog">
            {confirm ? (
              <>
                <View style={[styles.dialogIcon, { backgroundColor: confirm.kind === "approve" ? colors.success : colors.error }]}>
                  <Icon name={confirm.kind === "approve" ? "check" : confirm.kind === "reject" ? "close" : "delete-forever"} size={30} color={confirm.kind === "approve" ? colors.onSuccess : colors.onError} />
                </View>
                <Text style={styles.dialogTitle}>{confirm.kind === "approve" ? "Approve payout?" : confirm.kind === "reject" ? "Reject payout?" : "Delete account?"}</Text>
                <Text style={styles.dialogBody}>
                  {confirm.kind === "approve" ? `Approve ${formatRupees(confirm.payout!.amountRupees)} to ${confirm.payout!.user?.name} (${confirm.payout!.upi}).`
                    : confirm.kind === "reject" ? `Reject the ${formatRupees(confirm.payout!.amountRupees)} request from ${confirm.payout!.user?.name}. Points will be refunded.`
                      : `Permanently remove ${confirm.user!.name}'s account.`}
                </Text>
                {confirm.kind === "reject" ? <TextInput style={styles.input} placeholder="Reason for rejection" placeholderTextColor={colors.muted} value={rejectReason} onChangeText={setRejectReason} testID="admin-reject-reason" /> : null}
                <View style={styles.dialogBtns}>
                  <Pressable style={styles.dialogCancel} onPress={() => setConfirm(null)} testID="admin-confirm-cancel"><Text style={styles.dialogCancelText}>Cancel</Text></Pressable>
                  <Pressable style={[styles.dialogOk, { backgroundColor: confirm.kind === "approve" ? colors.success : colors.error }]} onPress={onConfirm} testID="admin-confirm-ok">
                    <Text style={[styles.dialogOkText, { color: confirm.kind === "approve" ? colors.onSuccess : colors.onError }]}>{confirm.kind === "approve" ? "Approve" : confirm.kind === "reject" ? "Reject" : "Delete"}</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SubTabs({ styles, value, onChange, options }: any) {
  return (
    <View style={styles.subTabs}>
      {options.map((o: any) => {
        const active = value === o.id;
        return (
          <Pressable key={o.id} onPress={() => onChange(o.id)} style={[styles.subTab, active && styles.subTabActive]} testID={`admin-subtab-${o.id}`}>
            <Text style={[styles.subTabText, active && styles.subTabTextActive]} numberOfLines={1}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  sectionSwitch: { flexDirection: "row", gap: 8, padding: 16, paddingBottom: 8 },
  sectionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  sectionBtnActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  sectionBtnText: { color: colors.muted, fontSize: 15, fontWeight: "800" },
  sectionBtnTextActive: { color: colors.onBrand },
  chipRowWrap: { height: 56, justifyContent: "center" },
  chipRow: { gap: 8, paddingHorizontal: 16, alignItems: "center" },
  chip: { flexShrink: 0, height: 36, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.brandSecondary, borderColor: colors.brandPrimary },
  chipText: { color: colors.muted, fontSize: 14, fontWeight: "700" },
  chipTextActive: { color: colors.brandPrimary },
  dashRow: { flexDirection: "row", gap: 10 },
  dashCard: { flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: 16, padding: 14, gap: 6, borderWidth: 1 },
  dashValue: { color: colors.onSurface, fontSize: 26, fontWeight: "900" },
  dashLabel: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "700" },
  dashSub: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  panel: { backgroundColor: colors.surfaceSecondary, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 12 },
  panelTitle: { color: colors.onSurface, fontSize: 16, fontWeight: "800" },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  input: { backgroundColor: colors.surfaceTertiary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, color: colors.onSurface, fontSize: 15, borderWidth: 1, borderColor: colors.border },
  wideBtn: { backgroundColor: colors.brandPrimary, borderRadius: 12, paddingVertical: 15, alignItems: "center" },
  wideBtnText: { color: colors.onBrand, fontSize: 15, fontWeight: "800" },
  wideBtnOutline: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 14, borderWidth: 1, borderColor: colors.brandPrimary },
  wideBtnOutlineText: { color: colors.brandPrimary, fontSize: 15, fontWeight: "800" },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surfaceSecondary, borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, color: colors.onSurface, fontSize: 15, paddingVertical: 14 },
  userRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surfaceSecondary, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  avatarSm: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  userTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  userName: { color: colors.onSurface, fontSize: 15, fontWeight: "800", flexShrink: 1 },
  userSub: { color: colors.muted, fontSize: 12, marginTop: 3 },
  subTabs: { flexDirection: "row", gap: 6, backgroundColor: colors.surfaceSecondary, borderRadius: 14, padding: 5, borderWidth: 1, borderColor: colors.border },
  subTab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  subTabActive: { backgroundColor: colors.brandSecondary },
  subTabText: { color: colors.muted, fontSize: 13, fontWeight: "800" },
  subTabTextActive: { color: colors.brandPrimary },
  payoutCard: { backgroundColor: colors.surfaceSecondary, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border, gap: 12 },
  payoutHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  upiRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 },
  payoutSub: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "600", flexShrink: 1 },
  payoutTime: { color: colors.muted, fontSize: 12, marginTop: 3 },
  payoutActions: { flexDirection: "row", gap: 10 },
  actBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, paddingVertical: 12 },
  actBtnText: { fontSize: 14, fontWeight: "800" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusText: { fontSize: 13, fontWeight: "800" },
  reasonText: { color: colors.muted, fontSize: 12, flexShrink: 1 },
  listRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 },
  rowTitle: { color: colors.onSurfaceSecondary, fontSize: 14, fontWeight: "700" },
  rowSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  checkinGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  checkinItem: { width: "22%", flexGrow: 1, alignItems: "center", gap: 6, backgroundColor: colors.surfaceTertiary, borderRadius: 12, paddingVertical: 10 },
  checkinDay: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  miniInput: { backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, color: colors.onSurface, fontSize: 14, fontWeight: "700", borderWidth: 1, borderColor: colors.border, minWidth: 60, textAlign: "center" },
  ratioRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  chipsEditRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center" },
  chipEdit: { flexDirection: "row", alignItems: "center", gap: 6 },
  chipAdd: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  menuEdit: { backgroundColor: colors.surfaceTertiary, borderRadius: 14, padding: 12, gap: 10, borderWidth: 1, borderColor: colors.border },
  menuEditHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  adjustRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  adjustBtn: { backgroundColor: colors.brandPrimary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, alignItems: "center" },
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(5,5,7,0.7)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surfaceSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, borderWidth: 1, borderColor: colors.border },
  sheetHandle: { alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: colors.borderStrong, marginBottom: 14 },
  sheetHead: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  sheetName: { color: colors.onSurface, fontSize: 18, fontWeight: "900" },
  fieldLabel: { color: colors.muted, fontSize: 12, fontWeight: "700", marginBottom: 6 },
  fieldRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surfaceTertiary, borderRadius: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.border },
  fieldInput: { flex: 1, color: colors.onSurface, fontSize: 15, paddingVertical: 13 },
  balanceCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.brandSecondary, borderRadius: 14, padding: 16 },
  balanceVal: { color: colors.brandPrimary, fontSize: 22, fontWeight: "900", marginTop: 2 },
  balanceInr: { color: colors.onSurface, fontSize: 16, fontWeight: "800" },
  miniRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surfaceTertiary, borderRadius: 12, padding: 12 },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 14, borderWidth: 1, borderColor: colors.error, marginTop: 4 },
  deleteText: { color: colors.error, fontSize: 15, fontWeight: "800" },
  dialogBackdrop: { flex: 1, backgroundColor: "rgba(5,5,7,0.85)", alignItems: "center", justifyContent: "center", padding: 28 },
  dialog: { width: "100%", maxWidth: 360, backgroundColor: colors.surfaceSecondary, borderRadius: 22, borderWidth: 1, borderColor: colors.border, padding: 22, alignItems: "center", gap: 6 },
  dialogIcon: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  dialogTitle: { color: colors.onSurface, fontSize: 20, fontWeight: "900" },
  dialogBody: { color: colors.onSurfaceSecondary, fontSize: 14, lineHeight: 20, textAlign: "center", marginTop: 4 },
  dialogBtns: { flexDirection: "row", gap: 12, marginTop: 18, alignSelf: "stretch" },
  dialogCancel: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center", backgroundColor: colors.surfaceTertiary },
  dialogCancelText: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  dialogOk: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  dialogOkText: { fontSize: 15, fontWeight: "800" },
}));
