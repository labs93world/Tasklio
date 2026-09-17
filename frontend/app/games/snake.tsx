import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { ScreenHeader } from "@/src/components/screen-header";
import { Icon } from "@/src/components/icon";
import { GameResult } from "@/src/components/game-result";
import { useApp } from "@/src/store/app-store";
import { makeStyles, useTheme } from "@/src/theme";

const GRID = 13;
const { width } = Dimensions.get("window");
const BOARD = Math.min(width - 40, 340);
const CELL = Math.floor(BOARD / GRID);
const PER_FOOD = 10;

type P = { x: number; y: number };
const eq = (a: P, b: P) => a.x === b.x && a.y === b.y;
const randCell = (): P => ({ x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) });

export default function Snake() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const { earnPoints } = useApp();

  const [snake, setSnake] = useState<P[]>([{ x: 6, y: 6 }]);
  const [food, setFood] = useState<P>({ x: 3, y: 3 });
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);
  const dir = useRef<P>({ x: 1, y: 0 });
  const loop = useRef<any>(null);
  const foodRef = useRef(food);
  foodRef.current = food;

  useEffect(() => () => clearInterval(loop.current), []);

  const start = () => {
    setSnake([{ x: 6, y: 6 }]);
    setFood(randCell());
    setScore(0);
    setOver(false);
    setRunning(true);
    dir.current = { x: 1, y: 0 };
    clearInterval(loop.current);
    loop.current = setInterval(tick, 220);
  };

  const tick = () => {
    setSnake((prev) => {
      const head = prev[0];
      const nh = { x: head.x + dir.current.x, y: head.y + dir.current.y };
      if (nh.x < 0 || nh.y < 0 || nh.x >= GRID || nh.y >= GRID || prev.some((s) => eq(s, nh))) {
        clearInterval(loop.current);
        setRunning(false);
        setOver(true);
        return prev;
      }
      const grew = eq(nh, foodRef.current);
      const next = [nh, ...prev];
      if (grew) {
        setScore((s) => s + 1);
        let f = randCell();
        while (next.some((s) => eq(s, f))) f = randCell();
        setFood(f);
      } else {
        next.pop();
      }
      return next;
    });
  };

  useEffect(() => {
    if (over) earnPoints({ gameId: "snake", points: score * PER_FOOD, title: "Snake" });
  }, [over]);

  const turn = (nx: number, ny: number) => {
    if (dir.current.x === -nx && dir.current.y === -ny) return; // no reverse
    dir.current = { x: nx, y: ny };
  };

  const snakeSet = new Set(snake.map((s) => `${s.x},${s.y}`));

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScreenHeader title="Snake" />
      <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.score}>Length: {snake.length} · {score * PER_FOOD} pts</Text>

        <View style={[styles.board, { width: CELL * GRID, height: CELL * GRID }]}>
          {Array.from({ length: GRID * GRID }).map((_, i) => {
            const x = i % GRID;
            const y = Math.floor(i / GRID);
            const isSnake = snakeSet.has(`${x},${y}`);
            const isHead = snake[0] && snake[0].x === x && snake[0].y === y;
            const isFood = food.x === x && food.y === y;
            return (
              <View
                key={i}
                style={{
                  width: CELL,
                  height: CELL,
                  backgroundColor: isHead ? colors.brandPrimary : isSnake ? colors.accentLucky : isFood ? colors.success : "transparent",
                  borderRadius: isFood ? CELL / 2 : 4,
                }}
              />
            );
          })}
        </View>

        {running ? (
          <View style={styles.pad}>
            <Pressable style={styles.dpad} onPress={() => turn(0, -1)} testID="snake-up"><Icon name="chevron-up" size={30} color={colors.onSurface} /></Pressable>
            <View style={styles.dRow}>
              <Pressable style={styles.dpad} onPress={() => turn(-1, 0)} testID="snake-left"><Icon name="chevron-left" size={30} color={colors.onSurface} /></Pressable>
              <Pressable style={styles.dpad} onPress={() => turn(1, 0)} testID="snake-right"><Icon name="chevron-right" size={30} color={colors.onSurface} /></Pressable>
            </View>
            <Pressable style={styles.dpad} onPress={() => turn(0, 1)} testID="snake-down"><Icon name="chevron-down" size={30} color={colors.onSurface} /></Pressable>
          </View>
        ) : !over ? (
          <Pressable style={styles.start} onPress={start} testID="snake-start"><Text style={styles.startText}>Start</Text></Pressable>
        ) : null}
      </View>

      <GameResult visible={over} title="Game over" subtitle={`You ate ${score} apples`} points={score * PER_FOOD} onPlayAgain={start} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  body: { flex: 1, alignItems: "center", paddingTop: 16, paddingHorizontal: 20 },
  score: { color: colors.brandPrimary, fontSize: 17, fontWeight: "800", marginBottom: 16 },
  board: { flexDirection: "row", flexWrap: "wrap", backgroundColor: colors.surfaceSecondary, borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  pad: { alignItems: "center", marginTop: 22, gap: 10 },
  dRow: { flexDirection: "row", gap: 60 },
  dpad: { width: 60, height: 60, borderRadius: 16, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  start: { marginTop: 30, backgroundColor: colors.brandPrimary, borderRadius: 40, paddingVertical: 18, paddingHorizontal: 64 },
  startText: { color: colors.onBrand, fontSize: 20, fontWeight: "900" },
}));
