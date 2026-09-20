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
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Icon } from "@/src/components/icon";
import { AutoText } from "@/src/components/auto-text";
import { DrawerMenu } from "@/src/components/drawer-menu";
import { AuthModal } from "@/src/components/auth-modal";
import { GameResult } from "@/src/components/game-result";
import { useApp, CHECKIN_REWARDS, canClaimCheckin, nextCheckinDay } from "@/src/store/app-store";
import { GAMES } from "@/src/constants/games";
import { formatPoints } from "@/src/utils/format";
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
  const { state, claimDailyCheckin, getMissions } = useApp();
  const [drawer, setDrawer] = useState(false);
  const [page, setPage] = useState(0);
  const [showCheckinPopup, setShowCheckinPopup] = useState(false);
  const bannerRef = useRef<ScrollView>(null);
  const pageRef = useRef(0);

  const unread = state.notifs.filter((n) => !n.read).length;
  const showCheckin = canClaimCheckin(state);
  const checkinDay = nextCheckinDay(state);
  const checkinReward = CHECKIN_REWARDS[checkinDay - 1];
  const missions = getMissions();

  const onClaimCheckin = () => setShowCheckinPopup(true);

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

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => setDrawer(true)} hitSlop={10} style={styles.hMenu} testID="home-menu-button">
          <Icon name="menu" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={styles.hCenter}>
          <AutoText style={styles.greeting}>Hii, {state.profile.name || "Guest"}</AutoText>
          <AutoText style={styles.subGreeting}>Let&apos;s earn some rewards today</AutoText>
        </View>
        <View style={styles.hRight}>
          <Pressable onPress={() => router.push("/wallet")} style={styles.pointsBadge} testID="home-points-badge">
            <Icon name="star" size={13} color={colors.brandPrimary} />
            <Text style={styles.pointsText}>{formatPoints(state.points)}</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/notifications")} hitSlop={8} style={styles.bell} testID="home-bell-button">
            <Icon name="bell-outline" size={18} color={colors.onSurface} />
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
                  <AutoText style={styles.bannerTitle} lines={1}>{b.title}</AutoText>
                  <AutoText style={styles.bannerBody} lines={2}>{b.body}</AutoText>
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

        {/* Daily check-in card — hidden once today's reward is claimed */}
        {showCheckin ? (
          <Animated.View entering={FadeInDown} style={styles.checkinWrap} testID="home-checkin-card">
            <LinearGradient
              colors={[colors.brandSecondary, colors.surfaceSecondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.checkin}
            >
              <View style={styles.checkinHead}>
                <View style={styles.checkinBadge}>
                  <Icon name="gift" size={22} color={colors.brandPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.checkinTitle}>Daily Check-in</Text>
                  <Text style={styles.checkinSub}>Day {checkinDay} of 7 · keep your streak alive</Text>
                </View>
                <View style={styles.checkinReward}>
                  <Text style={styles.checkinRewardPts}>+{checkinReward}</Text>
                  <Text style={styles.checkinRewardLbl}>pts</Text>
                </View>
              </View>

              <View style={styles.streakRow}>
                {CHECKIN_REWARDS.map((r, i) => {
                  const day = i + 1;
                  const claimed = day < checkinDay;
                  const isToday = day === checkinDay;
                  return (
                    <View
                      key={day}
                      style={[
                        styles.streakDay,
                        claimed && styles.streakDayDone,
                        isToday && styles.streakDayToday,
                      ]}
                    >
                      {claimed ? (
                        <Icon name="check-bold" size={14} color={colors.onBrand} />
                      ) : (
                        <Text style={[styles.streakDayText, isToday && styles.streakDayTextToday]}>{r}</Text>
                      )}
                    </View>
                  );
                })}
              </View>

              <Pressable style={styles.checkinBtn} onPress={onClaimCheckin} testID="home-checkin-claim">
                <Icon name="gift-open" size={18} color={colors.onBrand} />
                <Text style={styles.checkinBtnText}>Claim {checkinReward} points</Text>
              </Pressable>
            </LinearGradient>
          </Animated.View>
        ) : null}

        {/* Games — double row, horizontally scrollable */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gamesRow} style={{ marginTop: 22 }}>
          {COLUMNS.map((col, ci) => (
            <View key={ci} style={styles.gameCol}>
              {col.map((g, ri) => (
                <Animated.View key={g.id} entering={FadeInDown.delay((ci * 2 + ri) * 40)}>
                  <Pressable style={styles.gameTile} onPress={() => router.push(g.route as any)} testID={`home-game-${g.id}`}>
                    <View style={[styles.gameIcon, { backgroundColor: colors[g.softKey] as string }]}>
                      <Icon name={g.icon} size={28} color={colors[g.accentKey] as string} />
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

        {/* Daily missions */}
        <View style={styles.missionsWrap}>
          <Text style={styles.sectionTitle}>Daily Missions</Text>
          {missions.map((m) => (
            <View key={m.id} style={styles.missionRow} testID={`home-mission-${m.id}`}>
              <View style={[styles.missionIcon, m.done && styles.missionIconDone]}>
                <Icon name={m.done ? "check-bold" : m.icon} size={18} color={m.done ? colors.onSuccess : colors.brandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.missionTop}>
                  <AutoText style={styles.missionLabel}>{m.label}</AutoText>
                  <Text style={styles.missionCount}>
                    {m.current}/{m.target}
                  </Text>
                </View>
                <View style={styles.missionBar}>
                  <View style={[styles.missionFill, { width: `${(m.current / m.target) * 100}%` }, m.done && { backgroundColor: colors.success }]} />
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <DrawerMenu visible={drawer} onClose={() => setDrawer(false)} />
      <AuthModal visible={!state.loggedIn} />

      <GameResult
        visible={showCheckinPopup}
        title="Daily Check-in"
        subtitle={`Day ${checkinDay} of 7 reward`}
        points={checkinReward}
        claimLabel={`Claim ${checkinReward} points`}
        onClaim={() => { claimDailyCheckin(); setShowCheckinPopup(false); }}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 14, backgroundColor: colors.surface },
  hMenu: { width: 32, height: 40, alignItems: "flex-start", justifyContent: "center" },
  hCenter: { flex: 1, marginLeft: 6, marginRight: 16 },
  greeting: { color: colors.onSurface, fontSize: 15, fontWeight: "800" },
  subGreeting: { color: colors.muted, fontSize: 11, marginTop: 1 },
  hRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  pointsBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.surfaceTertiary, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  pointsText: { color: colors.onSurface, fontSize: 13, fontWeight: "800" },
  bell: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  dot: { position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error, borderWidth: 1.5, borderColor: colors.surfaceTertiary },
  banner: { flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: colors.surfaceSecondary, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.border, marginHorizontal: 16 },
  bannerIcon: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  bannerTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "800" },
  bannerBody: { color: colors.onSurfaceTertiary, fontSize: 14, marginTop: 4, lineHeight: 19 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 7, marginTop: 14 },
  pageDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.borderStrong },
  pageDotActive: { width: 22, backgroundColor: colors.brandPrimary },
  checkinWrap: { marginHorizontal: 16, marginTop: 20 },
  checkin: { borderRadius: 20, padding: 18, borderWidth: 1, borderColor: colors.brandPrimary },
  checkinHead: { flexDirection: "row", alignItems: "center", gap: 14 },
  checkinBadge: { width: 46, height: 46, borderRadius: 14, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.brandPrimary },
  checkinTitle: { color: colors.onSurface, fontSize: 18, fontWeight: "900" },
  checkinSub: { color: colors.onSurfaceTertiary, fontSize: 13, marginTop: 3 },
  checkinReward: { alignItems: "center" },
  checkinRewardPts: { color: colors.brandPrimary, fontSize: 24, fontWeight: "900" },
  checkinRewardLbl: { color: colors.muted, fontSize: 11, fontWeight: "700", marginTop: -2 },
  streakRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 18, marginBottom: 4 },
  streakDay: { flex: 1, height: 40, marginHorizontal: 3, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  streakDayDone: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  streakDayToday: { borderColor: colors.brandPrimary, backgroundColor: colors.surfaceTertiary },
  streakDayText: { color: colors.muted, fontSize: 13, fontWeight: "800" },
  streakDayTextToday: { color: colors.brandPrimary },
  checkinBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.brandPrimary, borderRadius: 14, paddingVertical: 14, marginTop: 16 },
  checkinBtnText: { color: colors.onBrand, fontSize: 15, fontWeight: "800" },
  gamesRow: { paddingHorizontal: 16, gap: 12 },
  gameCol: { gap: 14 },
  gameTile: { alignItems: "center", width: 68 },
  gameIcon: { width: 62, height: 62, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  gameLabel: { color: colors.onSurfaceSecondary, fontSize: 11, fontWeight: "700", textAlign: "center" },
  missionsWrap: { marginHorizontal: 16, marginTop: 26, gap: 12 },
  sectionTitle: { color: colors.onSurface, fontSize: 17, fontWeight: "900", marginBottom: 2 },
  missionRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surfaceSecondary, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: colors.border },
  missionIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  missionIconDone: { backgroundColor: colors.success },
  missionTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 },
  missionLabel: { flex: 1, color: colors.onSurfaceSecondary, fontSize: 14, fontWeight: "700" },
  missionCount: { color: colors.muted, fontSize: 13, fontWeight: "800" },
  missionBar: { height: 7, borderRadius: 4, backgroundColor: colors.surfaceTertiary, overflow: "hidden" },
  missionFill: { height: 7, borderRadius: 4, backgroundColor: colors.brandPrimary },
}));
