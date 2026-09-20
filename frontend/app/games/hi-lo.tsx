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

const rand = () => Math.floor(Math.random() * 13) + 1; // 1..13
const PER = 20;

export default function HiLo() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const S = useGameSession("hilo", "Hi-Lo");

  const [current, setCurrent] = useState(rand);
  const [streak, setStreak] = useState(0);
  const [started, setStarted] = useState(false);

  const guess = (higher: boolean) => {
    if (S.result) return;
    if (!started) { if (!S.startRound()) return; setStarted(true); }
    const next = rand();
    const correct = next === current ? true : higher ? next > current : next < current;
    if (correct) {
      setCurrent(next);
      setStreak((s) => s + 1);
    } else {
      setStarted(false);
      S.finishRound(streak * PER, streak > 0 ? "Nice run!" : "Try again", `Streak of ${streak}`);
    }
  };

  const reset = () => { setCurrent(rand()); setStreak(0); setStarted(false); };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScreenHeader title="Hi-Lo" right={<ChancesBadge gameId="hilo" onGetChances={() => S.setGetModal(true)} />} />
      <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.blurb}>Will the next card be higher or lower? Each correct guess is {PER} points.</Text>
        <Text style={styles.streak}>Streak: {streak} · {streak * PER} pts</Text>

        <View style={styles.card}>
          <Text style={styles.cardNum}>{current}</Text>
        </View>

        <View style={styles.btnRow}>
          <Pressable style={[styles.btn, { backgroundColor: colors.success }]} onPress={() => guess(true)} testID="hilo-higher">
            <Icon name="arrow-up-bold" size={26} color={colors.onSuccess} />
            <Text style={[styles.btnText, { color: colors.onSuccess }]}>Higher</Text>
          </Pressable>
          <Pressable style={[styles.btn, { backgroundColor: colors.error }]} onPress={() => guess(false)} testID="hilo-lower">
            <Icon name="arrow-down-bold" size={26} color={colors.onError} />
            <Text style={[styles.btnText, { color: colors.onError }]}>Lower</Text>
          </Pressable>
        </View>
      </View>

      <GameResult visible={!!S.result} title={S.result?.title ?? ""} subtitle={S.result?.subtitle ?? ""} points={S.result?.points ?? 0} onClaim={() => { S.claim(); reset(); }} />
      <GetChancesModal visible={S.getModal} gameId="hilo" onClose={() => S.setGetModal(false)} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  body: { flex: 1, alignItems: "center", paddingTop: 24, paddingHorizontal: 20 },
  blurb: { color: colors.onSurfaceTertiary, fontSize: 15, textAlign: "center", lineHeight: 22 },
  streak: { color: colors.brandPrimary, fontSize: 16, fontWeight: "800", marginTop: 20 },
  card: { width: 180, height: 240, borderRadius: 24, backgroundColor: colors.surfaceSecondary, borderWidth: 2, borderColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", marginTop: 24 },
  cardNum: { color: colors.onSurface, fontSize: 96, fontWeight: "900" },
  btnRow: { flexDirection: "row", gap: 16, marginTop: 40, width: "100%" },
  btn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 16, paddingVertical: 18 },
  btnText: { fontSize: 18, fontWeight: "800" },
}));
