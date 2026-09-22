import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { LogBox, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Linking from "expo-linking";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { OfflineGate } from "@/src/components/offline-gate";
import { ConfigGate } from "@/src/components/config-gate";
import { ToastProvider } from "@/src/components/toast";
import { AppProvider } from "@/src/store/app-store";
import { queryClient } from "@/src/query-client";
import { initAds } from "@/src/ads";

// Disable logbox errors etc so that users can see the app
// and agent works as expected.
LogBox.ignoreAllLogs(true);

// Foreground push behavior (module scope, native only).
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// Android notification channel (module scope).
if (Platform.OS === "android") {
  Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.MAX,
    sound: "default",
  });
}

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    initAds();
  }, []);

  // Notification tap handling (native only).
  useEffect(() => {
    if (Platform.OS === "web") return;

    const routeFrom = (data: any) => {
      const url = data?.deeplink || data?.action_url;
      if (!url) return;
      if (String(url).startsWith("http")) Linking.openURL(url);
      else router.push(url);
    };

    const tapSub = Notifications.addNotificationResponseReceivedListener((response) => {
      routeFrom(response.notification.request.content.data || {});
    });

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) routeFrom(response.notification.request.content.data || {});
    });

    return () => {
      tapSub.remove();
    };
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <KeyboardProvider>
              <AppProvider>
                <ToastProvider>
                  <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0B0B0E" } }} />
                  <OfflineGate />
                  <ConfigGate />
                </ToastProvider>
              </AppProvider>
            </KeyboardProvider>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
