import type { ThemeColors } from "@/src/theme";

export type GameId =
  | "spin"
  | "puzzle"
  | "quiz"
  | "tap"
  | "lucky"
  | "ttt"
  | "hilo"
  | "whack"
  | "math"
  | "snake"
  | "n2048"
  | "balloon"
  | "higher"
  | "mine";

export type GameMeta = {
  id: GameId;
  title: string;
  icon: string;
  route: string;
  accentKey: keyof ThemeColors;
  softKey: keyof ThemeColors;
  cooldownMs: number;
  blurb: string;
};

export const GAMES: GameMeta[] = [
  { id: "spin", title: "Spin & Win", icon: "dice-5", route: "/games/spin", accentKey: "accentSpin", softKey: "accentSpinSoft", cooldownMs: 30000, blurb: "Spin the wheel and win up to 500 points instantly." },
  { id: "puzzle", title: "Puzzle Dash", icon: "puzzle", route: "/games/puzzle", accentKey: "accentPuzzle", softKey: "accentPuzzleSoft", cooldownMs: 0, blurb: "Match every pair before you run out of moves." },
  { id: "quiz", title: "Quiz Time", icon: "head-question", route: "/games/quiz", accentKey: "accentQuiz", softKey: "accentQuizSoft", cooldownMs: 0, blurb: "Answer trivia and earn points per correct pick." },
  { id: "tap", title: "Tap Race", icon: "lightning-bolt", route: "/games/tap-race", accentKey: "accentTap", softKey: "accentTapSoft", cooldownMs: 0, blurb: "Tap as fast as you can in 10 seconds." },
  { id: "lucky", title: "Lucky Draw", icon: "cards-playing-outline", route: "/games/lucky", accentKey: "accentLucky", softKey: "accentLuckySoft", cooldownMs: 30000, blurb: "Pick a mystery card and reveal your reward." },
  { id: "ttt", title: "Tic Tac Toe", icon: "grid", route: "/games/tic-tac-toe", accentKey: "accentQuiz", softKey: "accentQuizSoft", cooldownMs: 0, blurb: "Beat the app to win points." },
  { id: "hilo", title: "Hi-Lo", icon: "swap-vertical", route: "/games/hi-lo", accentKey: "accentSpin", softKey: "accentSpinSoft", cooldownMs: 0, blurb: "Guess if the next card is higher or lower." },
  { id: "whack", title: "Whack-a-Mole", icon: "hammer", route: "/games/whack", accentKey: "accentTap", softKey: "accentTapSoft", cooldownMs: 0, blurb: "Whack the moles before time runs out." },
  { id: "math", title: "Math Blitz", icon: "calculator", route: "/games/math-blitz", accentKey: "accentPuzzle", softKey: "accentPuzzleSoft", cooldownMs: 0, blurb: "Solve as many sums as you can quickly." },
  { id: "snake", title: "Snake", icon: "gamepad-variant", route: "/games/snake", accentKey: "accentLucky", softKey: "accentLuckySoft", cooldownMs: 0, blurb: "Eat, grow and avoid crashing." },
  { id: "n2048", title: "2048", icon: "numeric", route: "/games/n2048", accentKey: "accentSpin", softKey: "accentSpinSoft", cooldownMs: 0, blurb: "Merge tiles to reach a high score." },
  { id: "balloon", title: "Balloon Pop", icon: "balloon", route: "/games/balloon", accentKey: "accentLucky", softKey: "accentLuckySoft", cooldownMs: 0, blurb: "Pop as many balloons as you can." },
  { id: "higher", title: "Higher Card", icon: "cards", route: "/games/higher-card", accentKey: "accentQuiz", softKey: "accentQuizSoft", cooldownMs: 0, blurb: "Draw a higher card than the app." },
  { id: "mine", title: "Mine Pick", icon: "bomb", route: "/games/mine", accentKey: "accentTap", softKey: "accentTapSoft", cooldownMs: 0, blurb: "Pick safe tiles and dodge the bomb." },
];

export const POINTS_PER_RUPEE = 100;
export const MIN_PAYOUT_RUPEES = 1;
