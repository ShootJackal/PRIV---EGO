import React, { useRef, useEffect, useMemo, useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Animated,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Stack } from "expo-router";
import { Trophy, Flame, TrendingUp, Clock, CheckCircle, Swords } from "lucide-react-native";
import { useTheme } from "../../../providers/ThemeProvider";
import { useCollection } from "../../../providers/CollectionProvider";
import { LeaderboardEntry } from "../../../types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type TabId = "ALL" | "SF" | "MX" | "VS";

function getWeekRange(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const start = new Date(now);
  start.setDate(now.getDate() - daysFromMonday);
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
    scaleAnim.setValue(0);
    slideAnim.setValue(40);
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
  }, [scaleAnim, slideAnim, place, entry]);

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
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: 100 + index * 55,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        delay: 100 + index * 55,
        speed: 20,
        bounciness: 4,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index, entry]);

  const barPct = maxHours > 0 ? Math.round((entry.weeklyHours / maxHours) * 100) : 0;

  const locColor =
    entry.location === "SF"
      ? "#3B82F6"
      : entry.location === "MX"
      ? "#EF4444"
      : colors.textMuted + "60";

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
          {entry.location !== "OTHER" && (
            <View style={[rankStyles.locBadge, { backgroundColor: locColor + "22", borderColor: locColor + "44" }]}>
              <Text style={[rankStyles.locText, { color: locColor, fontFamily: "Lexend_700Bold" }]}>
                {entry.location}
              </Text>
            </View>
          )}
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
                backgroundColor: isYou
                  ? colors.accent
                  : entry.location === "SF"
                  ? "#3B82F6"
                  : entry.location === "MX"
                  ? "#EF4444"
                  : entry.location === "BOTH"
                  ? "#A855F7"
                  : colors.textMuted + "40",
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

interface TeamStats {
  totalHours: number;
  avgHours: number;
  completed: number;
  assigned: number;
  members: number;
  completionRate: number;
  topCollector: string;
  topHours: number;
}

function computeTeamStats(entries: LeaderboardEntry[]): TeamStats {
  if (entries.length === 0) {
    return { totalHours: 0, avgHours: 0, completed: 0, assigned: 0, members: 0, completionRate: 0, topCollector: "—", topHours: 0 };
  }
  const totalHours = entries.reduce((s, e) => s + e.weeklyHours, 0);
  const completed = entries.reduce((s, e) => s + e.weeklyCompleted, 0);
  const assigned = entries.reduce((s, e) => s + e.weeklyAssigned, 0);
  const top = entries[0];
  return {
    totalHours: Math.round(totalHours * 10) / 10,
    avgHours: Math.round((totalHours / entries.length) * 10) / 10,
    completed,
    assigned,
    members: entries.length,
    completionRate: assigned > 0 ? Math.round((completed / assigned) * 100) : 0,
    topCollector: top.collectorName,
    topHours: top.weeklyHours,
  };
}

function VSScreen({
  sfEntries,
  mxEntries,
  colors,
  isDark,
}: {
  sfEntries: LeaderboardEntry[];
  mxEntries: LeaderboardEntry[];
  colors: ReturnType<typeof useTheme>["colors"];
  isDark: boolean;
}) {
  const sfStats = useMemo(() => computeTeamStats(sfEntries), [sfEntries]);
  const mxStats = useMemo(() => computeTeamStats(mxEntries), [mxEntries]);

  const slideIn = useRef(new Animated.Value(30)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    slideIn.setValue(30);
    fadeIn.setValue(0);
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideIn, { toValue: 0, speed: 16, bounciness: 6, useNativeDriver: true }),
    ]).start();
  }, [fadeIn, slideIn]);

  const maxHrs = Math.max(sfStats.totalHours, mxStats.totalHours, 1);
  const sfPct = sfStats.totalHours / maxHrs;
  const mxPct = mxStats.totalHours / maxHrs;

  const sfWins = [
    sfStats.totalHours > mxStats.totalHours,
    sfStats.avgHours > mxStats.avgHours,
    sfStats.completionRate > mxStats.completionRate,
    sfStats.completed > mxStats.completed,
  ].filter(Boolean).length;
  const mxWins = 4 - sfWins;

  const vsMetrics: { label: string; sf: string; mx: string; sfWin: boolean }[] = [
    {
      label: "Total Hours",
      sf: `${sfStats.totalHours}h`,
      mx: `${mxStats.totalHours}h`,
      sfWin: sfStats.totalHours >= mxStats.totalHours,
    },
    {
      label: "Avg Hours / Collector",
      sf: `${sfStats.avgHours}h`,
      mx: `${mxStats.avgHours}h`,
      sfWin: sfStats.avgHours >= mxStats.avgHours,
    },
    {
      label: "Completion Rate",
      sf: `${sfStats.completionRate}%`,
      mx: `${mxStats.completionRate}%`,
      sfWin: sfStats.completionRate >= mxStats.completionRate,
    },
    {
      label: "Tasks Completed",
      sf: `${sfStats.completed}`,
      mx: `${mxStats.completed}`,
      sfWin: sfStats.completed >= mxStats.completed,
    },
  ];

  return (
    <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideIn }] }}>
      <View style={vsStyles.battleCard}>
        <View style={[vsStyles.teamSide, { borderColor: "#3B82F630" }]}>
          <View style={[vsStyles.teamCircle, { backgroundColor: "#3B82F615", borderColor: "#3B82F6" }]}>
            <Text style={[vsStyles.teamEmoji]}>🌉</Text>
          </View>
          <Text style={[vsStyles.teamLabel, { color: "#3B82F6", fontFamily: "Lexend_700Bold" }]}>SF</Text>
          <Text style={[vsStyles.teamCount, { color: colors.textMuted, fontFamily: "Lexend_400Regular" }]}>
            {sfStats.members} collectors
          </Text>
          <Text style={[vsStyles.teamHours, { color: "#3B82F6", fontFamily: "Lexend_700Bold" }]}>
            {sfStats.totalHours}h
          </Text>
        </View>

        <View style={vsStyles.vsCenter}>
          <View style={[vsStyles.vsCircle, { backgroundColor: isDark ? colors.bgElevated : colors.bgInput, borderColor: colors.border }]}>
            <Swords size={18} color={colors.textMuted} />
          </View>
          <Text style={[vsStyles.vsText, { color: colors.textMuted, fontFamily: "Lexend_700Bold" }]}>VS</Text>
          <View style={[vsStyles.scorePill, { backgroundColor: isDark ? colors.bgElevated : colors.bgInput }]}>
            <Text style={[vsStyles.scoreNum, { color: "#3B82F6", fontFamily: "Lexend_700Bold" }]}>{sfWins}</Text>
            <Text style={[vsStyles.scoreDash, { color: colors.textMuted, fontFamily: "Lexend_400Regular" }]}>–</Text>
            <Text style={[vsStyles.scoreNum, { color: "#EF4444", fontFamily: "Lexend_700Bold" }]}>{mxWins}</Text>
          </View>
        </View>

        <View style={[vsStyles.teamSide, { borderColor: "#EF444430" }]}>
          <View style={[vsStyles.teamCircle, { backgroundColor: "#EF444415", borderColor: "#EF4444" }]}>
            <Text style={vsStyles.teamEmoji}>📍</Text>
          </View>
          <Text style={[vsStyles.teamLabel, { color: "#EF4444", fontFamily: "Lexend_700Bold" }]}>MX</Text>
          <Text style={[vsStyles.teamCount, { color: colors.textMuted, fontFamily: "Lexend_400Regular" }]}>
            {mxStats.members} collectors
          </Text>
          <Text style={[vsStyles.teamHours, { color: "#EF4444", fontFamily: "Lexend_700Bold" }]}>
            {mxStats.totalHours}h
          </Text>
        </View>
      </View>

      <View style={[vsStyles.barsCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <Text style={[vsStyles.barsTitle, { color: colors.textMuted, fontFamily: "Lexend_500Medium" }]}>
          TOTAL HOURS THIS WEEK
        </Text>
        <View style={vsStyles.barRow}>
          <Text style={[vsStyles.barLabel, { color: "#3B82F6", fontFamily: "Lexend_600SemiBold" }]}>SF</Text>
          <View style={[vsStyles.barTrack, { backgroundColor: isDark ? "#1a1a2e" : "#e8eaf0" }]}>
            <View style={[vsStyles.barFill, { backgroundColor: "#3B82F6", width: `${sfPct * 100}%` as any }]} />
          </View>
          <Text style={[vsStyles.barValue, { color: "#3B82F6", fontFamily: "Lexend_700Bold" }]}>{sfStats.totalHours}h</Text>
        </View>
        <View style={vsStyles.barRow}>
          <Text style={[vsStyles.barLabel, { color: "#EF4444", fontFamily: "Lexend_600SemiBold" }]}>MX</Text>
          <View style={[vsStyles.barTrack, { backgroundColor: isDark ? "#1a1a2e" : "#e8eaf0" }]}>
            <View style={[vsStyles.barFill, { backgroundColor: "#EF4444", width: `${mxPct * 100}%` as any }]} />
          </View>
          <Text style={[vsStyles.barValue, { color: "#EF4444", fontFamily: "Lexend_700Bold" }]}>{mxStats.totalHours}h</Text>
        </View>
      </View>

      <View style={[vsStyles.metricsCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        {vsMetrics.map((m, i) => (
          <View
            key={`vm_${i}`}
            style={[
              vsStyles.metricRow,
              i < vsMetrics.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
            ]}
          >
            <View style={vsStyles.metricSfCell}>
              <Text style={[vsStyles.metricVal, { color: m.sfWin ? "#3B82F6" : colors.textSecondary, fontFamily: m.sfWin ? "Lexend_700Bold" : "Lexend_400Regular" }]}>
                {m.sf}
              </Text>
              {m.sfWin && <View style={[vsStyles.winDot, { backgroundColor: "#3B82F6" }]} />}
            </View>
            <Text style={[vsStyles.metricLabel, { color: colors.textMuted, fontFamily: "Lexend_500Medium" }]}>
              {m.label}
            </Text>
            <View style={vsStyles.metricMxCell}>
              {!m.sfWin && <View style={[vsStyles.winDot, { backgroundColor: "#EF4444" }]} />}
              <Text style={[vsStyles.metricVal, { color: !m.sfWin ? "#EF4444" : colors.textSecondary, fontFamily: !m.sfWin ? "Lexend_700Bold" : "Lexend_400Regular" }]}>
                {m.mx}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={[vsStyles.mvpCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <Text style={[vsStyles.mvpTitle, { color: colors.textMuted, fontFamily: "Lexend_500Medium" }]}>TOP PERFORMERS</Text>
        <View style={vsStyles.mvpRow}>
          <View style={vsStyles.mvpItem}>
            <View style={[vsStyles.mvpAvatar, { backgroundColor: "#3B82F615", borderColor: "#3B82F640" }]}>
              <Text style={[vsStyles.mvpInitials, { color: "#3B82F6", fontFamily: "Lexend_700Bold" }]}>
                {sfStats.topCollector.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
              </Text>
            </View>
            <Text style={[vsStyles.mvpName, { color: colors.textPrimary, fontFamily: "Lexend_600SemiBold" }]} numberOfLines={1}>
              {sfStats.topCollector}
            </Text>
            <Text style={[vsStyles.mvpHours, { color: "#3B82F6", fontFamily: "Lexend_700Bold" }]}>{sfStats.topHours}h</Text>
          </View>
          <View style={[vsStyles.mvpDivider, { backgroundColor: colors.border }]} />
          <View style={vsStyles.mvpItem}>
            <View style={[vsStyles.mvpAvatar, { backgroundColor: "#EF444415", borderColor: "#EF444440" }]}>
              <Text style={[vsStyles.mvpInitials, { color: "#EF4444", fontFamily: "Lexend_700Bold" }]}>
                {mxStats.topCollector.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
              </Text>
            </View>
            <Text style={[vsStyles.mvpName, { color: colors.textPrimary, fontFamily: "Lexend_600SemiBold" }]} numberOfLines={1}>
              {mxStats.topCollector}
            </Text>
            <Text style={[vsStyles.mvpHours, { color: "#EF4444", fontFamily: "Lexend_700Bold" }]}>{mxStats.topHours}h</Text>
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
  const [activeTab, setActiveTab] = useState<TabId>("ALL");
  const tabAnim = useRef(new Animated.Value(0)).current;
  const headerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerFade, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [headerFade]);

  const handleTabChange = useCallback(
    (tab: TabId) => {
      Animated.timing(tabAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
        setActiveTab(tab);
        Animated.timing(tabAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      });
    },
    [tabAnim]
  );

  useEffect(() => {
    tabAnim.setValue(1);
  }, [tabAnim]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refreshData();
    setTimeout(() => setRefreshing(false), 1200);
  }, [refreshData]);

  const normalizedSelected = selectedCollectorName
    .replace(/\s*\(.*?\)\s*$/g, "")
    .trim()
    .toLowerCase();

  const isYou = useCallback(
    (name: string) => name.toLowerCase() === normalizedSelected,
    [normalizedSelected]
  );

  const sfEntries = useMemo(
    () => leaderboard.filter((e) => e.location === "SF" || e.location === "BOTH"),
    [leaderboard]
  );
  const mxEntries = useMemo(
    () => leaderboard.filter((e) => e.location === "MX" || e.location === "BOTH"),
    [leaderboard]
  );

  const filteredLeaderboard = useMemo(() => {
    if (activeTab === "ALL") return leaderboard;
    if (activeTab === "SF") return sfEntries.map((e, i) => ({ ...e, rank: i + 1 }));
    if (activeTab === "MX") return mxEntries.map((e, i) => ({ ...e, rank: i + 1 }));
    return leaderboard;
  }, [activeTab, leaderboard, sfEntries, mxEntries]);

  const maxHours = useMemo(() => {
    if (filteredLeaderboard.length === 0) return 1;
    return Math.max(...filteredLeaderboard.map((e) => e.weeklyHours), 1);
  }, [filteredLeaderboard]);

  const top3 = useMemo(() => filteredLeaderboard.slice(0, 3), [filteredLeaderboard]);
  const rest = useMemo(() => filteredLeaderboard.slice(3), [filteredLeaderboard]);

  const weekRange = useMemo(() => getWeekRange(), []);

  const TABS: { id: TabId; label: string; color?: string }[] = [
    { id: "ALL", label: "ALL" },
    { id: "SF", label: "SF 🌉", color: "#3B82F6" },
    { id: "MX", label: "MX 📍", color: "#EF4444" },
    { id: "VS", label: "⚔️ VS" },
  ];

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

        <View style={[styles.tabBar, { backgroundColor: isDark ? colors.bgElevated : colors.bgInput, borderColor: colors.border }]}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const tabColor = tab.color ?? colors.accent;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tab,
                  isActive && [
                    styles.tabActive,
                    {
                      backgroundColor: tab.id === "VS"
                        ? (isDark ? colors.bgCard : "#fff")
                        : tabColor + "18",
                      borderColor: tab.id === "VS" ? colors.border : tabColor + "50",
                    },
                  ],
                ]}
                onPress={() => handleTabChange(tab.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: isActive
                        ? tab.id === "VS"
                          ? colors.textPrimary
                          : tabColor
                        : colors.textMuted,
                      fontFamily: isActive ? "Lexend_700Bold" : "Lexend_500Medium",
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Animated.View style={{ opacity: tabAnim }}>
          {activeTab === "VS" ? (
            <VSScreen
              sfEntries={sfEntries}
              mxEntries={mxEntries}
              colors={colors}
              isDark={isDark}
            />
          ) : (
            <>
              {filteredLeaderboard.length === 0 && !isLoadingLeaderboard && (
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
                    {activeTab === "SF"
                      ? "No SF collectors found this week"
                      : activeTab === "MX"
                      ? "No MX collectors found this week"
                      : "Leaderboard builds as collectors log work this week"}
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
                      key={`rank_${activeTab}_${entry.rank}`}
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
            </>
          )}
        </Animated.View>

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
    flexWrap: "wrap" as const,
  },
  name: {
    fontSize: 14,
  },
  locBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
    borderWidth: 1,
  },
  locText: {
    fontSize: 8,
    letterSpacing: 0.5,
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

const vsStyles = StyleSheet.create({
  battleCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: 16,
    gap: 8,
  },
  teamSide: {
    flex: 1,
    alignItems: "center" as const,
    gap: 6,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  teamCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  teamEmoji: {
    fontSize: 24,
  },
  teamLabel: {
    fontSize: 22,
    letterSpacing: 2,
  },
  teamCount: {
    fontSize: 11,
  },
  teamHours: {
    fontSize: 18,
  },
  vsCenter: {
    alignItems: "center" as const,
    gap: 6,
  },
  vsCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  vsText: {
    fontSize: 10,
    letterSpacing: 2,
  },
  scorePill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  scoreNum: {
    fontSize: 16,
  },
  scoreDash: {
    fontSize: 14,
  },
  barsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  barsTitle: {
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  barRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  barLabel: {
    fontSize: 12,
    width: 24,
  },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    overflow: "hidden" as const,
  },
  barFill: {
    height: 10,
    borderRadius: 5,
  },
  barValue: {
    fontSize: 13,
    width: 40,
    textAlign: "right" as const,
  },
  metricsCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden" as const,
    marginBottom: 12,
  },
  metricRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  metricSfCell: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
  },
  metricMxCell: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "flex-end" as const,
    gap: 5,
  },
  metricLabel: {
    fontSize: 11,
    textAlign: "center" as const,
    flex: 1.2,
  },
  metricVal: {
    fontSize: 15,
  },
  winDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  mvpCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  mvpTitle: {
    fontSize: 11,
    letterSpacing: 1.5,
  },
  mvpRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  mvpItem: {
    flex: 1,
    alignItems: "center" as const,
    gap: 6,
  },
  mvpDivider: {
    width: 1,
    height: 60,
    marginHorizontal: 8,
  },
  mvpAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  mvpInitials: {
    fontSize: 15,
  },
  mvpName: {
    fontSize: 12,
    textAlign: "center" as const,
    maxWidth: 110,
  },
  mvpHours: {
    fontSize: 14,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  header: {
    alignItems: "center" as const,
    marginBottom: 20,
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
  tabBar: {
    flexDirection: "row" as const,
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center" as const,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  tabActive: {
    borderWidth: 1,
  },
  tabText: {
    fontSize: 12,
    letterSpacing: 0.5,
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
