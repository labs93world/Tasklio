import { View, Text, ScrollView, Pressable, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { ScreenHeader } from "@/src/components/screen-header";
import { Icon } from "@/src/components/icon";
import { makeStyles, useTheme } from "@/src/theme";

const FAQ = [
  { q: "How do I earn points?", a: "Play any game on the home screen — Spin & Win, Quiz Time, Tap Race and more. Every game adds points to your wallet." },
  { q: "How much are my points worth?", a: "100 points equal ₹1. Your wallet shows the estimated cash value at all times." },
  { q: "How do payouts work?", a: "Open your wallet, pick an amount, enter your UPI ID and request a payout. Track its status right inside the wallet." },
  { q: "Does the app need internet?", a: "Yes. Tasklio needs an internet connection to open, but your points, wallet and activity stay stored on your device." },
];

export default function Support() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScreenHeader title="Help & Support" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 14 }}
      >
        {FAQ.map((f) => (
          <View key={f.q} style={styles.card}>
            <Text style={styles.q}>{f.q}</Text>
            <Text style={styles.a}>{f.a}</Text>
          </View>
        ))}

        <Pressable
          style={styles.contact}
          onPress={() => Linking.openURL("mailto:support@tasklio.app").catch(() => {})}
          testID="support-contact-button"
        >
          <Icon name="email-fast" size={22} color={colors.onBrand} />
          <Text style={styles.contactText}>Contact support</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  q: { color: colors.onSurface, fontSize: 16, fontWeight: "800" },
  a: { color: colors.onSurfaceTertiary, fontSize: 14, lineHeight: 21, marginTop: 8 },
  contact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.brandPrimary,
    borderRadius: 16,
    paddingVertical: 18,
    marginTop: 8,
  },
  contactText: { color: colors.onBrand, fontSize: 16, fontWeight: "800" },
}));
