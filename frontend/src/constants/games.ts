import type { ThemeColors } from "@/src/theme";

export type GameId = "spin" | "puzzle" | "quiz" | "tap" | "lucky";

export type GameMeta = {
  id: GameId;
  title: string;
  short: string;
  icon: string; // MaterialDesignIcons name
  route: string;
  accentKey: keyof ThemeColors;
  softKey: keyof ThemeColors;
  cooldownMs: number;
  blurb: string;
};

export const GAMES: GameMeta[] = [
  {
    id: "spin",
    title: "Spin & Win",
    short: "Spin & Win",
    icon: "dice-5",
    route: "/games/spin",
    accentKey: "accentSpin",
    softKey: "accentSpinSoft",
    cooldownMs: 30 * 1000,
    blurb: "Spin the wheel and win up to 500 points instantly.",
  },
  {
    id: "puzzle",
    title: "Puzzle Dash",
    short: "Puzzle D...",
    icon: "puzzle",
    route: "/games/puzzle",
    accentKey: "accentPuzzle",
    softKey: "accentPuzzleSoft",
    cooldownMs: 0,
    blurb: "Match every pair before the clock runs out.",
  },
  {
    id: "quiz",
    title: "Quiz Time",
    short: "Quiz Time",
    icon: "head-question",
    route: "/games/quiz",
    accentKey: "accentQuiz",
    softKey: "accentQuizSoft",
    cooldownMs: 0,
    blurb: "Answer trivia and earn points for every correct pick.",
  },
  {
    id: "tap",
    title: "Tap Race",
    short: "Tap Race",
    icon: "lightning-bolt",
    route: "/games/tap-race",
    accentKey: "accentTap",
    softKey: "accentTapSoft",
    cooldownMs: 0,
    blurb: "Tap as fast as you can in 10 seconds.",
  },
  {
    id: "lucky",
    title: "Lucky Draw",
    short: "Lucky",
    icon: "cards-playing-outline",
    route: "/games/lucky",
    accentKey: "accentLucky",
    softKey: "accentLuckySoft",
    cooldownMs: 30 * 1000,
    blurb: "Pick a mystery card and reveal your reward.",
  },
];

export const POINTS_PER_RUPEE = 100;
export const MIN_PAYOUT_RUPEES = 1;
