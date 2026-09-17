import { View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { makeStyles } from "@/src/theme";

export default function Home() {
  const styles = useStyles();

  return (
    <View style={styles.container} testID="home-screen">
      <StatusBar style="light" />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
}));
