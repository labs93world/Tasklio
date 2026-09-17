import React, { createContext, useCallback, useContext, useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";

import { Icon } from "@/src/components/icon";
import { makeStyles, useTheme } from "@/src/theme";

type Variant = "success" | "error" | "info";
type ToastState = { id: number; msg: string; variant: Variant } | null;

type Ctx = { showToast: (msg: string, variant?: Variant) => void };
const ToastCtx = createContext<Ctx | null>(null);

export function useToast(): Ctx {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();

  const showToast = useCallback((msg: string, variant: Variant = "info") => {
    const id = Date.now();
    setToast({ id, msg, variant });
    setTimeout(() => setToast((cur) => (cur?.id === id ? null : cur)), 2600);
  }, []);

  const iconFor = { success: "check-circle", error: "alert-circle", info: "information" } as const;
  const colorFor = { success: colors.success, error: colors.error, info: colors.brandPrimary };

  return (
    <ToastCtx.Provider value={{ showToast }}>
      {children}
      {toast ? (
        <Animated.View
          entering={FadeInUp.springify().damping(18)}
          exiting={FadeOutUp}
          style={[styles.wrap, { top: insets.top + 10, pointerEvents: "none" }]}
          testID="app-toast"
        >
          <View style={styles.toast}>
            <Icon name={iconFor[toast.variant]} size={20} color={colorFor[toast.variant]} />
            <Text style={styles.text} numberOfLines={2}>
              {toast.msg}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastCtx.Provider>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: { position: "absolute", left: 16, right: 16, alignItems: "center", zIndex: 9999 },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceTertiary,
    borderColor: colors.borderStrong,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    maxWidth: 420,
    boxShadow: "0px 8px 16px rgba(0,0,0,0.4)",
    elevation: 8,
  },
  text: { flex: 1, color: colors.onSurface, fontSize: 14, fontWeight: "600" },
}));
