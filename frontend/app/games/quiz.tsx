import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeIn } from "react-native-reanimated";

import { ScreenHeader } from "@/src/components/screen-header";
import { Icon } from "@/src/components/icon";
import { useApp } from "@/src/store/app-store";
import { useToast } from "@/src/components/toast";
import { makeStyles, useTheme } from "@/src/theme";

type Q = { q: string; options: string[]; answer: number };

const BANK: Q[] = [
  { q: "What is the capital of India?", options: ["Mumbai", "New Delhi", "Kolkata", "Chennai"], answer: 1 },
  { q: "Which planet is the Red Planet?", options: ["Venus", "Jupiter", "Mars", "Saturn"], answer: 2 },
  { q: "How many continents are there?", options: ["5", "6", "7", "8"], answer: 2 },
  { q: "Which is the largest ocean?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], answer: 3 },
  { q: "H2O is the formula for?", options: ["Oxygen", "Water", "Salt", "Hydrogen"], answer: 1 },
  { q: "Who painted the Mona Lisa?", options: ["Van Gogh", "Picasso", "Da Vinci", "Monet"], answer: 2 },
];

const PER_CORRECT = 20;

function pickQuestions(): Q[] {
  return [...BANK].sort(() => Math.random() - 0.5).slice(0, 5);
}

export default function Quiz() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const { earnPoints } = useApp();
  const { showToast } = useToast();

  const [questions, setQuestions] = useState<Q[]>(pickQuestions);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  const current = questions[idx];

  const choose = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    const isRight = i === current.answer;
    if (isRight) setCorrect((c) => c + 1);
    setTimeout(() => {
      if (idx + 1 < questions.length) {
        setIdx((n) => n + 1);
        setSelected(null);
      } else {
        const finalCorrect = correct + (isRight ? 1 : 0);
        const reward = finalCorrect * PER_CORRECT;
        earnPoints({ gameId: "quiz", points: reward, title: "Quiz Time" });
        showToast(`${finalCorrect}/${questions.length} correct · +${reward} pts`, "success");
        setDone(true);
      }
    }, 700);
  };

  const restart = () => {
    setQuestions(pickQuestions());
    setIdx(0);
    setSelected(null);
    setCorrect(0);
    setDone(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScreenHeader title="Quiz Time" />

      <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        {done ? (
          <Animated.View entering={FadeIn} style={styles.result}>
            <View style={styles.trophy}>
              <Icon name="trophy" size={48} color={colors.brandPrimary} />
            </View>
            <Text style={styles.resultTitle}>Quiz complete!</Text>
            <Text style={styles.resultScore}>
              {correct}/{questions.length} correct
            </Text>
            <Text style={styles.resultPts}>+{correct * PER_CORRECT} points earned</Text>
            <Pressable style={styles.playAgain} onPress={restart} testID="quiz-play-again">
              <Text style={styles.playAgainText}>Play again</Text>
            </Pressable>
          </Animated.View>
        ) : (
          <>
            <View style={styles.progressRow}>
              <Text style={styles.progressText}>
                Question {idx + 1} of {questions.length}
              </Text>
              <Text style={styles.scoreText}>Score: {correct * PER_CORRECT}</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${((idx) / questions.length) * 100}%` }]} />
            </View>

            <Text style={styles.question}>{current.q}</Text>

            <View style={{ gap: 14, marginTop: 8 }}>
              {current.options.map((opt, i) => {
                const isAnswer = i === current.answer;
                const isPicked = selected === i;
                let stateStyle = null;
                if (selected !== null) {
                  if (isAnswer) stateStyle = styles.optCorrect;
                  else if (isPicked) stateStyle = styles.optWrong;
                }
                return (
                  <Pressable
                    key={i}
                    style={[styles.option, stateStyle]}
                    onPress={() => choose(i)}
                    testID={`quiz-option-${i}`}
                  >
                    <Text style={styles.optionText}>{opt}</Text>
                    {selected !== null && isAnswer ? (
                      <Icon name="check-circle" size={22} color={colors.success} />
                    ) : selected !== null && isPicked ? (
                      <Icon name="close-circle" size={22} color={colors.error} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  body: { flex: 1, padding: 20 },
  progressRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  progressText: { color: colors.onSurfaceTertiary, fontSize: 14, fontWeight: "700" },
  scoreText: { color: colors.brandPrimary, fontSize: 14, fontWeight: "800" },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: colors.surfaceTertiary, overflow: "hidden" },
  progressFill: { height: 6, backgroundColor: colors.brandPrimary },
  question: { color: colors.onSurface, fontSize: 22, fontWeight: "800", marginTop: 28, marginBottom: 22, lineHeight: 30 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optCorrect: { backgroundColor: colors.surfaceTertiary, borderColor: colors.success },
  optWrong: { backgroundColor: colors.surfaceTertiary, borderColor: colors.error },
  optionText: { color: colors.onSurfaceSecondary, fontSize: 17, fontWeight: "600", flex: 1 },
  result: { flex: 1, alignItems: "center", justifyContent: "center" },
  trophy: {
    width: 110,
    height: 110,
    borderRadius: 32,
    backgroundColor: colors.brandSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.brandPrimary,
  },
  resultTitle: { color: colors.onSurface, fontSize: 26, fontWeight: "900", marginTop: 24 },
  resultScore: { color: colors.onSurfaceTertiary, fontSize: 18, marginTop: 10 },
  resultPts: { color: colors.brandPrimary, fontSize: 18, fontWeight: "800", marginTop: 6 },
  playAgain: {
    marginTop: 32,
    backgroundColor: colors.brandPrimary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 50,
  },
  playAgainText: { color: colors.onBrand, fontSize: 17, fontWeight: "800" },
}));
