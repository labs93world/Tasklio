import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";

import { storage } from "@/src/utils/storage";
import { uid } from "@/src/utils/format";
import { POINTS_PER_RUPEE, GAMES } from "@/src/constants/games";

const STATE_KEY = "tasklio_state_v3";
const BACKUP_FILE = FileSystem.documentDirectory + "tasklio_backup.json";

export type PayoutStatus = "pending" | "successful" | "failed";

export type Txn = {
  id: string;
  kind: "earn" | "payout" | "adjust";
  title: string;
  points: number;
  ts: number;
};

export type Notif = {
  id: string;
  icon: string;
  tintKey: string;
  title: string;
  body: string;
  ts: number;
  read: boolean;
  pinned?: boolean;
};

export type Payout = {
  id: string;
  amountRupees: number;
  upi: string;
  status: PayoutStatus;
  ts: number;
};

export type Account = { name: string; mobile: string; passwordHash: string };

export type AppState = {
  profile: { name: string; mobile: string };
  account: Account | null;
  loggedIn: boolean;
  points: number;
  txns: Txn[];
  notifs: Notif[];
  payouts: Payout[];
  cooldowns: Record<string, number>;
  adminPin: string;
  lastDailyReminder: string; // yyyy-mm-dd
  checkin: { lastClaim: string; streak: number }; // yyyy-mm-dd + current day 1-7
  chances: Record<string, number>; // per-game remaining chances
  chancesPerAd: Record<string, number>; // per-game chances granted per rewarded ad
  // Daily missions (reset each calendar day)
  missionDate: string;
  mGames: number;
  mPoints: number;
  mCheckin: boolean;
};

// Daily check-in rewards grow across a 7-day streak, then cycle back to day 1.
export const CHECKIN_REWARDS = [10, 20, 35, 50, 75, 100, 150];

function simpleHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// The day (1-7) that will be claimed next given the current streak state.
export function nextCheckinDay(s: AppState): number {
  if (s.checkin.lastClaim === yesterdayKey()) return (s.checkin.streak % 7) + 1;
  return 1;
}

export function canClaimCheckin(s: AppState): boolean {
  return s.loggedIn && s.checkin.lastClaim !== todayKey();
}

function seedState(): AppState {
  return {
    profile: { name: "Guest", mobile: "" },
    account: null,
    loggedIn: false,
    points: 0,
    txns: [],
    notifs: [],
    payouts: [],
    cooldowns: {},
    adminPin: "1234",
    lastDailyReminder: "",
    checkin: { lastClaim: "", streak: 0 },
    chances: Object.fromEntries(GAMES.map((g) => [g.id, 3])),
    chancesPerAd: Object.fromEntries(GAMES.map((g) => [g.id, 3])),
    missionDate: todayKey(),
    mGames: 0,
    mPoints: 0,
    mCheckin: false,
  };
}

// Reset daily-mission counters when the calendar day changes.
function ensureMissionDay(s: AppState): AppState {
  if (s.missionDate === todayKey()) return s;
  return { ...s, missionDate: todayKey(), mGames: 0, mPoints: 0, mCheckin: false };
}

// Add the 5am "Daily rewards are live" reminder once per day (offline, on open).
function withDailyReminder(s: AppState): AppState {
  if (!s.loggedIn) return s;
  const now = new Date();
  const fiveAm = new Date();
  fiveAm.setHours(5, 0, 0, 0);
  if (now < fiveAm) return s;
  if (s.lastDailyReminder === todayKey()) return s;
  return {
    ...s,
    lastDailyReminder: todayKey(),
    notifs: [
      {
        id: uid(),
        icon: "gift",
        tintKey: "accentSpin",
        title: "Daily rewards are live",
        body: "Come every day for bonus points.",
        ts: Date.now(),
        read: false,
      },
      ...s.notifs,
    ],
  };
}

type AuthResult = { ok: boolean; msg: string };

type Ctx = {
  ready: boolean;
  state: AppState;
  // auth
  createAccount: (d: { name: string; mobile: string; confirmMobile: string; password: string; confirmPassword: string }) => AuthResult;
  login: (d: { mobile: string; password: string }) => AuthResult;
  logout: () => void;
  // gameplay
  earnPoints: (opts: { gameId?: string; points: number; title: string }) => void;
  chancesFor: (gameId: string) => number;
  consumeChance: (gameId: string) => void;
  addChances: (gameId: string) => void;
  chancesPerAd: (gameId: string) => number;
  setChancesPerAd: (gameId: string, n: number) => void;
  getMissions: () => { id: string; icon: string; label: string; current: number; target: number; done: boolean }[];
  claimDailyCheckin: () => { reward: number; day: number } | null;
  requestPayout: (amountRupees: number, upi: string) => AuthResult;
  canPlay: (gameId: string, cooldownMs: number) => { ok: boolean; remainingMs: number };
  // notifications
  markAllRead: () => void;
  markNotifRead: (id: string) => void;
  addCustomNotification: (d: { title: string; body: string }) => void;
  // admin
  adminAdjust: (delta: number, note: string) => void;
  setPayoutStatus: (id: string, status: PayoutStatus) => void;
  setProfile: (p: { name: string; mobile: string }) => void;
  setAdminPin: (pin: string) => void;
  resetAll: () => void;
  exportBackup: () => Promise<string>;
  importBackup: () => Promise<AuthResult>;
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
      if (!next) {
        try {
          const info = await FileSystem.getInfoAsync(BACKUP_FILE);
          if (info.exists) {
            next = JSON.parse(await FileSystem.readAsStringAsync(BACKUP_FILE)) as AppState;
          }
        } catch {
          next = null;
        }
      }
      const merged = next ? { ...seedState(), ...next } : seedState();
      setState(withDailyReminder(merged));
      loaded.current = true;
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    const json = JSON.stringify(state);
    storage.setItem(STATE_KEY, json);
    FileSystem.writeAsStringAsync(BACKUP_FILE, json).catch(() => {});
  }, [state]);

  const createAccount: Ctx["createAccount"] = ({ name, mobile, confirmMobile, password, confirmPassword }) => {
    if (!name.trim()) return { ok: false, msg: "Please enter your name." };
    if (!/^\d{10}$/.test(mobile)) return { ok: false, msg: "Enter a valid 10-digit mobile number." };
    if (mobile !== confirmMobile) return { ok: false, msg: "Mobile numbers do not match." };
    if (password.length < 4) return { ok: false, msg: "Password must be at least 4 characters." };
    if (password !== confirmPassword) return { ok: false, msg: "Passwords do not match." };
    const account: Account = { name: name.trim(), mobile, passwordHash: simpleHash(password) };
    setState((s) => ({ ...s, account, loggedIn: true, profile: { name: account.name, mobile } }));
    return { ok: true, msg: `Welcome, ${account.name}!` };
  };

  const login: Ctx["login"] = ({ mobile, password }) => {
    if (!state.account) return { ok: false, msg: "No account found. Please create one." };
    if (state.account.mobile !== mobile || state.account.passwordHash !== simpleHash(password)) {
      return { ok: false, msg: "Incorrect mobile number or password." };
    }
    setState((s) => ({ ...s, loggedIn: true, profile: { name: s.account!.name, mobile } }));
    return { ok: true, msg: `Welcome back, ${state.account.name}!` };
  };

  const logout: Ctx["logout"] = () => setState((s) => ({ ...s, loggedIn: false }));

  const earnPoints: Ctx["earnPoints"] = ({ gameId, points, title }) => {
    setState((s0) => {
      const s = ensureMissionDay(s0);
      return {
        ...s,
        points: s.points + points,
        mPoints: points > 0 ? s.mPoints + points : s.mPoints,
        cooldowns: gameId ? { ...s.cooldowns, [gameId]: Date.now() } : s.cooldowns,
        // don't record a history entry when nothing was earned
        txns: points !== 0 ? [{ id: uid(), kind: "earn", title, points, ts: Date.now() }, ...s.txns] : s.txns,
      };
    });
  };

  const chancesFor: Ctx["chancesFor"] = (gameId) => state.chances[gameId] ?? 0;
  const chancesPerAd: Ctx["chancesPerAd"] = (gameId) => state.chancesPerAd[gameId] ?? 3;

  const consumeChance: Ctx["consumeChance"] = (gameId) =>
    setState((s0) => {
      const s = ensureMissionDay(s0);
      return {
        ...s,
        chances: { ...s.chances, [gameId]: Math.max(0, (s.chances[gameId] ?? 0) - 1) },
        mGames: s.mGames + 1,
      };
    });

  const addChances: Ctx["addChances"] = (gameId) =>
    setState((s) => ({
      ...s,
      chances: { ...s.chances, [gameId]: (s.chances[gameId] ?? 0) + (s.chancesPerAd[gameId] ?? 3) },
    }));

  const setChancesPerAd: Ctx["setChancesPerAd"] = (gameId, n) =>
    setState((s) => ({ ...s, chancesPerAd: { ...s.chancesPerAd, [gameId]: n } }));

  const getMissions: Ctx["getMissions"] = () => {
    const s = state.missionDate === todayKey() ? state : { mGames: 0, mPoints: 0, mCheckin: false };
    const defs = [
      { id: "play", icon: "gamepad-variant", label: "Play 3 games", current: Math.min(s.mGames, 3), target: 3 },
      { id: "earn", icon: "star-four-points", label: "Earn 300 points", current: Math.min(s.mPoints, 300), target: 300 },
      { id: "checkin", icon: "gift", label: "Complete daily check-in", current: s.mCheckin ? 1 : 0, target: 1 },
    ];
    return defs.map((d) => ({ ...d, done: d.current >= d.target }));
  };

  const claimDailyCheckin: Ctx["claimDailyCheckin"] = () => {
    if (!canClaimCheckin(state)) return null;
    const day = nextCheckinDay(state);
    const reward = CHECKIN_REWARDS[day - 1];
    setState((s0) => {
      const s = ensureMissionDay(s0);
      return {
        ...s,
        points: s.points + reward,
        mPoints: s.mPoints + reward,
        mCheckin: true,
        checkin: { lastClaim: todayKey(), streak: day },
        txns: [{ id: uid(), kind: "earn", title: `Daily check-in · Day ${day}`, points: reward, ts: Date.now() }, ...s.txns],
      };
    });
    return { reward, day };
  };

  const requestPayout: Ctx["requestPayout"] = (amountRupees, upi) => {
    const cost = Math.round(amountRupees * POINTS_PER_RUPEE);
    if (!upi || !/^[\w.\-]{2,}@[\w.\-]{2,}$/.test(upi)) return { ok: false, msg: "Enter a valid UPI ID (name@bank)." };
    if (state.points < cost) return { ok: false, msg: "Not enough points for this payout." };
    setState((s) => ({
      ...s,
      points: s.points - cost,
      payouts: [{ id: uid(), amountRupees, upi, status: "pending", ts: Date.now() }, ...s.payouts],
      txns: [{ id: uid(), kind: "payout", title: `Payout to ${upi}`, points: -cost, ts: Date.now() }, ...s.txns],
    }));
    return { ok: true, msg: `Payout of ₹${amountRupees.toFixed(2)} requested.` };
  };

  const canPlay: Ctx["canPlay"] = (gameId, cooldownMs) => {
    if (!cooldownMs) return { ok: true, remainingMs: 0 };
    const last = state.cooldowns[gameId] ?? 0;
    const remainingMs = last + cooldownMs - Date.now();
    return { ok: remainingMs <= 0, remainingMs: Math.max(0, remainingMs) };
  };

  const markAllRead: Ctx["markAllRead"] = () =>
    setState((s) => ({ ...s, notifs: s.notifs.map((n) => ({ ...n, read: true })) }));

  const markNotifRead: Ctx["markNotifRead"] = (id) =>
    setState((s) => ({ ...s, notifs: s.notifs.map((n) => (n.id === id ? { ...n, read: true } : n)) }));

  const addCustomNotification: Ctx["addCustomNotification"] = ({ title, body }) =>
    setState((s) => ({
      ...s,
      notifs: [
        { id: uid(), icon: "bullhorn", tintKey: "accentQuiz", title, body, ts: Date.now(), read: false, pinned: true },
        ...s.notifs,
      ],
    }));

  const adminAdjust: Ctx["adminAdjust"] = (delta, note) =>
    setState((s) => ({
      ...s,
      points: Math.max(0, s.points + delta),
      txns: [{ id: uid(), kind: "adjust", title: note, points: delta, ts: Date.now() }, ...s.txns],
    }));

  const setPayoutStatus: Ctx["setPayoutStatus"] = (id, status) => {
    setState((s) => {
      const payout = s.payouts.find((p) => p.id === id);
      const payouts = s.payouts.map((p) => (p.id === id ? { ...p, status } : p));
      let notifs = s.notifs;
      if (payout && status === "successful") {
        notifs = [
          {
            id: uid(),
            icon: "check-decagram",
            tintKey: "success",
            title: "Withdrawal successful",
            body: `₹${payout.amountRupees.toFixed(2)} to ${payout.upi} has been credited.`,
            ts: Date.now(),
            read: false,
          },
          ...notifs,
        ];
      } else if (payout && status === "failed") {
        notifs = [
          {
            id: uid(),
            icon: "close-octagon",
            tintKey: "error",
            title: "Withdrawal rejected",
            body: `₹${payout.amountRupees.toFixed(2)} to ${payout.upi} was rejected. Points refunded.`,
            ts: Date.now(),
            read: false,
          },
          ...notifs,
        ];
      }
      // refund points on rejection + record the refund in activity history (guard against double-refund)
      const refund = payout && status === "failed" && payout.status !== "failed" ? Math.round(payout.amountRupees * POINTS_PER_RUPEE) : 0;
      const txns =
        refund > 0
          ? [{ id: uid(), kind: "payout" as const, title: `Payout rejected · refund for ${payout!.upi}`, points: refund, ts: Date.now() }, ...s.txns]
          : s.txns;
      return { ...s, payouts, notifs, points: s.points + refund, txns };
    });
  };

  const setProfile: Ctx["setProfile"] = (profile) =>
    setState((s) => ({ ...s, profile, account: s.account ? { ...s.account, name: profile.name, mobile: profile.mobile } : s.account }));

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
      const parsed = JSON.parse(await FileSystem.readAsStringAsync(res.assets[0].uri)) as AppState;
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
    createAccount,
    login,
    logout,
    earnPoints,
    chancesFor,
    consumeChance,
    addChances,
    chancesPerAd,
    setChancesPerAd,
    getMissions,
    claimDailyCheckin,
    requestPayout,
    canPlay,
    markAllRead,
    markNotifRead,
    addCustomNotification,
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
