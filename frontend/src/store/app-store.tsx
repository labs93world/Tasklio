import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import { api, setToken, clearToken, getToken } from "@/src/api/client";
import { storage } from "@/src/utils/storage";
import { POINTS_PER_RUPEE, GAMES } from "@/src/constants/games";

const ACCOUNT_KEY = "tasklio_account_v1";

export type PayoutStatus = "pending" | "successful" | "failed";
export type Txn = { id: string; kind: "earn" | "payout" | "adjust"; title: string; points: number; ts: number };
export type Notif = { id: string; icon: string; tintKey: string; title: string; body: string; ts: number; read: boolean; pinned?: boolean };
export type Payout = { id: string; amountRupees: number; upi: string; status: PayoutStatus; ts: number; reason?: string };

export type AppConfig = {
  checkinRewards: number[];
  chancesPerAd: Record<string, number>;
  gameMaxReward: Record<string, number>;
  pointsPerRupee: number;
  chips: number[];
  banners: { title: string; body: string; icon: string; tint: string; route: string; enabled: boolean }[];
  maintenance: { global: boolean; screens: Record<string, boolean> };
  forceUpdate: { enabled: boolean; minVersion: string; message: string };
  slideMenu: { icon: string; label: string; url: string }[];
};

export type AppState = {
  profile: { name: string; mobile: string };
  account: { name: string; mobile: string } | null;
  loggedIn: boolean;
  points: number;
  txns: Txn[];
  notifs: Notif[];
  payouts: Payout[];
  cooldowns: Record<string, number>;
  checkin: { lastClaim: string; streak: number };
  chances: Record<string, number>;
  missions: { date: string; games: number; points: number; checkin: boolean };
  config: AppConfig;
};

export const CHECKIN_REWARDS = [10, 20, 35, 50, 75, 100, 150];

const DEFAULT_CONFIG: AppConfig = {
  checkinRewards: CHECKIN_REWARDS,
  chancesPerAd: Object.fromEntries(GAMES.map((g) => [g.id, 3])),
  gameMaxReward: Object.fromEntries(GAMES.map((g) => [g.id, 500])),
  pointsPerRupee: POINTS_PER_RUPEE,
  chips: [100, 500, 1000],
  banners: [],
  maintenance: { global: false, screens: {} },
  forceUpdate: { enabled: false, minVersion: "1.0.0", message: "" },
  slideMenu: [],
};

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
    checkin: { lastClaim: "", streak: 0 },
    chances: Object.fromEntries(GAMES.map((g) => [g.id, 3])),
    missions: { date: "", games: 0, points: 0, checkin: false },
    config: DEFAULT_CONFIG,
  };
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function yesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
export function nextCheckinDay(s: AppState): number {
  if (s.checkin.lastClaim === yesterdayKey()) return (s.checkin.streak % 7) + 1;
  return 1;
}
export function canClaimCheckin(s: AppState): boolean {
  return s.loggedIn && s.checkin.lastClaim !== todayKey();
}

type AuthResult = { ok: boolean; msg: string };

// Server full_state → local AppState (merged onto current so config always present).
function reconcile(prev: AppState, data: any): AppState {
  const u = data.user ?? {};
  return {
    ...prev,
    profile: { name: u.name ?? prev.profile.name, mobile: u.mobile ?? prev.profile.mobile },
    account: u.mobile ? { name: u.name, mobile: u.mobile } : prev.account,
    loggedIn: true,
    points: u.points ?? 0,
    txns: data.txns ?? [],
    notifs: data.notifs ?? [],
    payouts: data.payouts ?? [],
    checkin: u.checkin ?? { lastClaim: "", streak: 0 },
    chances: u.chances ?? prev.chances,
    missions: u.missions ?? prev.missions,
    config: data.config ? { ...DEFAULT_CONFIG, ...data.config } : prev.config,
  };
}

type Ctx = {
  ready: boolean;
  state: AppState;
  createAccount: (d: { name: string; mobile: string; confirmMobile: string; password: string; confirmPassword: string }) => Promise<AuthResult>;
  login: (d: { mobile: string; password: string }) => Promise<AuthResult>;
  logout: () => void;
  refresh: () => Promise<void>;
  earnPoints: (opts: { gameId?: string; points: number; title: string }) => void;
  chancesFor: (gameId: string) => number;
  consumeChance: (gameId: string) => void;
  addChances: (gameId: string) => void;
  chancesPerAd: (gameId: string) => number;
  getMissions: () => { id: string; icon: string; label: string; current: number; target: number; done: boolean }[];
  claimDailyCheckin: () => { reward: number; day: number } | null;
  requestPayout: (amountRupees: number, upi: string) => Promise<AuthResult>;
  canPlay: (gameId: string, cooldownMs: number) => { ok: boolean; remainingMs: number };
  markAllRead: () => void;
  markNotifRead: (id: string) => void;
  setProfile: (p: { name: string; mobile: string }) => void;
};

const AppCtx = createContext<Ctx | null>(null);

export function useApp(): Ctx {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

async function registerPush(userId: string) {
  if (Platform.OS === "web") return;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") return;
    const tok = await Notifications.getDevicePushTokenAsync();
    await api("/register-push", { method: "POST", auth: false, body: { user_id: userId, platform: Platform.OS, device_token: String(tok.data) } });
  } catch {
    // non-blocking
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<AppState>(seedState);
  const userIdRef = useRef<string>("");

  // Load public config first (so banners/menu render even logged-out), then
  // hydrate the session from a stored token if present.
  useEffect(() => {
    (async () => {
      const acct = await storage.getItem<{ name: string; mobile: string } | null>(ACCOUNT_KEY, null);
      try {
        const cfg = await api<AppConfig>("/config", { auth: false });
        setState((s) => ({ ...s, config: { ...DEFAULT_CONFIG, ...cfg }, account: acct ?? s.account }));
      } catch {
        if (acct) setState((s) => ({ ...s, account: acct }));
      }
      const token = await getToken();
      if (token) {
        try {
          const data = await api("/me");
          userIdRef.current = data.user?.id ?? "";
          setState((s) => reconcile(s, data));
          if (userIdRef.current) registerPush(userIdRef.current);
        } catch {
          await clearToken();
        }
      }
      setReady(true);
    })();
  }, []);

  const applyAuth = async (data: any) => {
    if (data.token) await setToken(data.token);
    userIdRef.current = data.user?.id ?? "";
    const acct = data.user?.mobile ? { name: data.user.name, mobile: data.user.mobile } : null;
    if (acct) await storage.setItem(ACCOUNT_KEY, acct);
    setState((s) => reconcile(s, data));
    if (userIdRef.current) registerPush(userIdRef.current);
  };

  const createAccount: Ctx["createAccount"] = async ({ name, mobile, confirmMobile, password, confirmPassword }) => {
    if (!name.trim()) return { ok: false, msg: "Please enter your name." };
    if (!/^\d{10}$/.test(mobile)) return { ok: false, msg: "Enter a valid 10-digit mobile number." };
    if (mobile !== confirmMobile) return { ok: false, msg: "Mobile numbers do not match." };
    if (password.length < 4) return { ok: false, msg: "Password must be at least 4 characters." };
    if (password !== confirmPassword) return { ok: false, msg: "Passwords do not match." };
    try {
      const data = await api("/auth/register", { method: "POST", auth: false, body: { name: name.trim(), mobile, password } });
      await applyAuth(data);
      return { ok: true, msg: `Welcome, ${data.user.name}!` };
    } catch (e: any) {
      return { ok: false, msg: e?.message || "Could not create account." };
    }
  };

  const login: Ctx["login"] = async ({ mobile, password }) => {
    if (!/^\d{10}$/.test(mobile)) return { ok: false, msg: "Enter a valid 10-digit mobile number." };
    try {
      const data = await api("/auth/login", { method: "POST", auth: false, body: { mobile, password } });
      await applyAuth(data);
      return { ok: true, msg: `Welcome back, ${data.user.name}!` };
    } catch (e: any) {
      return { ok: false, msg: e?.message || "Incorrect mobile number or password." };
    }
  };

  const logout: Ctx["logout"] = () => {
    clearToken();
    userIdRef.current = "";
    setState((s) => ({ ...seedState(), config: s.config, account: s.account }));
  };

  const refresh: Ctx["refresh"] = async () => {
    if (!(await getToken())) return;
    try {
      const data = await api("/me");
      setState((s) => reconcile(s, data));
    } catch {
      /* ignore */
    }
  };

  // Mutations: optimistic local update + server sync (reconcile on response).
  const sync = async (path: string, body?: unknown) => {
    try {
      const data = await api(path, { method: "POST", body });
      setState((s) => reconcile(s, data));
    } catch {
      refresh();
    }
  };

  const earnPoints: Ctx["earnPoints"] = ({ gameId, points, title }) => {
    setState((s) => ({
      ...s,
      points: s.points + points,
      cooldowns: gameId ? { ...s.cooldowns, [gameId]: Date.now() } : s.cooldowns,
      txns: points !== 0 ? [{ id: `tmp-${Date.now()}`, kind: "earn", title, points, ts: Date.now() }, ...s.txns] : s.txns,
    }));
    sync("/earn", { gameId, points, title });
  };

  const chancesFor: Ctx["chancesFor"] = (gameId) => state.chances[gameId] ?? 0;
  const chancesPerAd: Ctx["chancesPerAd"] = (gameId) => state.config.chancesPerAd[gameId] ?? 3;

  const consumeChance: Ctx["consumeChance"] = (gameId) => {
    setState((s) => ({
      ...s,
      chances: { ...s.chances, [gameId]: Math.max(0, (s.chances[gameId] ?? 0) - 1) },
      missions: { ...s.missions, games: s.missions.games + 1 },
    }));
    sync("/chances/consume", { gameId });
  };

  const addChances: Ctx["addChances"] = (gameId) => {
    const per = chancesPerAd(gameId);
    setState((s) => ({ ...s, chances: { ...s.chances, [gameId]: (s.chances[gameId] ?? 0) + per } }));
    sync("/chances/add", { gameId });
  };

  const getMissions: Ctx["getMissions"] = () => {
    const m = state.missions.date === todayKey() ? state.missions : { games: 0, points: 0, checkin: false };
    return [
      { id: "play", icon: "gamepad-variant", label: "Play 3 games", current: Math.min(m.games, 3), target: 3 },
      { id: "earn", icon: "star-four-points", label: "Earn 300 points", current: Math.min(m.points, 300), target: 300 },
      { id: "checkin", icon: "gift", label: "Complete daily check-in", current: m.checkin ? 1 : 0, target: 1 },
    ].map((d) => ({ ...d, done: d.current >= d.target }));
  };

  const claimDailyCheckin: Ctx["claimDailyCheckin"] = () => {
    if (!canClaimCheckin(state)) return null;
    const day = nextCheckinDay(state);
    const reward = (state.config.checkinRewards ?? CHECKIN_REWARDS)[day - 1];
    setState((s) => ({
      ...s,
      points: s.points + reward,
      checkin: { lastClaim: todayKey(), streak: day },
      missions: { ...s.missions, checkin: true, points: s.missions.points + reward },
    }));
    sync("/checkin");
    return { reward, day };
  };

  const requestPayout: Ctx["requestPayout"] = async (amountRupees, upi) => {
    if (!upi || !/^[\w.\-]{2,}@[\w.\-]{2,}$/.test(upi)) return { ok: false, msg: "Enter a valid UPI ID (name@bank)." };
    try {
      const data = await api("/payout", { method: "POST", body: { amountRupees, upi } });
      setState((s) => reconcile(s, data));
      return { ok: true, msg: `Payout of ₹${amountRupees.toFixed(2)} requested.` };
    } catch (e: any) {
      return { ok: false, msg: e?.message || "Could not request payout." };
    }
  };

  const canPlay: Ctx["canPlay"] = (gameId, cooldownMs) => {
    if (!cooldownMs) return { ok: true, remainingMs: 0 };
    const last = state.cooldowns[gameId] ?? 0;
    const remainingMs = last + cooldownMs - Date.now();
    return { ok: remainingMs <= 0, remainingMs: Math.max(0, remainingMs) };
  };

  const markAllRead: Ctx["markAllRead"] = () => {
    setState((s) => ({ ...s, notifs: s.notifs.map((n) => ({ ...n, read: true })) }));
    sync("/notifications/read-all");
  };

  const markNotifRead: Ctx["markNotifRead"] = (id) => {
    setState((s) => ({ ...s, notifs: s.notifs.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
    if (!id.startsWith("tmp-")) sync(`/notifications/${id}/read`);
  };

  const setProfile: Ctx["setProfile"] = (profile) => {
    setState((s) => ({ ...s, profile }));
    sync("/profile", profile);
  };

  const value: Ctx = {
    ready,
    state,
    createAccount,
    login,
    logout,
    refresh,
    earnPoints,
    chancesFor,
    consumeChance,
    addChances,
    chancesPerAd,
    getMissions,
    claimDailyCheckin,
    requestPayout,
    canPlay,
    markAllRead,
    markNotifRead,
    setProfile,
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
