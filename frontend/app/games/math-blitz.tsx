import { useEffect, useRef, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { ScreenHeader } from "@/src/components/screen-header";
import { GameResult } from "@/src/components/game-result";
import { useApp } from "@/src/store/app-store";
import { makeStyles, useTheme } from "@/src/theme";

const DURATION = 20;
const PER = 15;

function makeQ() {
  const a = Math.floor(Math.random() * 12) + 1;
  const b = Math.floor(Math.random() * 12) + 1;
  const op = Math.random() < 0.5 ? "+" : "×";
  const answer = op === "+" ? a + b : a * b;
  const opts = new Set<number>([answer]);
  while (opts.size < 4) opts.add(answer + (Math.floor(Math.random() * 11) - 5) || answer + 1);
  return { text: `${a} ${op} ${b}`, answer, options: [...opts].sort(() => Math.random() - 0.5) };
}

export default function MathBlitz() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const { earnPoints } = useApp();

  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [q, setQ] = useState(makeQ);
  const [correct, setCorrect] = useState(0);
  const [left, setLeft] = useState(DURATION);
  const clock = useRef<any>(null);

  useEffect(() => () => clearInterval(clock.current), []);

  const start = () => {
    setCorrect(0);
    setLeft(DURATION);
    setQ(makeQ());
    setPhase("running");
    clock.current = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) { clearInterval(clock.current); setPhase("done"); return 0; }
        return l - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (phase === "done") earnPoints({ gameId: "math", points: correct * PER, title: "Math Blitz" });
  }, [phase]);

  const answer = (n: number) => {
    if (phase !== "running") return;
    if (n === q.answer) setCorrect((c) => c + 1);
    setQ(makeQ());
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScreenHeader title="Math Blitz" />
      <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.statsRow}>
          <Text style={styles.stat}>Correct: {correct}</Text>
          <Text style={[styles.stat, { color: left <= 5 && phase === "running" ? colors.error : colors.onSurface }]}>{left}s</Text>
        </View>

        {phase === "running" ? (
          <>
            <View style={styles.qCard}><Text style={styles.qText}>{q.text}</Text></View>
            <View style={styles.opts}>
              {q.options.map((o, i) => (
                <Pressable key={i} style={styles.opt} onPress={() => answer(o)} testID={`math-opt-${i}`}>
                  <Text style={styles.optText}>{o}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : phase === "idle" ? (
          <View style={styles.center}>
            <Text style={styles.blurb}>Solve as many as you can in {DURATION}s. Each correct answer is {PER} points.</Text>
            <Pressable style={styles.start} onPress={start} testID="math-start"><Text style={styles.startText}>Start</Text></Pressable>
          </View>
        ) : null}
      </View>

      <GameResult visible={phase === "done"} title="Time's up!" subtitle={`${correct} correct answers`} points={correct * PER} onPlayAgain={start} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  body: { flex: 1, paddingTop: 20, paddingHorizontal: 20 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  stat: { color: colors.onSurface, fontSize: 20, fontWeight: "800" },
  qCard: { backgroundColor: colors.surfaceSecondary, borderRadius: 20, paddingVertical: 40, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  qText: { color: colors.onSurface, fontSize: 48, fontWeight: "900" },
  opts: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 24, justifyContent: "space-between" },
  opt: { width: "47%", backgroundColor: colors.surfaceSecondary, borderRadius: 16, paddingVertical: 24, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  optText: { color: colors.onSurface, fontSize: 26, fontWeight: "800" },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  blurb: { color: colors.onSurfaceTertiary, fontSize: 16, textAlign: "center", lineHeight: 23, marginBottom: 30 },
  start: { backgroundColor: colors.brandPrimary, borderRadius: 40, paddingVertical: 18, paddingHorizontal: 64 },
  startText: { color: colors.onBrand, fontSize: 20, fontWeight: "900" },
}));
