import { useRef, useState } from "react";
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
import { useApp } from "@/src/store/app-store";
import { GAMES } from "@/src/constants/games";
import { formatPoints, formatRupees, pointsToRupees, formatRelative } from "@/src/utils/format";
import { makeStyles, useTheme, ThemeColors } from "@/src/theme";

const { width } = Dimensions.get("window");
const BANNER_W = width - 32;

const BANNERS: { title: string; body: string; icon: string; tint: keyof ThemeColors; route: string }[] = [
  {
    title: "Fresh updates are waiting",
    body: "Catch up on new rewards, community news, and account activity.",
    icon: "bell-ring",
    tint: "accentPuzzle",
    route: "/notifications",
  },
  {
    title: "Play. Earn. Cash out.",
    body: "Turn your points into real UPI payouts, straight to your bank.",
    icon: "wallet",
    tint: "brandPrimary",
    route: "/wallet",
  },
  {
    title: "Daily Spin bonus",
    body: "Spin the wheel every day and grab free bonus points.",
    icon: "dice-5",
    tint: "accentLucky",
    route: "/games/spin",
  },
];

export default function Home() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { state } = useApp();
  const [drawer, setDrawer] = useState(false);
  const [page, setPage] = useState(0);
  const bannerRef = useRef<ScrollView>(null);

  const unread = state.notifs.filter((n) => !n.read).length;
  const recent = state.txns.slice(0, 5);

  const onBannerScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / BANNER_W);
    if (idx !== page) setPage(idx);
  };

  return (
    <View style={styles.container} testID="home-screen">
      <StatusBar style="light" />

      {/* Sticky header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={() => setDrawer(true)} hitSlop={10} style={styles.hMenu} testID="home-menu-button">
          <Icon name="menu" size={28} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.greeting} numberOfLines={1}>
          Hii, {state.profile.name}
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* Banner carousel */}
        <ScrollView
          ref={bannerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onBannerScroll}
          scrollEventThrottle={16}
          snapToInterval={BANNER_W}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: 16, gap: 0 }}
          style={{ marginTop: 16 }}
        >
          {BANNERS.map((b) => (
            <Pressable
              key={b.title}
              style={[styles.banner, { width: BANNER_W }]}
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
          ))}
        </ScrollView>

        <View style={styles.dots}>
          {BANNERS.map((_, i) => (
            <View key={i} style={[styles.pageDot, i === page && styles.pageDotActive]} />
          ))}
        </View>

        {/* Games */}
        <Text style={styles.sectionTitle}>Play & Earn</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.gamesRow}
        >
          {GAMES.map((g, i) => (
            <Animated.View key={g.id} entering={FadeInDown.delay(i * 60)}>
              <Pressable style={styles.gameTile} onPress={() => router.push(g.route as any)} testID={`home-game-${g.id}`}>
                <View style={[styles.gameIcon, { backgroundColor: colors[g.softKey] as string }]}>
                  <Icon name={g.icon} size={32} color={colors[g.accentKey] as string} />
                </View>
                <Text style={styles.gameLabel} numberOfLines={1}>
                  {g.title}
                </Text>
              </Pressable>
            </Animated.View>
          ))}
        </ScrollView>

        {/* Wallet card */}
        <Pressable style={styles.walletCard} onPress={() => router.push("/wallet")} testID="home-wallet-card">
          <View style={{ flex: 1 }}>
            <Text style={styles.walletLabel}>YOUR WALLET</Text>
            <Text style={styles.walletPts}>{formatPoints(state.points)} pts</Text>
            <Text style={styles.walletValue}>
              {formatRupees(pointsToRupees(state.points))} · 100 pts = ₹1
            </Text>
          </View>
          <View style={styles.walletCta}>
            <Icon name="wallet" size={26} color={colors.onBrand} />
          </View>
        </Pressable>

        {/* Recent activity */}
        <Text style={styles.sectionTitle}>Recent activity</Text>
        {recent.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="history" size={30} color={colors.muted} />
            <Text style={styles.emptyText}>No activity yet. Play a game to earn your first points!</Text>
          </View>
        ) : (
          <View style={styles.activityList}>
            {recent.map((t) => (
              <View key={t.id} style={styles.activityRow}>
                <View style={styles.activityIcon}>
                  <Icon
                    name={t.kind === "payout" ? "bank-transfer-out" : "star-four-points"}
                    size={20}
                    color={t.points >= 0 ? colors.success : colors.brandPrimary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityTitle} numberOfLines={1}>
                    {t.title}
                  </Text>
                  <Text style={styles.activityTime}>{formatRelative(t.ts)}</Text>
                </View>
                <Text style={[styles.activityAmt, { color: t.points >= 0 ? colors.success : colors.error }]}>
                  {t.points >= 0 ? "+" : ""}
                  {formatPoints(t.points)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <DrawerMenu visible={drawer} onClose={() => setDrawer(false)} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: colors.surface,
  },
  hMenu: { width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  greeting: { flex: 1, marginLeft: 6, color: colors.onSurface, fontSize: 26, fontWeight: "800" },
  hRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  pointsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pointsText: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  bell: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  dot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.error,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerIcon: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  bannerTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  bannerBody: { color: colors.onSurfaceTertiary, fontSize: 14, marginTop: 4, lineHeight: 19 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 7, marginTop: 14 },
  pageDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.borderStrong },
  pageDotActive: { width: 22, backgroundColor: colors.brandPrimary },
  sectionTitle: {
    color: colors.onSurface,
    fontSize: 19,
    fontWeight: "800",
    marginTop: 26,
    marginBottom: 14,
    paddingHorizontal: 16,
  },
  gamesRow: { paddingHorizontal: 16, gap: 16 },
  gameTile: { alignItems: "center", width: 88 },
  gameIcon: {
    width: 78,
    height: 78,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  gameLabel: { color: colors.onSurfaceSecondary, fontSize: 13, fontWeight: "700", textAlign: "center" },
  walletCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 26,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  walletLabel: { color: colors.muted, fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  walletPts: { color: colors.onSurface, fontSize: 30, fontWeight: "900", marginTop: 6 },
  walletValue: { color: colors.onSurfaceTertiary, fontSize: 13, marginTop: 4 },
  walletCta: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { alignItems: "center", gap: 12, paddingHorizontal: 40, paddingVertical: 24 },
  emptyText: { color: colors.muted, fontSize: 14, textAlign: "center", lineHeight: 20 },
  activityList: { paddingHorizontal: 16, gap: 10 },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activityIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  activityTitle: { color: colors.onSurfaceSecondary, fontSize: 15, fontWeight: "700" },
  activityTime: { color: colors.muted, fontSize: 12, marginTop: 2 },
  activityAmt: { fontSize: 16, fontWeight: "800" },
}));
