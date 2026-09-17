import { View, Text, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { ScreenHeader } from "@/src/components/screen-header";
import { makeStyles } from "@/src/theme";

const SECTIONS = [
  {
    h: "1. Acceptance of terms",
    p: "By using Tasklio you agree to these terms. Tasklio is a rewards and games app where you earn points by playing and can request payouts.",
  },
  {
    h: "2. Earning points",
    p: "Points are awarded for in-app activity such as playing games. Points hold no monetary value until redeemed and may be adjusted to prevent abuse.",
  },
  {
    h: "3. Payouts",
    p: "Payout requests are processed to the UPI ID you provide. You are responsible for entering the correct details. Requests may be reviewed before completion.",
  },
  {
    h: "4. Fair use",
    p: "Automated play, multiple accounts, or any attempt to manipulate rewards is prohibited and may result in loss of points.",
  },
  {
    h: "5. Data",
    p: "Your data is stored locally on your device. You can export or reset it anytime from the admin panel.",
  },
];

export default function Terms() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScreenHeader title="Terms of use" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }}
      >
        <Text style={styles.intro}>Last updated: June 2026</Text>
        {SECTIONS.map((s) => (
          <View key={s.h} style={{ marginTop: 22 }}>
            <Text style={styles.h}>{s.h}</Text>
            <Text style={styles.p}>{s.p}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  intro: { color: colors.muted, fontSize: 14 },
  h: { color: colors.onSurface, fontSize: 17, fontWeight: "800" },
  p: { color: colors.onSurfaceTertiary, fontSize: 15, lineHeight: 23, marginTop: 8 },
}));
