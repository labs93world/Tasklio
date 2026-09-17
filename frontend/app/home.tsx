import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Icon } from "@/src/components/icon";
import { DrawerMenu } from "@/src/components/drawer-menu";
import { AuthModal } from "@/src/components/auth-modal";
import { useApp } from "@/src/store/app-store";
import { GAMES } from "@/src/constants/games";
import { formatPoints, formatRelative } from "@/src/utils/format";
import { makeStyles, useTheme, ThemeColors } from "@/src/theme";

const { width } = Dimensions.get("window");

const BANNERS: { title: string; body: string; icon: string; tint: keyof ThemeColors; route: string }[] = [
  { title: "Fresh updates are waiting", body: "Catch up on new rewards, community news, and account activity.", icon: "bell-ring", tint: "accentPuzzle", route: "/notifications" },
  { title: "Play. Earn. Cash out.", body: "Turn your points into real UPI payouts, straight to your bank.", icon: "wallet", tint: "brandPrimary", route: "/wallet" },
  { title: "Daily Spin bonus", body: "Spin the wheel every day and grab free bonus points.", icon: "dice-5", tint: "accentLucky", route: "/games/spin" },
];

// group games into columns of 2 for the double-row grid
const COLUMNS: (typeof GAMES)[] = [];
for (let i = 0; i < GAMES.length; i += 2) COLUMNS.push(GAMES.slice(i, i + 2));

export default function Home() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { state } = useApp();
  const [drawer, setDrawer] = useState(false);
  const [page, setPage] = useState(0);
  const bannerRef = useRef<ScrollView>(null);
  const pageRef = useRef(0);

  const unread = state.notifs.filter((n) => !n.read).length;
  const recent = state.txns.slice(0, 4);

  // Auto-advance banner
  useEffect(() => {
    const t = setInterval(() => {
      const nextIdx = (pageRef.current + 1) % BANNERS.length;
      bannerRef.current?.scrollTo({ x: nextIdx * width, animated: true });
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const onBannerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    if (idx !== pageRef.current) {
      pageRef.current = idx;
      setPage(idx);
    }
  };

  return (
    <View style={styles.container} testID="home-screen">
      <StatusBar style="light" />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => setDrawer(true)} hitSlop={10} style={styles.hMenu} testID="home-menu-button">
          <Icon name="menu" size={28} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.greeting} numberOfLines={1}>
          Hii, {state.profile.name || "Guest"}
        </Text>
        <View style={styles.hRight}>
          <Pressable onPress={() => router.push("/wallet")} style={styles.pointsBadge} testID="home-points-badge">
            <Text style={styles.pointsText}>{formatPoints(state.points)}</Text>
            <Icon name="star" size={16} color={colors.brandPrimary} />
          </Pressable>
          <Pressable onPress={() => router.push("/notifications")} hitSlop={10} style={styles.bell} testID="home-bell-button">
            <Icon name="bell-outline" size={26} color={colors.onSurface} />
            {unread > 0 ? <View style={styles.dot} /> : null}
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {/* Banner carousel — one full-width banner centered at a time */}
        <ScrollView
          ref={bannerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onBannerScroll}
          scrollEventThrottle={16}
          style={{ marginTop: 16 }}
        >
          {BANNERS.map((b) => (
            <View key={b.title} style={{ width }}>
              <Pressable
                style={styles.banner}
                onPress={() => router.push(b.route as any)}
                testID={`home-banner-${b.title.split(" ")[0].toLowerCase()}`}
              >
                <View style={[styles.bannerIcon, { backgroundColor: colors.surfaceTertiary }]}>
                  <Icon name={b.icon} size={26} color={colors[b.tint] as string} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bannerTitle}>{b.title}</Text>
                  <Text style={styles.bannerBody}>{b.body}</Text>
                </View>
              </Pressable>
            </View>
          ))}
        </ScrollView>

        <View style={styles.dots}>
          {BANNERS.map((_, i) => (
            <View key={i} style={[styles.pageDot, i === page && styles.pageDotActive]} />
          ))}
        </View>

        {/* Games — double row, horizontally scrollable */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gamesRow} style={{ marginTop: 22 }}>
          {COLUMNS.map((col, ci) => (
            <View key={ci} style={styles.gameCol}>
              {col.map((g, ri) => (
                <Animated.View key={g.id} entering={FadeInDown.delay((ci * 2 + ri) * 40)}>
                  <Pressable style={styles.gameTile} onPress={() => router.push(g.route as any)} testID={`home-game-${g.id}`}>
                    <View style={[styles.gameIcon, { backgroundColor: colors[g.softKey] as string }]}>
                      <Icon name={g.icon} size={30} color={colors[g.accentKey] as string} />
                    </View>
                    <Text style={styles.gameLabel} numberOfLines={1}>
                      {g.title}
                    </Text>
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          ))}
        </ScrollView>

        {/* Recent activity */}
        <Text style={styles.sectionTitle}>Recent activity</Text>
        {recent.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="history" size={30} color={colors.muted} />
            <Text style={styles.emptyText}>No activity yet. Play a game to earn your first points!</Text>
          </View>
        ) : (
          <>
            <View style={styles.activityList}>
              {recent.map((t) => (
                <View key={t.id} style={styles.activityRow}>
                  <View style={styles.activityIcon}>
                    <Icon name={t.kind === "payout" ? "bank-transfer-out" : "star-four-points"} size={20} color={t.points >= 0 ? colors.success : colors.brandPrimary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.activityTitle} numberOfLines={1}>{t.title}</Text>
                    <Text style={styles.activityTime}>{formatRelative(t.ts)}</Text>
                  </View>
                  <Text style={[styles.activityAmt, { color: t.points >= 0 ? colors.success : colors.error }]}>
                    {t.points >= 0 ? "+" : ""}{formatPoints(t.points)}
                  </Text>
                </View>
              ))}
            </View>
            <Pressable style={styles.viewAll} onPress={() => router.push("/recent-activity")} testID="home-view-all">
              <Text style={styles.viewAllText}>View all</Text>
              <Icon name="chevron-right" size={20} color={colors.brandPrimary} />
            </Pressable>
          </>
        )}
      </ScrollView>

      <DrawerMenu visible={drawer} onClose={() => setDrawer(false)} />
      <AuthModal visible={!state.loggedIn} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, backgroundColor: colors.surface },
  hMenu: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  greeting: { flex: 1, marginLeft: 6, color: colors.onSurface, fontSize: 26, fontWeight: "800" },
  hRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  pointsBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.surfaceTertiary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
  pointsText: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  bell: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  dot: { position: "absolute", top: 8, right: 8, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.error, borderWidth: 2, borderColor: colors.surface },
  banner: { flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: colors.surfaceSecondary, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.border, marginHorizontal: 16 },
  bannerIcon: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  bannerTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  bannerBody: { color: colors.onSurfaceTertiary, fontSize: 14, marginTop: 4, lineHeight: 19 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 7, marginTop: 14 },
  pageDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.borderStrong },
  pageDotActive: { width: 22, backgroundColor: colors.brandPrimary },
  gamesRow: { paddingHorizontal: 16, gap: 16 },
  gameCol: { gap: 18 },
  gameTile: { alignItems: "center", width: 82 },
  gameIcon: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  gameLabel: { color: colors.onSurfaceSecondary, fontSize: 12, fontWeight: "700", textAlign: "center" },
  sectionTitle: { color: colors.onSurface, fontSize: 19, fontWeight: "800", marginTop: 28, marginBottom: 14, paddingHorizontal: 16 },
  empty: { alignItems: "center", gap: 12, paddingHorizontal: 40, paddingVertical: 24 },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: "center", lineHeight: 20 },
  activityList: { paddingHorizontal: 16, gap: 10 },
  activityRow: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.surfaceSecondary, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border },
  activityIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  activityTitle: { color: colors.onSurfaceSecondary, fontSize: 15, fontWeight: "700" },
  activityTime: { color: colors.muted, fontSize: 12, marginTop: 2 },
  activityAmt: { fontSize: 16, fontWeight: "800" },
  viewAll: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 16, paddingVertical: 12 },
  viewAllText: { color: colors.brandPrimary, fontSize: 16, fontWeight: "800" },
}));
