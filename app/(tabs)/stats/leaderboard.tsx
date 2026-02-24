import React, { useRef, useEffect, useMemo, useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  RefreshControl,
  Dimensions,
} from "react-native";
import { Stack } from "expo-router";
import { Trophy, Flame, TrendingUp, Clock, CheckCircle } from "lucide-react-native";
import { useTheme } from "../../../providers/ThemeProvider";
import { useCollection } from "../../../providers/CollectionProvider";
import { LeaderboardEntry } from "../../../types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function getWeekRange(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const start = new Date(now);
  start.setDate(now.getDate() - dayOfWeek);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d: Date) =>
    `${d.toLocaleString("default", { month: "short" })} ${d.getDate()}`;
  return `${fmt(start)} – ${fmt(end)}`;
}

function PodiumBlock({
  entry,
  place,
  maxHours,
  colors,
  isDark,
  isYou,
}: {
  entry: LeaderboardEntry | null;
  place: 1 | 2 | 3;
  maxHours: number;
  colors: ReturnType<typeof useTheme>["colors"];
  isDark: boolean;
  isYou: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    const delay = place === 1 ? 200 : place === 2 ? 400 : 500;
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay,
        speed: 14,
        bounciness: 8,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, slideAnim, place]);

  const heights: Record<number, number> = { 1: 110, 2: 80, 3: 60 };
  const medalColors: Record<number, string> = {
    1: colors.gold,
    2: colors.silver,
    3: colors.bronze,
  };
  const medalBg: Record<number, string> = {
    1: colors.gold + "25",
    2: colors.silver + "25",
    3: colors.bronze + "25",
  };

  const initials = entry
    ? entry.collectorName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  const podiumHeight = heights[place];
  const medal = medalColors[place];

  return (
    <Animated.View
      style={[
        podiumStyles.column,
        {
          opacity: scaleAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <View
        style={[
          podiumStyles.avatar,
          {
            backgroundColor: medalBg[place],
            borderColor: medal,
            borderWidth: isYou ? 2.5 : 1.5,
          },
        ]}
      >
        <Text
          style={[
            podiumStyles.initials,
            { color: medal, fontFamily: "Lexend_700Bold" },
          ]}
        >
          {initials}
        </Text>
      </View>

      <Text
        style={[
          podiumStyles.name,
          { color: colors.textPrimary, fontFamily: "Lexend_600SemiBold" },
        ]}
        numberOfLines={1}
      >
        {entry?.collectorName ?? "—"}
      </Text>

      {entry && (
        <>
          <Text
            style={[
              podiumStyles.hours,
              { color: medal, fontFamily: "Lexend_700Bold" },
            ]}
          >
            {entry.weeklyHours}h
          </Text>
          <Text
            style={[
              podiumStyles.tasks,
              { color: colors.textMuted, fontFamily: "Lexend_400Regular" },
            ]}
          >
            {entry.weeklyCompleted} done
          </Text>
        </>
      )}

      <View
        style={[
          podiumStyles.podium,
          {
            height: podiumHeight,
            backgroundColor: isDark ? medal + "20" : medal + "18",
            borderColor: medal + "40",
          },
        ]}
      >
        <Text
          style={[
            podiumStyles.rank,
            { color: medal, fontFamily: "Lexend_700Bold" },
          ]}
        >
          {place}
        </Text>
      </View>
    </Animated.View>
  );
}

function RankRow({
  entry,
  maxHours,
  isYou,
  index,
  colors,
  isDark,
}: {
  entry: LeaderboardEntry;
  maxHours: number;
  isYou: boolean;
  index: number;
  colors: ReturnType<typeof useTheme>["colors"];
  isDark: boolean;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: 600 + index * 60,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        delay: 600 + index * 60,
        speed: 20,
        bounciness: 4,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  const barPct = maxHours > 0 ? Math.round((entry.weeklyHours / maxHours) * 100) : 0;

  return (
    <Animated.View
      style={[
        rankStyles.row,
        {
          backgroundColor: isYou
            ? isDark
              ? colors.accent + "15"
              : colors.accent + "0C"
            : colors.bgCard,
          borderColor: isYou ? colors.accent + "40" : colors.border,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View
        style={[
          rankStyles.rankBadge,
          {
            backgroundColor: isDark ? colors.bgElevated : colors.bgInput,
          },
        ]}
      >
        <Text
          style={[
            rankStyles.rankNum,
            { color: colors.textSecondary, fontFamily: "Lexend_700Bold" },
          ]}
        >
          {entry.rank}
        </Text>
      </View>

      <View style={rankStyles.info}>
        <View style={rankStyles.nameRow}>
          <Text
            style={[
              rankStyles.name,
              { color: colors.textPrimary, fontFamily: "Lexend_600SemiBold" },
            ]}
            numberOfLines={1}
          >
            {entry.collectorName}
          </Text>
          {isYou && (
            <View
              style={[
                rankStyles.youBadge,
                { backgroundColor: colors.accent + "20" },
              ]}
            >
              <Text
                style={[
                  rankStyles.youText,
                  { color: colors.accent, fontFamily: "Lexend_700Bold" },
                ]}
              >
                YOU
              </Text>
            </View>
          )}
        </View>

        <View style={rankStyles.barTrack}>
          <View
            style={[
              rankStyles.barFill,
              {
                backgroundColor: isYou ? colors.accent : colors.textMuted + "40",
                width: `${barPct}%` as any,
              },
            ]}
          />
        </View>

        <View style={rankStyles.statRow}>
          <View style={rankStyles.statItem}>
            <Clock size={10} color={colors.textMuted} />
            <Text
              style={[
                rankStyles.statText,
                { color: colors.textSecondary, fontFamily: "Lexend_400Regular" },
              ]}
            >
              {entry.weeklyHours}h
            </Text>
          </View>
          <View style={rankStyles.statItem}>
            <CheckCircle size={10} color={colors.complete} />
            <Text
              style={[
                rankStyles.statText,
                { color: colors.textSecondary, fontFamily: "Lexend_400Regular" },
              ]}
            >
              {entry.weeklyCompleted} done
            </Text>
          </View>
          <View style={rankStyles.statItem}>
            <TrendingUp size={10} color={colors.accent} />
            <Text
              style={[
                rankStyles.statText,
                { color: colors.textSecondary, fontFamily: "Lexend_400Regular" },
              ]}
            >
              {entry.weeklyAssigned} assigned
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

export default function LeaderboardScreen() {
  const { colors, isDark } = useTheme();
  const { leaderboard, isLoadingLeaderboard, selectedCollectorName, refreshData } =
    useCollection();
  const [refreshing, setRefreshing] = useState(false);

  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFade, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [headerFade]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refreshData();
    setTimeout(() => setRefreshing(false), 1200);
  }, [refreshData]);

  const maxHours = useMemo(() => {
    if (leaderboard.length === 0) return 1;
    return Math.max(...leaderboard.map((e) => e.weeklyHours), 1);
  }, [leaderboard]);

  const top3 = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);
  const rest = useMemo(() => leaderboard.slice(3), [leaderboard]);

  const normalizedSelected = selectedCollectorName
    .replace(/\s*\(.*?\)\s*$/g, "")
    .trim()
    .toLowerCase();

  const isYou = useCallback(
    (name: string) => name.toLowerCase() === normalizedSelected,
    [normalizedSelected]
  );

  const weekRange = useMemo(() => getWeekRange(), []);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Stack.Screen
        options={{
          title: "Leaderboard",
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontFamily: "Lexend_700Bold" },
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        <Animated.View style={[styles.header, { opacity: headerFade }]}>
          <View
            style={[
              styles.trophyCircle,
              {
                backgroundColor: colors.gold + "20",
                borderColor: colors.gold + "40",
              },
            ]}
          >
            <Trophy size={28} color={colors.gold} />
          </View>
          <Text
            style={[
              styles.title,
              { color: colors.textPrimary, fontFamily: "Lexend_700Bold" },
            ]}
          >
            WEEKLY RANKS
          </Text>
          <View
            style={[
              styles.weekPill,
              {
                backgroundColor: isDark ? colors.bgElevated : colors.bgInput,
                borderColor: colors.border,
              },
            ]}
          >
            <Flame size={11} color={colors.statusPending} />
            <Text
              style={[
                styles.weekText,
                { color: colors.textSecondary, fontFamily: "Lexend_500Medium" },
              ]}
            >
              {weekRange}
            </Text>
          </View>
        </Animated.View>

        {leaderboard.length === 0 && !isLoadingLeaderboard && (
          <View style={styles.emptyWrap}>
            <Trophy size={40} color={colors.border} />
            <Text
              style={[
                styles.emptyTitle,
                { color: colors.textPrimary, fontFamily: "Lexend_600SemiBold" },
              ]}
            >
              No Data Yet
            </Text>
            <Text
              style={[
                styles.emptyText,
                { color: colors.textMuted, fontFamily: "Lexend_400Regular" },
              ]}
            >
              Leaderboard builds as collectors log work this week
            </Text>
          </View>
        )}

        {top3.length > 0 && (
          <View style={styles.podiumRow}>
            <PodiumBlock
              entry={top3[1] ?? null}
              place={2}
              maxHours={maxHours}
              colors={colors}
              isDark={isDark}
              isYou={top3[1] ? isYou(top3[1].collectorName) : false}
            />
            <PodiumBlock
              entry={top3[0]}
              place={1}
              maxHours={maxHours}
              colors={colors}
              isDark={isDark}
              isYou={isYou(top3[0].collectorName)}
            />
            <PodiumBlock
              entry={top3[2] ?? null}
              place={3}
              maxHours={maxHours}
              colors={colors}
              isDark={isDark}
              isYou={top3[2] ? isYou(top3[2].collectorName) : false}
            />
          </View>
        )}

        {rest.length > 0 && (
          <View style={styles.listSection}>
            {rest.map((entry, idx) => (
              <RankRow
                key={`rank_${entry.rank}`}
                entry={entry}
                maxHours={maxHours}
                isYou={isYou(entry.collectorName)}
                index={idx}
                colors={colors}
                isDark={isDark}
              />
            ))}
          </View>
        )}

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const podiumStyles = StyleSheet.create({
  column: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "flex-end" as const,
    gap: 4,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 4,
  },
  initials: {
    fontSize: 15,
    letterSpacing: 0.5,
  },
  name: {
    fontSize: 11,
    textAlign: "center" as const,
    maxWidth: 80,
  },
  hours: {
    fontSize: 16,
  },
  tasks: {
    fontSize: 10,
    marginBottom: 4,
  },
  podium: {
    width: "85%" as unknown as number,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderBottomWidth: 0,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  rank: {
    fontSize: 24,
    opacity: 0.6,
  },
});

const rankStyles = StyleSheet.create({
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    marginBottom: 8,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  rankNum: {
    fontSize: 14,
  },
  info: {
    flex: 1,
    gap: 5,
  },
  nameRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
  },
  name: {
    fontSize: 14,
  },
  youBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  youText: {
    fontSize: 8,
    letterSpacing: 1,
  },
  barTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.12)",
    overflow: "hidden" as const,
  },
  barFill: {
    height: 4,
    borderRadius: 2,
  },
  statRow: {
    flexDirection: "row" as const,
    gap: 12,
  },
  statItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
  },
  statText: {
    fontSize: 10,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  header: {
    alignItems: "center" as const,
    marginBottom: 28,
    gap: 8,
  },
  trophyCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    letterSpacing: 3,
  },
  weekPill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  weekText: {
    fontSize: 12,
  },
  podiumRow: {
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
    justifyContent: "center" as const,
    marginBottom: 24,
    paddingHorizontal: 4,
    minHeight: 220,
  },
  listSection: {
    gap: 0,
  },
  emptyWrap: {
    alignItems: "center" as const,
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    marginTop: 4,
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center" as const,
    maxWidth: 240,
  },
  spacer: { height: 20 },
});
