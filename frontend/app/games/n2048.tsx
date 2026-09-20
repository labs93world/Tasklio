import { useState } from "react";
import { View, Text, Pressable, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { ScreenHeader } from "@/src/components/screen-header";
import { Icon } from "@/src/components/icon";
import { GameResult } from "@/src/components/game-result";
import { ChancesBadge, GetChancesModal } from "@/src/components/chances";
import { useGameSession } from "@/src/hooks/use-game-session";
import { makeStyles, useTheme } from "@/src/theme";

const N = 4;
const { width } = Dimensions.get("window");
const BOARD = Math.min(width - 40, 340);
const GAP = 10;
const CELL = (BOARD - GAP * (N + 1)) / N;

type Grid = number[][];

function empty(): Grid {
  return Array.from({ length: N }, () => Array(N).fill(0));
}
function spawn(g: Grid): Grid {
  const cells: [number, number][] = [];
  g.forEach((row, r) => row.forEach((v, c) => { if (v === 0) cells.push([r, c]); }));
  if (!cells.length) return g;
  const [r, c] = cells[Math.floor(Math.random() * cells.length)];
  const ng = g.map((row) => [...row]);
  ng[r][c] = Math.random() < 0.9 ? 2 : 4;
  return ng;
}
function init(): Grid {
  return spawn(spawn(empty()));
}
function compress(row: number[]): { row: number[]; gained: number } {
  const nums = row.filter((v) => v !== 0);
  const out: number[] = [];
  let gained = 0;
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === nums[i + 1]) {
      out.push(nums[i] * 2);
      gained += nums[i] * 2;
      i++;
    } else out.push(nums[i]);
  }
  while (out.length < N) out.push(0);
  return { row: out, gained };
}
function transpose(g: Grid): Grid {
  return g[0].map((_, c) => g.map((row) => row[c]));
}
function reverse(g: Grid): Grid {
  return g.map((row) => [...row].reverse());
}
function same(a: Grid, b: Grid): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
function movable(g: Grid): boolean {
  for (const dir of ["left", "right", "up", "down"] as const) {
    const { grid } = move(g, dir);
    if (!same(grid, g)) return true;
  }
  return false;
}
function move(g: Grid, dir: "left" | "right" | "up" | "down"): { grid: Grid; gained: number } {
  let work = g;
  if (dir === "right") work = reverse(work);
  if (dir === "up") work = transpose(work);
  if (dir === "down") work = reverse(transpose(work));
  let gained = 0;
  work = work.map((row) => {
    const r = compress(row);
    gained += r.gained;
    return r.row;
  });
  if (dir === "right") work = reverse(work);
  if (dir === "up") work = transpose(work);
  if (dir === "down") work = transpose(reverse(work));
  return { grid: work, gained };
}

export default function N2048() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const S = useGameSession("n2048", "2048");

  const [grid, setGrid] = useState<Grid>(init);
  const [score, setScore] = useState(0);
  const [started, setStarted] = useState(false);

  const tileColor = (v: number) => {
    if (v === 0) return colors.surfaceTertiary;
    if (v <= 4) return colors.brandSecondary;
    if (v <= 16) return colors.accentSpinSoft;
    if (v <= 64) return colors.accentSpin;
    return colors.brandPrimary;
  };
  const textColor = (v: number) => (v > 4 && v <= 16 ? colors.onSurface : v > 16 ? colors.onBrand : colors.onSurface);

  const doMove = (dir: "left" | "right" | "up" | "down") => {
    if (S.result) return;
    if (!started) { if (!S.startRound()) return; setStarted(true); }
    const { grid: moved, gained } = move(grid, dir);
    if (same(moved, grid)) return;
    const next = spawn(moved);
    const newScore = score + gained;
    setGrid(next);
    setScore(newScore);
    if (!movable(next)) finish(newScore);
  };

  const finish = (s: number) => {
    setStarted(false);
    S.finishRound(s, "Great game!", "Every point converts to reward points");
  };

  const cashOut = () => {
    if (S.result || score === 0) return;
    finish(score);
  };

  const reset = () => { setGrid(init()); setScore(0); setStarted(false); };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScreenHeader title="2048" right={<ChancesBadge gameId="n2048" onGetChances={() => S.setGetModal(true)} />} />
      <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.score}>Score: {score}</Text>

        <View style={[styles.board, { width: BOARD, height: BOARD }]}>
          {grid.map((row, r) =>
            row.map((v, c) => (
              <View key={`${r}-${c}`} style={[styles.tile, { left: GAP + c * (CELL + GAP), top: GAP + r * (CELL + GAP), backgroundColor: tileColor(v) }]}>
                {v ? <Text style={[styles.tileText, { color: textColor(v), fontSize: v >= 1024 ? 22 : 28 }]}>{v}</Text> : null}
              </View>
            )),
          )}
        </View>

        <View style={styles.pad}>
          <Pressable style={styles.dpad} onPress={() => doMove("up")} testID="n2048-up"><Icon name="chevron-up" size={30} color={colors.onSurface} /></Pressable>
          <View style={styles.dRow}>
            <Pressable style={styles.dpad} onPress={() => doMove("left")} testID="n2048-left"><Icon name="chevron-left" size={30} color={colors.onSurface} /></Pressable>
            <Pressable style={styles.dpad} onPress={() => doMove("right")} testID="n2048-right"><Icon name="chevron-right" size={30} color={colors.onSurface} /></Pressable>
          </View>
          <Pressable style={styles.dpad} onPress={() => doMove("down")} testID="n2048-down"><Icon name="chevron-down" size={30} color={colors.onSurface} /></Pressable>
        </View>

        <Pressable style={[styles.cash, score === 0 && styles.cashDisabled]} onPress={cashOut} disabled={score === 0} testID="n2048-cashout">
          <Text style={[styles.cashText, score === 0 && { color: colors.muted }]}>Cash out {score} pts</Text>
        </Pressable>
      </View>

      <GameResult visible={!!S.result} title={S.result?.title ?? ""} subtitle={S.result?.subtitle ?? ""} points={S.result?.points ?? 0} onClaim={() => { S.claim(); reset(); }} />
      <GetChancesModal visible={S.getModal} gameId="n2048" onClose={() => S.setGetModal(false)} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  body: { flex: 1, alignItems: "center", paddingTop: 14, paddingHorizontal: 20 },
  score: { color: colors.brandPrimary, fontSize: 18, fontWeight: "800", marginBottom: 14 },
  board: { backgroundColor: colors.surfaceSecondary, borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  tile: { position: "absolute", width: CELL, height: CELL, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  tileText: { fontWeight: "900" },
  pad: { alignItems: "center", marginTop: 20, gap: 10 },
  dRow: { flexDirection: "row", gap: 60 },
  dpad: { width: 58, height: 58, borderRadius: 16, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  cash: { marginTop: 20, backgroundColor: colors.brandPrimary, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40 },
  cashDisabled: { backgroundColor: colors.surfaceTertiary },
  cashText: { color: colors.onBrand, fontSize: 16, fontWeight: "800" },
}));
