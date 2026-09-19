// UI-only mock data for the global Admin Panel. This is presentation data so
// the admin screens look populated; no backend / persistence is wired up.

export type AdminPayoutStatus = "pending" | "successful" | "failed";

export type AdminPayout = {
  id: string;
  amountRupees: number;
  upi: string;
  status: AdminPayoutStatus;
  ts: number;
  reason?: string;
};

export type AdminTxn = { id: string; title: string; points: number; ts: number };

export type AdminUser = {
  id: string;
  name: string;
  mobile: string;
  password: string;
  createdAt: number;
  points: number;
  payouts: AdminPayout[];
  txns: AdminTxn[];
};

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const now = Date.now();
const ago = (d: number) => now - d;

export const MOCK_USERS: AdminUser[] = [
  {
    id: "u1",
    name: "Altaf Shaikh",
    mobile: "9876543210",
    password: "altaf@123",
    createdAt: ago(42 * DAY),
    points: 12450,
    payouts: [
      { id: "p1a", amountRupees: 50, upi: "altaf@okhdfc", status: "pending", ts: ago(3 * HOUR) },
      { id: "p1b", amountRupees: 25, upi: "altaf@okhdfc", status: "successful", ts: ago(6 * DAY) },
      { id: "p1c", amountRupees: 10, upi: "altaf@okhdfc", status: "failed", ts: ago(12 * DAY), reason: "Invalid UPI ID" },
    ],
    txns: [
      { id: "t1a", title: "Spin & Win reward", points: 320, ts: ago(2 * HOUR) },
      { id: "t1b", title: "Daily check-in · Day 4", points: 50, ts: ago(1 * DAY) },
      { id: "t1c", title: "Payout to altaf@okhdfc", points: -5000, ts: ago(6 * DAY) },
      { id: "t1d", title: "Quiz Time reward", points: 120, ts: ago(7 * DAY) },
    ],
  },
  {
    id: "u2",
    name: "Priya Verma",
    mobile: "9123456780",
    password: "priya2024",
    createdAt: ago(28 * DAY),
    points: 5820,
    payouts: [
      { id: "p2a", amountRupees: 30, upi: "priya@ybl", status: "pending", ts: ago(20 * HOUR) },
      { id: "p2b", amountRupees: 15, upi: "priya@ybl", status: "successful", ts: ago(9 * DAY) },
    ],
    txns: [
      { id: "t2a", title: "2048 reward", points: 90, ts: ago(5 * HOUR) },
      { id: "t2b", title: "Daily check-in · Day 2", points: 20, ts: ago(1 * DAY) },
      { id: "t2c", title: "Math Blitz reward", points: 60, ts: ago(3 * DAY) },
    ],
  },
  {
    id: "u3",
    name: "Rahul Nair",
    mobile: "9988776655",
    password: "rahul#99",
    createdAt: ago(15 * DAY),
    points: 980,
    payouts: [
      { id: "p3a", amountRupees: 5, upi: "rahulnair@paytm", status: "pending", ts: ago(2 * DAY) },
    ],
    txns: [
      { id: "t3a", title: "Whack-a-Mole reward", points: 40, ts: ago(8 * HOUR) },
      { id: "t3b", title: "Mine Pick reward", points: 150, ts: ago(2 * DAY) },
    ],
  },
  {
    id: "u4",
    name: "Sneha Iyer",
    mobile: "9001234567",
    password: "sneha_pw1",
    createdAt: ago(9 * DAY),
    points: 3120,
    payouts: [
      { id: "p4a", amountRupees: 20, upi: "sneha@okaxis", status: "successful", ts: ago(4 * DAY) },
      { id: "p4b", amountRupees: 12, upi: "sneha@okaxis", status: "failed", ts: ago(7 * DAY), reason: "Suspicious activity" },
    ],
    txns: [
      { id: "t4a", title: "Hi-Lo reward", points: 70, ts: ago(1 * DAY) },
      { id: "t4b", title: "Daily check-in · Day 1", points: 10, ts: ago(2 * DAY) },
    ],
  },
  {
    id: "u5",
    name: "Arjun Mehta",
    mobile: "9765432109",
    password: "arjun@mehta",
    createdAt: ago(4 * DAY),
    points: 640,
    payouts: [],
    txns: [
      { id: "t5a", title: "Puzzle Dash reward", points: 80, ts: ago(3 * HOUR) },
      { id: "t5b", title: "Tic Tac Toe reward", points: 50, ts: ago(1 * DAY) },
    ],
  },
  {
    id: "u6",
    name: "Fatima Khan",
    mobile: "9345612780",
    password: "fatima2025",
    createdAt: ago(1 * DAY),
    points: 210,
    payouts: [],
    txns: [{ id: "t6a", title: "Daily check-in · Day 1", points: 10, ts: ago(5 * HOUR) }],
  },
];

// Flatten every payout with its owning user for the Payout approval lists.
export type PayoutWithUser = { user: AdminUser; payout: AdminPayout };

export function allPayoutsWithUser(): PayoutWithUser[] {
  const out: PayoutWithUser[] = [];
  for (const u of MOCK_USERS) for (const p of u.payouts) out.push({ user: u, payout: p });
  return out.sort((a, b) => b.payout.ts - a.payout.ts);
}
