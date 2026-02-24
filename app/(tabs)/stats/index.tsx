import React, { useRef, useEffect, useMemo, useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Animated,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Clock, CheckCircle, Target, Inbox, Calendar, Zap, Trophy, Medal, Crown } from "lucide-react-native";
import { useCollection } from "../../../providers/CollectionProvider";
import { useTheme } from "../../../providers/ThemeProvider";
import { fetchCollectorStats, fetchLeaderboard } from "../../../services/googleSheets";
import { CollectorStats, LeaderboardEntry } from "../../../types";

function normalizeCollectorName(name: string): string {
  return name.replace(/\s*\(.*?\)\s*$/g, "").trim();
}

function AnimatedBar({ value, maxValue, color, delay }: { value: number; maxValue: number; color: string; delay: number }) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const pct = maxValue > 0 ? Math.min(value / maxValue, 1) : 0;
    Animated.timing(widthAnim, { toValue: pct * 100, duration: 800, delay, useNativeDriver: false }).start();
  }, [value, maxValue, delay, widthAnim]);

  return (
    <View style={barStyles.track}>
      <Animated.View style={[barStyles.fill, { backgroundColor: color, width: widthAnim.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] }) }]} />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: { height: 5, borderRadius: 3, backgroundColor: "rgba(128,128,128,0.08)", overflow: "hidden" as const },
  fill: { height: 5, borderRadius: 3 },
});

function HeroStat({ label, value, icon, color, index }: { label: string; value: string; icon: React.ReactNode; color: string; index: number }) {
  const { colors } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, delay: index * 60, speed: 22, bounciness: 4, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  return (
    <Animated.View style={[styles.heroCard, { backgroundColor: colors.bgCard, borderColor: colors.border, shadowColor: colors.shadow, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={[styles.heroIconWrap, { backgroundColor: color + "12" }]}>{icon}</View>
      <Text style={[styles.heroValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.heroLabel, { color: colors.textMuted }]}>{label}</Text>
    </Animated.View>
  );
}

function LeaderboardCard({ entry, index, isCurrentUser, colors }: { entry: LeaderboardEntry; index: number; isCurrentUser: boolean; colors: any }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, delay: index * 50, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, delay: index * 50, speed: 24, bounciness: 3, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  const rankColor = entry.rank === 1 ? colors.gold : entry.rank === 2 ? colors.silver : entry.rank === 3 ? colors.bronze : colors.textMuted;
  const rankBg = entry.rank === 1 ? colors.goldBg : entry.rank === 2 ? colors.silverBg : entry.rank === 3 ? colors.bronzeBg : colors.bgInput;
  const regionColor = entry.region === "MX" ? colors.mxOrange : entry.region === "SF" ? colors.sfBlue : colors.accent;

  return (
    <Animated.View style={[lbStyles.row, {
      backgroundColor: isCurrentUser ? colors.accentSoft : "transparent",
      borderColor: isCurrentUser ? colors.accentDim : "transparent",
      borderWidth: isCurrentUser ? 1 : 0,
      borderRadius: 12,
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim }],
    }]}>
      <View style={[lbStyles.rankBadge, { backgroundColor: rankBg }]}>
        {entry.rank <= 3 ? (
          <Crown size={12} color={rankColor} />
        ) : (
          <Text style={[lbStyles.rankText, { color: rankColor }]}>{entry.rank}</Text>
        )}
      </View>
      <View style={lbStyles.info}>
        <View style={lbStyles.nameRow}>
          <Text style={[lbStyles.name, { color: colors.textPrimary }]} numberOfLines={1}>
            {entry.collectorName}
          </Text>
          <View style={[lbStyles.regionTag, { backgroundColor: regionColor + '14' }]}>
            <Text style={[lbStyles.regionText, { color: regionColor }]}>{entry.region}</Text>
          </View>
        </View>
        <View style={lbStyles.statsRow}>
          <Text style={[lbStyles.statVal, { color: colors.accent }]}>{entry.hoursLogged.toFixed(1)}h</Text>
          <Text style={[lbStyles.statSep, { color: colors.border }]}>|</Text>
          <Text style={[lbStyles.statVal, { color: colors.complete }]}>{entry.tasksCompleted} done</Text>
          <Text style={[lbStyles.statSep, { color: colors.border }]}>|</Text>
          <Text style={[lbStyles.statVal, { color: colors.textMuted }]}>{entry.completionRate.toFixed(0)}%</Text>
        </View>
      </View>
      <AnimatedBar value={entry.hoursLogged} maxValue={40} color={rankColor} delay={index * 50 + 200} />
    </Animated.View>
  );
}

const lbStyles = StyleSheet.create({
  row: { paddingHorizontal: 12, paddingVertical: 10, marginBottom: 4 },
  rankBadge: { width: 28, height: 28, borderRadius: 8, alignItems: "center" as const, justifyContent: "center" as const, position: "absolute" as const, left: 12, top: 10 },
  rankText: { fontSize: 12, fontWeight: "700" as const },
  info: { marginLeft: 40, flex: 1 },
  nameRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, marginBottom: 3 },
  name: { fontSize: 14, fontWeight: "600" as const, flex: 1 },
  regionTag: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  regionText: { fontSize: 9, fontWeight: "700" as const, letterSpacing: 0.5 },
  statsRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, marginBottom: 6 },
  statVal: { fontSize: 11, fontWeight: "500" as const },
  statSep: { fontSize: 10 },
});

export default function StatsScreen() {
  const { colors } = useTheme();
  const { selectedCollector, selectedCollectorName, selectedRig, todayLog, configured } = useCollection();
  const [refreshing, setRefreshing] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(true);

  const normalizedName = useMemo(() => normalizeCollectorName(selectedCollectorName), [selectedCollectorName]);

  const statsQuery = useQuery<CollectorStats>({
    queryKey: ["collectorStats", selectedCollectorName],
    queryFn: () => fetchCollectorStats(selectedCollectorName),
    enabled: configured && !!selectedCollectorName,
    staleTime: 60000,
    retry: 1,
  });

  const leaderboardQuery = useQuery<LeaderboardEntry[]>({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
    enabled: configured,
    staleTime: 120000,
    retry: 1,
  });

  const localStats = useMemo(() => {
    const completed = todayLog.filter((e) => e.status === "Completed").length;
    const canceled = todayLog.filter((e) => e.status === "Canceled").length;
    const totalLogged = todayLog.reduce((s, e) => s + e.loggedHours, 0);
    const totalPlanned = todayLog.reduce((s, e) => s + e.plannedHours, 0);
    const active = todayLog.filter((e) => e.status === "In Progress" || e.status === "Partial").length;
    return { completed, canceled, totalLogged, totalPlanned, active, total: todayLog.length };
  }, [todayLog]);

  const leaderboard = useMemo<LeaderboardEntry[]>(() => {
    if (leaderboardQuery.data && leaderboardQuery.data.length > 0) {
      return leaderboardQuery.data;
    }
    return [];
  }, [leaderboardQuery.data]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    statsQuery.refetch();
    leaderboardQuery.refetch();
    setTimeout(() => setRefreshing(false), 1200);
  }, [statsQuery, leaderboardQuery]);

  const stats = statsQuery.data;

  const cardShadow = { shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 };

  if (!selectedCollector) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.bg }]}>
        <Inbox size={44} color={colors.border} />
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Collector Selected</Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Set your profile in the Tools tab to view stats</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
    >
      <View style={styles.pageHeader}>
        <View>
          <Text style={[styles.pageLabel, { color: colors.accent }]}>PERFORMANCE</Text>
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
            {normalizeCollectorName(selectedCollector.name)}
          </Text>
          {selectedRig !== "" && <Text style={[styles.pageRig, { color: colors.textMuted }]}>{selectedRig}</Text>}
        </View>
        <View style={[styles.perfBadge, { backgroundColor: colors.accentSoft, borderColor: colors.accentDim }]}>
          <Zap size={11} color={colors.accent} />
          <Text style={[styles.perfBadgeText, { color: colors.accent }]}>Stats</Text>
        </View>
      </View>

      <View style={[styles.sectionHeader]}>
        <Calendar size={12} color={colors.accent} />
        <Text style={[styles.sectionLabel, { color: colors.accent }]}>TODAY</Text>
      </View>

      <View style={styles.heroGrid}>
        <HeroStat label="Assigned" value={String(localStats.total)} icon={<Target size={18} color={colors.accent} />} color={colors.accent} index={0} />
        <HeroStat label="Completed" value={String(localStats.completed)} icon={<CheckCircle size={18} color={colors.complete} />} color={colors.complete} index={1} />
        <HeroStat label="Logged" value={`${localStats.totalLogged.toFixed(1)}h`} icon={<Clock size={18} color={colors.statusPending} />} color={colors.statusPending} index={2} />
        <HeroStat label="Active" value={String(localStats.active)} icon={<TrendingUp size={18} color={colors.accentLight} />} color={colors.accentLight} index={3} />
      </View>

      {localStats.totalPlanned > 0 && (
        <View style={[styles.progressCard, { backgroundColor: colors.bgCard, borderColor: colors.border, ...cardShadow }]}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: colors.textPrimary }]}>Daily Progress</Text>
            <Text style={[styles.progressPct, { color: colors.accent }]}>
              {localStats.totalPlanned > 0 ? `${Math.round((localStats.totalLogged / localStats.totalPlanned) * 100)}%` : "0%"}
            </Text>
          </View>
          <AnimatedBar value={localStats.totalLogged} maxValue={localStats.totalPlanned} color={colors.accent} delay={200} />
          <Text style={[styles.progressSub, { color: colors.textMuted }]}>
            {localStats.totalLogged.toFixed(1)}h of {localStats.totalPlanned.toFixed(1)}h planned
          </Text>
        </View>
      )}

      {stats && stats.weeklyLoggedHours > 0 && (
        <>
          <View style={[styles.sectionHeader, { marginTop: 20 }]}>
            <Calendar size={12} color={colors.complete} />
            <Text style={[styles.sectionLabel, { color: colors.complete }]}>THIS WEEK (MON-SUN)</Text>
          </View>
          <View style={[styles.weekCard, { backgroundColor: colors.bgCard, borderColor: colors.border, ...cardShadow }]}>
            <View style={styles.weekRow}>
              <View style={styles.weekItem}>
                <Text style={[styles.weekVal, { color: colors.accent }]}>{stats.weeklyLoggedHours.toFixed(1)}h</Text>
                <Text style={[styles.weekLbl, { color: colors.textMuted }]}>Hours</Text>
              </View>
              <View style={[styles.weekSep, { backgroundColor: colors.border }]} />
              <View style={styles.weekItem}>
                <Text style={[styles.weekVal, { color: colors.complete }]}>{stats.weeklyCompleted}</Text>
                <Text style={[styles.weekLbl, { color: colors.textMuted }]}>Done</Text>
              </View>
              <View style={[styles.weekSep, { backgroundColor: colors.border }]} />
              <View style={styles.weekItem}>
                <Text style={[styles.weekVal, { color: colors.textPrimary }]}>{stats.avgHoursPerTask.toFixed(1)}h</Text>
                <Text style={[styles.weekLbl, { color: colors.textMuted }]}>Avg/Task</Text>
              </View>
              <View style={[styles.weekSep, { backgroundColor: colors.border }]} />
              <View style={styles.weekItem}>
                <Text style={[styles.weekVal, { color: colors.complete }]}>{stats.completionRate.toFixed(0)}%</Text>
                <Text style={[styles.weekLbl, { color: colors.textMuted }]}>Rate</Text>
              </View>
            </View>
          </View>
        </>
      )}

      {leaderboard.length > 0 && (
        <>
          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <Trophy size={12} color={colors.gold} />
            <Text style={[styles.sectionLabel, { color: colors.gold }]}>WEEKLY LEADERBOARD</Text>
          </View>
          <View style={[styles.leaderboardCard, { backgroundColor: colors.bgCard, borderColor: colors.border, ...cardShadow }]}>
            <View style={styles.lbHeaderRow}>
              <Text style={[styles.lbHeaderText, { color: colors.textMuted }]}>Mon-Sun Rankings</Text>
              <Medal size={14} color={colors.gold} />
            </View>
            {leaderboard.slice(0, 10).map((entry, idx) => (
              <LeaderboardCard
                key={`lb_${idx}`}
                entry={entry}
                index={idx}
                isCurrentUser={normalizeCollectorName(entry.collectorName).toLowerCase() === normalizedName.toLowerCase()}
                colors={colors}
              />
            ))}
          </View>
        </>
      )}

      {statsQuery.isLoading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading stats...</Text>
        </View>
      )}

      {stats && (
        <>
          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <TrendingUp size={12} color={colors.textMuted} />
            <Text style={[styles.sectionLabelMuted, { color: colors.textMuted }]}>ALL TIME</Text>
          </View>
          <View style={[styles.allTimeCard, { backgroundColor: colors.bgCard, borderColor: colors.border, ...cardShadow }]}>
            <View style={styles.allTimeGrid}>
              <View style={styles.allTimeItem}>
                <Text style={[styles.allTimeVal, { color: colors.textPrimary }]}>{stats.totalAssigned}</Text>
                <Text style={[styles.allTimeLbl, { color: colors.textMuted }]}>Tasks</Text>
              </View>
              <View style={[styles.allTimeSep, { backgroundColor: colors.border }]} />
              <View style={styles.allTimeItem}>
                <Text style={[styles.allTimeVal, { color: colors.complete }]}>{stats.totalCompleted}</Text>
                <Text style={[styles.allTimeLbl, { color: colors.textMuted }]}>Done</Text>
              </View>
              <View style={[styles.allTimeSep, { backgroundColor: colors.border }]} />
              <View style={styles.allTimeItem}>
                <Text style={[styles.allTimeVal, { color: colors.accent }]}>{stats.totalLoggedHours.toFixed(0)}h</Text>
                <Text style={[styles.allTimeLbl, { color: colors.textMuted }]}>Hours</Text>
              </View>
              <View style={[styles.allTimeSep, { backgroundColor: colors.border }]} />
              <View style={styles.allTimeItem}>
                <Text style={[styles.allTimeVal, { color: colors.complete }]}>{stats.completionRate.toFixed(0)}%</Text>
                <Text style={[styles.allTimeLbl, { color: colors.textMuted }]}>Rate</Text>
              </View>
            </View>
            <View style={[styles.allTimeDivider, { backgroundColor: colors.border }]} />
            <AnimatedBar value={stats.totalCompleted} maxValue={stats.totalAssigned || 1} color={colors.complete} delay={400} />
            <Text style={[styles.allTimeSub, { color: colors.textMuted }]}>
              {stats.totalCompleted} of {stats.totalAssigned} tasks completed
            </Text>
          </View>

          {stats.topTasks && stats.topTasks.length > 0 && (
            <View style={[styles.topTasksCard, { backgroundColor: colors.bgCard, borderColor: colors.border, ...cardShadow }]}>
              <Text style={[styles.topTasksTitle, { color: colors.textMuted }]}>Recent Tasks</Text>
              {stats.topTasks.slice(0, 8).map((task, idx) => {
                const dotColor = task.status === "Completed" ? colors.statusActive : task.status === "Canceled" ? colors.statusCancelled : colors.accent;
                return (
                  <View key={`task_${idx}`} style={[styles.topTaskRow, { borderBottomColor: colors.border }, idx === Math.min(stats.topTasks.length - 1, 7) && styles.topTaskLast]}>
                    <View style={[styles.topTaskDot, { backgroundColor: dotColor }]} />
                    <Text style={[styles.topTaskName, { color: colors.textSecondary }]} numberOfLines={1}>{task.name}</Text>
                    <Text style={[styles.topTaskHours, { color: dotColor }]}>{task.hours}h</Text>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}

      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  pageHeader: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "flex-end" as const, marginBottom: 22 },
  pageLabel: { fontSize: 10, fontWeight: "700" as const, letterSpacing: 2, marginBottom: 4 },
  pageTitle: { fontSize: 26, letterSpacing: -0.5, fontWeight: "700" as const },
  pageRig: { fontSize: 12, marginTop: 2 },
  perfBadge: { flexDirection: "row" as const, alignItems: "center" as const, gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  perfBadgeText: { fontSize: 11, fontWeight: "600" as const },
  sectionHeader: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, marginBottom: 12 },
  sectionLabel: { fontSize: 10, letterSpacing: 1.4, fontWeight: "700" as const },
  sectionLabelMuted: { fontSize: 10, letterSpacing: 1.2, fontWeight: "600" as const },
  heroGrid: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 10, marginBottom: 14 },
  heroCard: {
    flex: 1, minWidth: "44%" as unknown as number, borderRadius: 16, padding: 14, borderWidth: 1,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  heroIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center" as const, justifyContent: "center" as const, marginBottom: 10 },
  heroValue: { fontSize: 24, letterSpacing: -0.5, fontWeight: "700" as const },
  heroLabel: { fontSize: 11, marginTop: 2, fontWeight: "500" as const },
  progressCard: { borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1 },
  progressHeader: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const, marginBottom: 10 },
  progressTitle: { fontSize: 14, fontWeight: "600" as const },
  progressPct: { fontSize: 16, fontWeight: "700" as const },
  progressSub: { fontSize: 11, marginTop: 8 },
  weekCard: { borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1 },
  weekRow: { flexDirection: "row" as const, alignItems: "center" as const },
  weekSep: { width: 1, height: 28 },
  weekItem: { flex: 1, alignItems: "center" as const },
  weekVal: { fontSize: 16, fontWeight: "600" as const },
  weekLbl: { fontSize: 10, marginTop: 3 },
  leaderboardCard: { borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 1 },
  lbHeaderRow: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const, paddingHorizontal: 4, paddingBottom: 8, marginBottom: 4 },
  lbHeaderText: { fontSize: 10, fontWeight: "600" as const, letterSpacing: 0.5, textTransform: "uppercase" as const },
  loadingWrap: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 8, paddingVertical: 20 },
  loadingText: { fontSize: 13 },
  allTimeCard: { borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1 },
  allTimeGrid: { flexDirection: "row" as const, alignItems: "center" as const, marginBottom: 12 },
  allTimeItem: { flex: 1, alignItems: "center" as const },
  allTimeSep: { width: 1, height: 24 },
  allTimeVal: { fontSize: 15, fontWeight: "600" as const },
  allTimeLbl: { fontSize: 10, marginTop: 3 },
  allTimeDivider: { height: 1, marginBottom: 10 },
  allTimeSub: { fontSize: 10, marginTop: 8, textAlign: "center" as const },
  topTasksCard: { borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1 },
  topTasksTitle: { fontSize: 10, letterSpacing: 1.1, textTransform: "uppercase" as const, marginBottom: 10, fontWeight: "600" as const },
  topTaskRow: { flexDirection: "row" as const, alignItems: "center" as const, paddingVertical: 8, borderBottomWidth: 1, gap: 10 },
  topTaskLast: { borderBottomWidth: 0 },
  topTaskDot: { width: 5, height: 5, borderRadius: 3 },
  topTaskName: { flex: 1, fontSize: 12 },
  topTaskHours: { fontSize: 12, fontWeight: "600" as const },
  empty: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, padding: 40, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: "600" as const },
  emptyText: { fontSize: 14, textAlign: "center" as const },
  spacer: { height: 20 },
});
