// Internet-required gate. Mounted once in app/_layout.tsx ABOVE the Stack so
// it covers every screen. Tasklio is an offline app by design, but the owner
// wants usage blocked whenever the device has no internet connection.
//
// Blocks only on a definitive "no" (isConnected === false or
// isInternetReachable === false); while the state is unknown (null) the app
// stays usable so we never flash the gate on launch.

import NetInfo, { useNetInfo } from "@react-native-community/netinfo";
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";

import { Icon } from "@/src/components/icon";
import { makeStyles, useTheme } from "@/src/theme";

export function OfflineGate() {
  const net = useNetInfo();
  const styles = useStyles();
  const { colors } = useTheme();
  const [retrying, setRetrying] = useState(false);

  const offline = net.isConnected === false || net.isInternetReachable === false;

  const onRetry = async () => {
    setRetrying(true);
    try {
      await NetInfo.refresh();
    } catch {
      // ignore — the listener keeps the gate in sync either way
    } finally {
      setRetrying(false);
    }
  };

  return (
    <Modal visible={offline} animationType="fade" transparent={false} statusBarTranslucent>
      <View style={styles.container} testID="offline-gate">
        <View style={styles.iconWrap}>
          <Icon name="wifi-off" size={40} color={colors.brandPrimary} />
        </View>
        <Text style={styles.title}>No internet connection</Text>
        <Text style={styles.message}>
          Tasklio needs an internet connection to work. Connect to Wi-Fi or mobile data, then try again.
        </Text>
        <Pressable
          onPress={onRetry}
          disabled={retrying}
          testID="offline-gate-retry-button"
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          {retrying ? (
            <ActivityIndicator color={colors.onBrandPrimary} />
          ) : (
            <Text style={styles.buttonText}>Try again</Text>
          )}
        </Pressable>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 14,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.brandTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  title: {
    color: colors.onSurface,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  message: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  button: {
    marginTop: 10,
    backgroundColor: colors.brandPrimary,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
    minWidth: 160,
    alignItems: "center",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: colors.onBrandPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
}));
