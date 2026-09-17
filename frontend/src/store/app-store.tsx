import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";

import { storage } from "@/src/utils/storage";
import { uid } from "@/src/utils/format";
import { POINTS_PER_RUPEE } from "@/src/constants/games";

const STATE_KEY = "tasklio_state_v2";
const BACKUP_FILE = FileSystem.documentDirectory + "tasklio_backup.json";

export type PayoutStatus = "pending" | "successful" | "failed";

export type Txn = {
  id: string;
  kind: "earn" | "payout" | "adjust";
  title: string;
  points: number; // positive earn, negative spend
  ts: number;
};

export type Notif = {
  id: string;
  icon: string;
  tintKey: "accentSpin" | "accentPuzzle" | "accentQuiz" | "accentTap" | "accentLucky" | "info" | "success";
  title: string;
  body: string;
  ts: number;
  read: boolean;
};

export type Payout = {
  id: string;
  amountRupees: number;
  upi: string;
  status: PayoutStatus;
  ts: number;
};

export type AppState = {
  profile: { name: string; email: string };
  points: number;
  txns: Txn[];
  notifs: Notif[];
  payouts: Payout[];
  cooldowns: Record<string, number>;
  adminPin: string;
};

function seedState(): AppState {
  const now = Date.now();
  return {
    profile: { name: "Guest", email: "guest@example.com" },
    points: 0,
    txns: [],
    notifs: [
      {
        id: uid(),
        icon: "wallet",
        tintKey: "info",
        title: "Welcome to Tasklio",
        body: "Play games, collect points and cash out over UPI.",
        ts: now,
        read: false,
      },
      {
        id: uid(),
        icon: "star",
        tintKey: "accentSpin",
        title: "Daily rewards are live",
        body: "Spin the wheel every day for bonus points.",
        ts: now - 26 * 60 * 60 * 1000,
        read: true,
      },
    ],
    payouts: [],
    cooldowns: {},
    adminPin: "1234",
  };
}

type Ctx = {
  ready: boolean;
  state: AppState;
  earnPoints: (opts: { gameId?: string; points: number; title: string }) => void;
  requestPayout: (amountRupees: number, upi: string) => { ok: boolean; msg: string };
  markAllRead: () => void;
  clearNotifs: () => void;
  pushNotif: (n: Omit<Notif, "id" | "ts" | "read">) => void;
  canPlay: (gameId: string, cooldownMs: number) => { ok: boolean; remainingMs: number };
  // admin
  adminAdjust: (delta: number, note: string) => void;
  setPayoutStatus: (id: string, status: PayoutStatus) => void;
  setProfile: (p: { name: string; email: string }) => void;
  setAdminPin: (pin: string) => void;
  resetAll: () => void;
  exportBackup: () => Promise<string>;
  importBackup: () => Promise<{ ok: boolean; msg: string }>;
};

const AppCtx = createContext<Ctx | null>(null);

export function useApp(): Ctx {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<AppState>(seedState);
  const loaded = useRef(false);

  // Load once
  useEffect(() => {
    (async () => {
      const raw = await storage.getItem(STATE_KEY, "");
      let next: AppState | null = null;
      if (raw && typeof raw === "string") {
        try {
          next = JSON.parse(raw) as AppState;
        } catch {
          next = null;
        }
      }
      // Fallback: try device backup file (survives some reinstall/backup cases)
      if (!next) {
        try {
          const info = await FileSystem.getInfoAsync(BACKUP_FILE);
          if (info.exists) {
            const fileRaw = await FileSystem.readAsStringAsync(BACKUP_FILE);
            next = JSON.parse(fileRaw) as AppState;
          }
        } catch {
          next = null;
        }
      }
      if (next) setState({ ...seedState(), ...next });
      loaded.current = true;
      setReady(true);
    })();
  }, []);

  // Persist on every change (AsyncStorage + device backup file)
  useEffect(() => {
    if (!loaded.current) return;
    const json = JSON.stringify(state);
    storage.setItem(STATE_KEY, json);
    FileSystem.writeAsStringAsync(BACKUP_FILE, json).catch(() => {});
  }, [state]);

  const pushNotif: Ctx["pushNotif"] = (n) => {
    setState((s) => ({
      ...s,
      notifs: [{ ...n, id: uid(), ts: Date.now(), read: false }, ...s.notifs],
    }));
  };

  const earnPoints: Ctx["earnPoints"] = ({ gameId, points, title }) => {
    setState((s) => {
      const cooldowns = gameId ? { ...s.cooldowns, [gameId]: Date.now() } : s.cooldowns;
      return {
        ...s,
        points: s.points + points,
        cooldowns,
        txns: [{ id: uid(), kind: "earn", title, points, ts: Date.now() }, ...s.txns],
        notifs: [
          {
            id: uid(),
            icon: "star",
            tintKey: "accentSpin",
            title: `You earned ${points} points`,
            body: `${title} added ${points} pts to your wallet.`,
            ts: Date.now(),
            read: false,
          },
          ...s.notifs,
        ],
      };
    });
  };

  const requestPayout: Ctx["requestPayout"] = (amountRupees, upi) => {
    const cost = Math.round(amountRupees * POINTS_PER_RUPEE);
    if (!upi || !/^[\w.\-]{2,}@[\w.\-]{2,}$/.test(upi)) {
      return { ok: false, msg: "Enter a valid UPI ID (name@bank)." };
    }
    if (state.points < cost) {
      return { ok: false, msg: "Not enough points for this payout." };
    }
    setState((s) => ({
      ...s,
      points: s.points - cost,
      payouts: [
        { id: uid(), amountRupees, upi, status: "pending", ts: Date.now() },
        ...s.payouts,
      ],
      txns: [
        { id: uid(), kind: "payout", title: `Payout to ${upi}`, points: -cost, ts: Date.now() },
        ...s.txns,
      ],
      notifs: [
        {
          id: uid(),
          icon: "bank-transfer-out",
          tintKey: "info",
          title: "Payout requested",
          body: `Your ₹${amountRupees.toFixed(2)} payout to ${upi} is being processed.`,
          ts: Date.now(),
          read: false,
        },
        ...s.notifs,
      ],
    }));
    return { ok: true, msg: `Payout of ₹${amountRupees.toFixed(2)} requested.` };
  };

  const markAllRead: Ctx["markAllRead"] = () =>
    setState((s) => ({ ...s, notifs: s.notifs.map((n) => ({ ...n, read: true })) }));

  const clearNotifs: Ctx["clearNotifs"] = () => setState((s) => ({ ...s, notifs: [] }));

  const canPlay: Ctx["canPlay"] = (gameId, cooldownMs) => {
    if (!cooldownMs) return { ok: true, remainingMs: 0 };
    const last = state.cooldowns[gameId] ?? 0;
    const remainingMs = last + cooldownMs - Date.now();
    return { ok: remainingMs <= 0, remainingMs: Math.max(0, remainingMs) };
  };

  const adminAdjust: Ctx["adminAdjust"] = (delta, note) => {
    setState((s) => ({
      ...s,
      points: Math.max(0, s.points + delta),
      txns: [{ id: uid(), kind: "adjust", title: note, points: delta, ts: Date.now() }, ...s.txns],
    }));
  };

  const setPayoutStatus: Ctx["setPayoutStatus"] = (id, status) => {
    setState((s) => ({
      ...s,
      payouts: s.payouts.map((p) => (p.id === id ? { ...p, status } : p)),
    }));
  };

  const setProfile: Ctx["setProfile"] = (profile) => setState((s) => ({ ...s, profile }));
  const setAdminPin: Ctx["setAdminPin"] = (pin) => setState((s) => ({ ...s, adminPin: pin }));

  const resetAll: Ctx["resetAll"] = () => setState(seedState());

  const exportBackup: Ctx["exportBackup"] = async () => {
    const json = JSON.stringify(state, null, 2);
    const path = FileSystem.cacheDirectory + "tasklio-backup.json";
    await FileSystem.writeAsStringAsync(path, json);
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, { mimeType: "application/json", dialogTitle: "Save Tasklio backup" });
    }
    return path;
  };

  const importBackup: Ctx["importBackup"] = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: "application/json", copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]) return { ok: false, msg: "Import cancelled." };
      const content = await FileSystem.readAsStringAsync(res.assets[0].uri);
      const parsed = JSON.parse(content) as AppState;
      if (typeof parsed.points !== "number") return { ok: false, msg: "Invalid backup file." };
      setState({ ...seedState(), ...parsed });
      return { ok: true, msg: "Backup restored successfully." };
    } catch {
      return { ok: false, msg: "Could not read backup file." };
    }
  };

  const value: Ctx = {
    ready,
    state,
    earnPoints,
    requestPayout,
    markAllRead,
    clearNotifs,
    pushNotif,
    canPlay,
    adminAdjust,
    setPayoutStatus,
    setProfile,
    setAdminPin,
    resetAll,
    exportBackup,
    importBackup,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
