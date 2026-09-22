// Admin-controlled gates: full-screen block when the admin turns on global
// maintenance or a force update. Reads the remote config from the store.

import { Modal, Text, View } from "react-native";

import { Icon } from "@/src/components/icon";
import { useApp } from "@/src/store/app-store";
import { makeStyles, useTheme } from "@/src/theme";

const APP_VERSION = "1.0.0";

// "1.2.0" > "1.1.5" style comparison
function versionLt(a: string, b: string): boolean {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x !== y) return x < y;
  }
  return false;
}

export function ConfigGate() {
  const { state } = useApp();
  const styles = useStyles();
  const { colors } = useTheme();

  const cfg = state.config;
  const forceUpdate = cfg.forceUpdate?.enabled && versionLt(APP_VERSION, cfg.forceUpdate.minVersion);
  const maintenance = cfg.maintenance?.global;
  const blocked = forceUpdate || maintenance;

  const title = forceUpdate ? "Update required" : "Under maintenance";
  const message = forceUpdate
    ? cfg.forceUpdate.message || "A new version is available. Please update to continue."
    : "Tasklio is under maintenance right now. Please check back in a little while.";
  const icon = forceUpdate ? "cellphone-arrow-down" : "wrench";

  return (
    <Modal visible={!!blocked} animationType="fade" transparent={false} statusBarTranslucent>
      <View style={styles.container} testID="config-gate">
        <View style={styles.iconWrap}>
          <Icon name={icon} size={40} color={colors.brandPrimary} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", padding: 32, gap: 14 },
  iconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.brandTertiary, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  title: { color: colors.onSurface, fontSize: 20, fontWeight: "700", textAlign: "center" },
  message: { color: colors.muted, fontSize: 14, lineHeight: 21, textAlign: "center" },
}));
