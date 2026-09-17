import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Icon } from "@/src/components/icon";
import { makeStyles, useTheme } from "@/src/theme";

type Props = {
  title: string;
  onBack?: () => void;
  showBack?: boolean;
  right?: React.ReactNode;
};

export function ScreenHeader({ title, onBack, showBack = true, right }: Props) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();

  const handleBack = () => {
    if (onBack) onBack();
    else if (router.canGoBack()) router.back();
    else router.replace("/home");
  };

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      <View style={styles.side}>
        {showBack ? (
          <Pressable onPress={handleBack} style={styles.iconBtn} hitSlop={10} testID="header-back-button">
            <Icon name="chevron-left" size={28} color={colors.onSurface} />
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={1} testID="header-title">
        {title}
      </Text>
      <View style={[styles.side, styles.rightSide]}>{right}</View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  side: { width: 64, justifyContent: "center" },
  rightSide: { alignItems: "flex-end" },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  title: {
    flex: 1,
    textAlign: "center",
    color: colors.onSurface,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
}));
