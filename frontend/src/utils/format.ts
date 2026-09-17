// Formatting helpers used across screens.

export function formatPoints(n: number): string {
  return n.toLocaleString("en-IN");
}

// 100 pts = ₹1
export function pointsToRupees(points: number): number {
  return points / 100;
}

export function formatRupees(rupees: number): string {
  return `₹${rupees.toFixed(2)}`;
}

export function formatRelative(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "Just now";

  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = d.toDateString() === today.toDateString();
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const time = d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (sameDay) return `Today, ${time}`;
  if (isYesterday) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function formatDateShort(ts: number): string {
  const d = new Date(ts);
  const date = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date} · ${time}`;
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
