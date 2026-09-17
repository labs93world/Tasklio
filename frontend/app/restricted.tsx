import { useState } from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";

import { ScreenHeader } from "@/src/components/screen-header";
import { Icon } from "@/src/components/icon";
import { useApp } from "@/src/store/app-store";
import { useToast } from "@/src/components/toast";
import { makeStyles, useTheme } from "@/src/theme";

export default function Restricted() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { state } = useApp();
  const { showToast } = useToast();
  const [pin, setPin] = useState("");

  const verify = () => {
    if (pin === state.adminPin) {
      setPin("");
      router.replace("/admin");
    } else {
      showToast("Incorrect PIN. Try again.", "error");
      setPin("");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScreenHeader title="Restricted Area" />

      <View style={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.shield}>
          <Icon name="shield-lock" size={44} color={colors.brandPrimary} />
        </View>
        <Text style={styles.title}>Admin access only</Text>
        <Text style={styles.subtitle}>Enter your admin PIN to open the control panel.</Text>

        <TextInput
          style={styles.pinInput}
          value={pin}
          onChangeText={(t) => setPin(t.replace(/[^0-9]/g, "").slice(0, 6))}
          placeholder="••••"
          placeholderTextColor={colors.muted}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
          textAlign="center"
          testID="restricted-pin-input"
        />

        <Pressable style={styles.btn} onPress={verify} testID="restricted-unlock-button">
          <Icon name="lock-open-variant" size={20} color={colors.onBrand} />
          <Text style={styles.btnText}>Unlock</Text>
        </Pressable>

        <Text style={styles.hint}>Default PIN is 1234 · change it inside the panel.</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  body: { flex: 1, alignItems: "center", paddingHorizontal: 28, paddingTop: 48 },
  shield: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: colors.brandSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.brandPrimary,
  },
  title: { color: colors.onSurface, fontSize: 24, fontWeight: "800", marginTop: 24 },
  subtitle: { color: colors.onSurfaceTertiary, fontSize: 15, textAlign: "center", marginTop: 10, lineHeight: 21 },
  pinInput: {
    width: "70%",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.onSurface,
    fontSize: 32,
    letterSpacing: 12,
    paddingVertical: 18,
    marginTop: 32,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.brandPrimary,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 40,
    marginTop: 24,
    width: "70%",
  },
  btnText: { color: colors.onBrand, fontSize: 17, fontWeight: "800" },
  hint: { color: colors.muted, fontSize: 13, marginTop: 20 },
}));
