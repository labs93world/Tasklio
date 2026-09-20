import { View, Text, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { ScreenHeader } from "@/src/components/screen-header";
import { makeStyles } from "@/src/theme";

const SECTIONS = [
  {
    h: "Data we store",
    p: "Tasklio stores your points, activity, notifications, payout history and profile entirely on your own device. We do not run servers that collect this data.",
  },
  {
    h: "Internet connection",
    p: "Tasklio needs an active internet connection to open and use the app. Your gameplay, wallet and activity data still stay stored on your own device.",
  },
  {
    h: "Ads",
    p: "We show rewarded ads (Google AdMob) when you choose to claim certain rewards or extra chances. Google may process device and ad-interaction data as described in Google's own privacy policy.",
  },
  {
    h: "Backups",
    p: "You can export a backup file and choose where to save it (for example Google Drive or Files). Importing a backup restores your data on this or another device.",
  },
  {
    h: "UPI details",
    p: "Any UPI ID you enter for payouts is stored locally with your payout history and is never shared without your action.",
  },
  {
    h: "Your control",
    p: "You can reset all locally stored data at any time from the admin panel.",
  },
];

export default function Privacy() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScreenHeader title="Privacy Policy" />
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
