import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { ScreenHeader } from "@/src/components/screen-header";
import { Icon } from "@/src/components/icon";
import { GameResult } from "@/src/components/game-result";
import { ChancesBadge, GetChancesModal } from "@/src/components/chances";
import { useGameSession } from "@/src/hooks/use-game-session";
import { makeStyles, useTheme } from "@/src/theme";

type Cell = "X" | "O" | null;
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

function winner(b: Cell[]): Cell | "draw" | null {
  for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  return b.every((x) => x) ? "draw" : null;
}

function aiMove(b: Cell[]): number {
  const empty = b.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
  for (const i of empty) { const t = [...b]; t[i] = "O"; if (winner(t) === "O") return i; }
  for (const i of empty) { const t = [...b]; t[i] = "X"; if (winner(t) === "X") return i; }
  if (!b[4]) return 4;
  return empty[Math.floor(Math.random() * empty.length)];
}

export default function TicTacToe() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const S = useGameSession("ttt", "Tic Tac Toe");

  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [started, setStarted] = useState(false);

  const end = (w: Cell | "draw") => {
    const points = w === "X" ? 100 : w === "draw" ? 30 : 0;
    const title = w === "X" ? "You win!" : w === "draw" ? "It's a draw" : "You lost";
    const sub = w === "X" ? "You beat the app" : w === "draw" ? "Nobody won this round" : "The app got there first";
    setStarted(false);
    S.finishRound(points, title, sub);
  };

  const play = (i: number) => {
    if (board[i] || S.result) return;
    if (!started) { if (!S.startRound()) return; setStarted(true); }
    const b = [...board];
    b[i] = "X";
    let w = winner(b);
    if (w) { setBoard(b); return end(w); }
    const ai = aiMove(b);
    b[ai] = "O";
    w = winner(b);
    setBoard(b);
    if (w) end(w);
  };

  const reset = () => { setBoard(Array(9).fill(null)); setStarted(false); };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScreenHeader title="Tic Tac Toe" right={<ChancesBadge gameId="ttt" onGetChances={() => S.setGetModal(true)} />} />
      <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.blurb}>You are X. Beat the app to win 100 points!</Text>
        <View style={styles.board}>
          {board.map((c, i) => (
            <Pressable key={i} style={styles.cell} onPress={() => play(i)} testID={`ttt-cell-${i}`}>
              {c === "X" ? <Icon name="close" size={48} color={colors.brandPrimary} /> : c === "O" ? <Icon name="circle-outline" size={40} color={colors.accentPuzzle} /> : null}
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.reset} onPress={reset} testID="ttt-reset"><Text style={styles.resetText}>Restart</Text></Pressable>
      </View>

      <GameResult visible={!!S.result} title={S.result?.title ?? ""} subtitle={S.result?.subtitle ?? ""} points={S.result?.points ?? 0} onClaim={() => { S.claim(); reset(); }} />
      <GetChancesModal visible={S.getModal} gameId="ttt" onClose={() => S.setGetModal(false)} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  body: { flex: 1, alignItems: "center", paddingTop: 24, paddingHorizontal: 20 },
  blurb: { color: colors.onSurfaceTertiary, fontSize: 15, textAlign: "center", marginBottom: 30 },
  board: { width: 300, height: 300, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  cell: { width: 94, height: 94, borderRadius: 16, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  reset: { marginTop: 36, backgroundColor: colors.surfaceTertiary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 44 },
  resetText: { color: colors.onSurface, fontSize: 16, fontWeight: "800" },
}));
