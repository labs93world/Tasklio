// Thin fetch wrapper for the Tasklio cloud backend. Attaches the stored JWT
// (user or admin) and returns parsed JSON, throwing an Error with the server's
// message on failure.

import { storage } from "@/src/utils/storage";

const BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;

export const TOKEN_KEY = "tasklio_token";
export const ADMIN_TOKEN_KEY = "tasklio_admin_token";

export async function getToken(): Promise<string | null> {
  return storage.secureGet<string>(TOKEN_KEY, "");
}
export async function setToken(t: string): Promise<void> {
  await storage.secureSet(TOKEN_KEY, t);
}
export async function clearToken(): Promise<void> {
  await storage.secureRemove(TOKEN_KEY);
}
export async function getAdminToken(): Promise<string | null> {
  return storage.secureGet<string>(ADMIN_TOKEN_KEY, "");
}
export async function setAdminToken(t: string): Promise<void> {
  await storage.secureSet(ADMIN_TOKEN_KEY, t);
}
export async function clearAdminToken(): Promise<void> {
  await storage.secureRemove(ADMIN_TOKEN_KEY);
}

type Opts = { method?: string; body?: unknown; admin?: boolean; auth?: boolean };

export async function api<T = any>(path: string, opts: Opts = {}): Promise<T> {
  const { method = "GET", body, admin = false, auth = true } = opts;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = admin ? await getAdminToken() : await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error((data && (data.detail || data.message)) || `Request failed (${res.status})`);
  }
  return data as T;
}
