import { useState } from "react";
import { Modal, View, Text, TextInput, Pressable, Linking, ActivityIndicator } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";

import { Icon } from "@/src/components/icon";
import { useApp } from "@/src/store/app-store";
import { useToast } from "@/src/components/toast";
import { HELP_MAILTO } from "@/src/constants/links";
import { makeStyles, useTheme } from "@/src/theme";

type Mode = "login" | "create";

export function AuthModal({ visible }: { visible: boolean }) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const { createAccount, login, state } = useApp();
  const { showToast } = useToast();

  const [mode, setMode] = useState<Mode>(state.account ? "login" : "create");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [confirmMobile, setConfirmMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const switchMode = (m: Mode) => {
    setMode(m);
    setErrors({});
  };

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!/^\d{10}$/.test(mobile)) e.mobile = "Enter a valid 10-digit number.";
    if (!password) e.password = "Enter your password.";
    if (mode === "create") {
      if (!name.trim()) e.name = "Enter your name.";
      if (!confirmMobile) e.confirmMobile = "Confirm your mobile number.";
      else if (mobile !== confirmMobile) e.confirmMobile = "Mobile numbers do not match.";
      if (password && password.length < 4) e.password = "Min 4 characters.";
      if (!confirmPassword) e.confirmPassword = "Confirm your password.";
      else if (password !== confirmPassword) e.confirmPassword = "Passwords do not match.";
    }
    return e;
  };

  const submit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    setLoading(true);
    // brief loading so the action feels deliberate before creating/logging in
    setTimeout(() => {
      const res =
        mode === "create"
          ? createAccount({ name, mobile, confirmMobile, password, confirmPassword })
          : login({ mobile, password });
      setLoading(false);
      showToast(res.msg, res.ok ? "success" : "error");
      if (!res.ok) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }, 1000);
  };

  const forgot = () => {
    Linking.openURL(HELP_MAILTO).catch(() => showToast("Could not open email app.", "error"));
  };

  const num = (t: string, set: (v: string) => void) => set(t.replace(/[^0-9]/g, "").slice(0, 10));

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <KeyboardAwareScrollView
          bottomOffset={24}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 20, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }}
        >
          <View style={styles.card} testID="auth-modal">
            <Image source={require("../../assets/images/tasklio-logo.png")} style={styles.logo} contentFit="contain" />
            <Text style={styles.brand}>TASKLIO</Text>
            <Text style={styles.heading}>{mode === "create" ? "Create your account" : "Welcome back"}</Text>

            <View style={styles.tabs}>
              <Pressable style={[styles.tab, mode === "create" && styles.tabActive]} onPress={() => switchMode("create")} testID="auth-tab-create">
                <Text style={[styles.tabText, mode === "create" && styles.tabTextActive]}>Create Account</Text>
              </Pressable>
              <Pressable style={[styles.tab, mode === "login" && styles.tabActive]} onPress={() => switchMode("login")} testID="auth-tab-login">
                <Text style={[styles.tabText, mode === "login" && styles.tabTextActive]}>Login</Text>
              </Pressable>
            </View>

            {mode === "create" ? (
              <Field styles={styles} colors={colors} error={errors.name} icon="account" placeholder="Name" value={name} onChangeText={setName} testID="auth-name" />
            ) : null}
            <Field styles={styles} colors={colors} error={errors.mobile} icon="cellphone" placeholder="Mobile number" value={mobile} onChangeText={(t: string) => num(t, setMobile)} keyboardType="number-pad" testID="auth-mobile" />
            {mode === "create" ? (
              <Field styles={styles} colors={colors} error={errors.confirmMobile} icon="cellphone-check" placeholder="Confirm mobile number" value={confirmMobile} onChangeText={(t: string) => num(t, setConfirmMobile)} keyboardType="number-pad" testID="auth-confirm-mobile" />
            ) : null}
            <Field styles={styles} colors={colors} error={errors.password} icon="lock" placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry={!show} rightIcon={show ? "eye-off" : "eye"} onRight={() => setShow((v) => !v)} testID="auth-password" />
            {mode === "create" ? (
              <Field styles={styles} colors={colors} error={errors.confirmPassword} icon="lock-check" placeholder="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!show} testID="auth-confirm-password" />
            ) : null}

            <Pressable style={[styles.submit, loading && styles.submitDisabled]} onPress={submit} disabled={loading} testID="auth-submit">
              {loading ? (
                <ActivityIndicator color={colors.onBrand} />
              ) : (
                <>
                  <Text style={styles.submitText}>{mode === "create" ? "Create Account" : "Login"}</Text>
                  <Icon name="arrow-right" size={20} color={colors.onBrand} />
                </>
              )}
            </Pressable>

            <Pressable onPress={forgot} style={styles.forgot} testID="auth-forgot">
              <Text style={styles.forgotText}>Forgot password? Contact Help & Support</Text>
            </Pressable>
          </View>
        </KeyboardAwareScrollView>
      </View>
    </Modal>
  );
}

// Module-level (stable identity) so typing never remounts the input and
// dismisses the keyboard. Shows a per-field red error label below the input.
function Field(props: any) {
  const { styles, colors, icon, rightIcon, onRight, testID, error, ...rest } = props;
  return (
    <View style={styles.fieldWrap}>
      <View style={[styles.field, error && styles.fieldError]}>
        <Icon name={icon} size={20} color={colors.muted} />
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          testID={testID}
          {...rest}
        />
        {rightIcon ? (
          <Pressable onPress={onRight} hitSlop={10}>
            <Icon name={rightIcon} size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.errorText} testID={`${testID}-error`}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  backdrop: { flex: 1, backgroundColor: "rgba(5,5,7,0.96)" },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    alignItems: "center",
  },
  logo: { width: 60, height: 60 },
  brand: { color: colors.brandPrimary, fontSize: 20, fontWeight: "900", letterSpacing: 3, marginTop: 4 },
  heading: { color: colors.onSurface, fontSize: 18, fontWeight: "800", marginTop: 10, marginBottom: 12 },
  tabs: { flexDirection: "row", backgroundColor: colors.surfaceTertiary, borderRadius: 14, padding: 4, width: "100%", marginBottom: 14 },
  tab: { flex: 1, paddingVertical: 11, borderRadius: 11, alignItems: "center" },
  tabActive: { backgroundColor: colors.brandPrimary },
  tabText: { color: colors.onSurfaceTertiary, fontSize: 14, fontWeight: "700" },
  tabTextActive: { color: colors.onBrand },
  fieldWrap: { width: "100%", marginBottom: 10 },
  fieldError: { borderColor: colors.error },
  errorText: { color: colors.error, fontSize: 12, fontWeight: "600", marginTop: 4, marginLeft: 4 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 14,
    paddingHorizontal: 16,
    width: "100%",
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, color: colors.onSurface, fontSize: 15, paddingVertical: 14 },
  submit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.brandPrimary,
    borderRadius: 14,
    paddingVertical: 15,
    width: "100%",
    marginTop: 6,
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: colors.onBrand, fontSize: 17, fontWeight: "800" },
  forgot: { marginTop: 12, paddingVertical: 6 },
  forgotText: { color: colors.brandPrimary, fontSize: 14, fontWeight: "600" },
}));
