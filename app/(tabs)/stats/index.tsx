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
import { TrendingUp, Clock, CheckCircle, Target, Inbox, Calendar, Zap, Trophy, ChevronRight } from "lucide-react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useCollection } from "../../../providers/CollectionProvider";
import { useTheme } from "../../../providers/ThemeProvider";
import { fetchCollectorStats } from "../../../services/googleSheets";
import { CollectorStats } from "../../../types";

function normalizeCollectorName(name: string): string {
  return name.replace(/\s*\(.*?\)\s*$/g, "").trim();
}

function AnimatedBar({
  value,
  maxValue,
  color,
  delay,
}: {
  value: number;
  maxValue: number;
  color: string;
  delay: number;
}) {
  const { colors } = useTheme();
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pct = maxValue > 0 ? Math.min(value / maxValue, 1) : 0;
    Animated.timing(widthAnim, {
      toValue: pct * 100,
      duration: 800,
      delay,
      useNativeDriver: false,
    }).start();
  }, [value, maxValue, delay, widthAnim]);

  return (
    <View style={[barStyles.track, { backgroundColor: colors.bgInput }]}>
      <Animated.View
        style={[
          barStyles.fill,
          {
            backgroundColor: color,
            width: widthAnim.interpolate({
              inputRange: [0, 100],
              outputRange: ["0%", "100%"],
            }),
          },
        ]}
      />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden" as const,
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
});

function HeroStat({
  label,
  value,
  sub,
  icon,
  color,
  index,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
  index: number;
}) {
  const { colors, isDark } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 380,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        delay: index * 80,
        speed: 22,
        bounciness: 5,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, index]);

  const cardBg = isDark ? '#1C1C20' : '#FFFFFF';
  const cardBorder = isDark ? '#2A2A30' : '#DDD9CF';

  return (
    <Animated.View
      style={[
        styles.heroCard,
        {
          backgroundColor: cardBg,
          borderColor: cardBorder,
          shadowColor: colors.shadow,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={[styles.heroIconWrap, { backgroundColor: color + "14" }]}>
        {icon}
      </View>
      <Text style={[styles.heroValue, { color: colors.textPrimary, fontFamily: "Lexend_700Bold" }]}>
        {value}
      </Text>
      <Text style={[styles.heroLabel, { color: colors.textMuted, fontFamily: "Lexend_500Medium" }]}>
        {label}
      </Text>
      {sub ? (
        <Text style={[styles.heroSub, { color: color, fontFamily: "Lexend_400Regular" }]}>{sub}</Text>
      ) : null}
    </Animated.View>
  );
}

function SmallStat({ label, value, color }: { label: string; value: string; color?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.smallStat}>
      <Text style={[styles.smallValue, { color: color ?? colors.textPrimary, fontFamily: "Lexend_600SemiBold" }]}>
        {value}
      </Text>
      <Text style={[styles.smallLabel, { color: colors.textMuted, fontFamily: "Lexend_400Regular" }]}>
        {label}
      </Text>
    </View>
  );
}

export default function StatsScreen() {
  const { colors, isDark } = useTheme();
  const { selectedCollector, selectedCollectorName, selectedRig, todayLog, configured } =
    useCollection();
  const [refreshing, setRefreshing] = useState(false);

  const normalizedName = useMemo(
    () => normalizeCollectorName(selectedCollectorName),
    [selectedCollectorName]
  );

  const statsQuery = useQuery<CollectorStats>({
    queryKey: ["collectorStats", selectedCollectorName],
    queryFn: () => fetchCollectorStats(selectedCollectorName),
    enabled: configured && !!selectedCollectorName,
    staleTime: 60 * 1000,
    retry: 1,
  });

  const localStats = useMemo(() => {
    const completed = todayLog.filter((e) => e.status === "Completed").length;
    const canceled = todayLog.filter((e) => e.status === "Canceled").length;
    const totalLogged = todayLog.reduce((s, e) => s + e.loggedHours, 0);
    const totalPlanned = todayLog.reduce((s, e) => s + e.plannedHours, 0);
    const active = todayLog.filter(
      (e) => e.status === "In Progress" || e.status === "Partial"
    ).length;
    return { completed, canceled, totalLogged, totalPlanned, active, total: todayLog.length };
  }, [todayLog]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    statsQuery.refetch();
    setTimeout(() => setRefreshing(false), 1200);
  }, [statsQuery]);

  const stats = statsQuery.data;

  const cardBg = isDark ? '#1C1C20' : '#FFFFFF';
  const cardBorder = isDark ? '#2A2A30' : '#DDD9CF';

  if (!selectedCollector) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.bg }]}>
        <Inbox size={44} color={colors.border} />
        <Text style={[styles.emptyTitle, { color: colors.textPrimary, fontFamily: "Lexend_600SemiBold" }]}>
          No Collector Selected
        </Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary, fontFamily: "Lexend_400Regular" }]}>
          Set your profile in the Tools tab to view stats
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
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
      <TouchableOpacity
        style={[
          styles.leaderboardCard,
          {
            backgroundColor: isDark ? colors.gold + '10' : colors.gold + '0A',
            borderColor: colors.gold + '30',
            shadowColor: colors.shadow,
          },
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/stats/leaderboard' as any);
        }}
        activeOpacity={0.75}
        testID="leaderboard-btn"
      >
        <View style={[styles.leaderboardIcon, { backgroundColor: colors.gold + '18' }]}>
          <Trophy size={20} color={colors.gold} />
        </View>
        <View style={styles.leaderboardInfo}>
          <Text style={[styles.leaderboardTitle, { color: colors.textPrimary, fontFamily: 'Lexend_700Bold' }]}>
            Weekly Leaderboard
          </Text>
          <Text style={[styles.leaderboardSub, { color: colors.textMuted, fontFamily: 'Lexend_400Regular' }]}>
            See how you rank against the team
          </Text>
        </View>
        <ChevronRight size={18} color={colors.gold} />
      </TouchableOpacity>

      <View style={styles.pageHeader}>
        <View>
          <Text style={[styles.pageTitle, { color: colors.textPrimary, fontFamily: "Lexend_700Bold" }]}>
            {normalizeCollectorName(selectedCollector.name)}
          </Text>
          {selectedRig !== "" && (
            <Text style={[styles.pageRig, { color: colors.textMuted, fontFamily: "Lexend_400Regular" }]}>
              {selectedRig}
            </Text>
          )}
        </View>
        <View style={[styles.perfBadge, { backgroundColor: colors.accentSoft, borderColor: colors.accentDim }]}>
          <Zap size={11} color={colors.accent} />
          <Text style={[styles.perfBadgeText, { color: colors.accent, fontFamily: "Lexend_600SemiBold" }]}>
            Performance
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Calendar size={13} color={colors.accent} />
        <Text style={[styles.sectionLabel, { color: colors.accent, fontFamily: "Lexend_700Bold" }]}>
          TODAY
        </Text>
      </View>

      <View style={styles.heroGrid}>
        <HeroStat
          label="Assigned"
          value={String(localStats.total)}
          icon={<Target size={20} color={colors.accent} />}
          color={colors.accent}
          index={0}
        />
        <HeroStat
          label="Completed"
          value={String(localStats.completed)}
          icon={<CheckCircle size={20} color={colors.complete} />}
          color={colors.complete}
          index={1}
        />
        <HeroStat
          label="Logged"
          value={`${localStats.totalLogged.toFixed(1)}h`}
          icon={<Clock size={20} color={colors.statusPending} />}
          color={colors.statusPending}
          index={2}
        />
        <HeroStat
          label="Active"
          value={String(localStats.active)}
          icon={<TrendingUp size={20} color={colors.accentLight} />}
          color={colors.accentLight}
          index={3}
        />
      </View>

      {localStats.totalPlanned > 0 && (
        <View
          style={[
            styles.progressCard,
            { backgroundColor: cardBg, borderColor: cardBorder },
          ]}
        >
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: colors.textPrimary, fontFamily: "Lexend_600SemiBold" }]}>
              Daily Progress
            </Text>
            <Text style={[styles.progressPct, { color: colors.accent, fontFamily: "Lexend_700Bold" }]}>
              {localStats.totalPlanned > 0
                ? `${Math.round((localStats.totalLogged / localStats.totalPlanned) * 100)}%`
                : "0%"}
            </Text>
          </View>
          <AnimatedBar
            value={localStats.totalLogged}
            maxValue={localStats.totalPlanned}
            color={colors.accent}
            delay={200}
          />
          <Text style={[styles.progressSub, { color: colors.textMuted, fontFamily: "Lexend_400Regular" }]}>
            {localStats.totalLogged.toFixed(1)}h of {localStats.totalPlanned.toFixed(1)}h planned
          </Text>
        </View>
      )}

      {stats && stats.weeklyLoggedHours > 0 && (
        <>
          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <Calendar size={13} color={colors.complete} />
            <Text style={[styles.sectionLabel, { color: colors.complete, fontFamily: "Lexend_700Bold" }]}>
              THIS WEEK
            </Text>
          </View>

          <View style={[styles.weekCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.weekRow}>
              <SmallStat
                label="Hours"
                value={`${stats.weeklyLoggedHours.toFixed(1)}h`}
                color={colors.accent}
              />
              <View style={[styles.weekSep, { backgroundColor: colors.border }]} />
              <SmallStat
                label="Done"
                value={String(stats.weeklyCompleted)}
                color={colors.complete}
              />
              <View style={[styles.weekSep, { backgroundColor: colors.border }]} />
              <SmallStat
                label="Avg/Task"
                value={`${stats.avgHoursPerTask.toFixed(1)}h`}
              />
              <View style={[styles.weekSep, { backgroundColor: colors.border }]} />
              <SmallStat
                label="Rate"
                value={`${stats.completionRate.toFixed(0)}%`}
                color={colors.complete}
              />
            </View>
          </View>
        </>
      )}

      {statsQuery.isLoading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textMuted, fontFamily: "Lexend_400Regular" }]}>
            Loading stats...
          </Text>
        </View>
      )}

      {stats && (
        <>
          <View style={[styles.sectionHeader, { marginTop: 28 }]}>
            <TrendingUp size={12} color={colors.textMuted} />
            <Text style={[styles.sectionLabelMuted, { color: colors.textMuted, fontFamily: "Lexend_600SemiBold" }]}>
              ALL TIME
            </Text>
          </View>

          <View
            style={[
              styles.allTimeCard,
              { backgroundColor: cardBg, borderColor: cardBorder },
            ]}
          >
            <View style={styles.allTimeGrid}>
              <View style={styles.allTimeItem}>
                <Text style={[styles.allTimeVal, { color: colors.textPrimary, fontFamily: "Lexend_600SemiBold" }]}>
                  {stats.totalAssigned}
                </Text>
                <Text style={[styles.allTimeLbl, { color: colors.textMuted, fontFamily: "Lexend_400Regular" }]}>
                  Tasks
                </Text>
              </View>
              <View style={[styles.allTimeSep, { backgroundColor: colors.border }]} />
              <View style={styles.allTimeItem}>
                <Text style={[styles.allTimeVal, { color: colors.complete, fontFamily: "Lexend_600SemiBold" }]}>
                  {stats.totalCompleted}
                </Text>
                <Text style={[styles.allTimeLbl, { color: colors.textMuted, fontFamily: "Lexend_400Regular" }]}>
                  Done
                </Text>
              </View>
              <View style={[styles.allTimeSep, { backgroundColor: colors.border }]} />
              <View style={styles.allTimeItem}>
                <Text style={[styles.allTimeVal, { color: colors.accent, fontFamily: "Lexend_600SemiBold" }]}>
                  {stats.totalLoggedHours.toFixed(0)}h
                </Text>
                <Text style={[styles.allTimeLbl, { color: colors.textMuted, fontFamily: "Lexend_400Regular" }]}>
                  Hours
                </Text>
              </View>
              <View style={[styles.allTimeSep, { backgroundColor: colors.border }]} />
              <View style={styles.allTimeItem}>
                <Text style={[styles.allTimeVal, { color: colors.complete, fontFamily: "Lexend_600SemiBold" }]}>
                  {stats.completionRate.toFixed(0)}%
                </Text>
                <Text style={[styles.allTimeLbl, { color: colors.textMuted, fontFamily: "Lexend_400Regular" }]}>
                  Rate
                </Text>
              </View>
            </View>
            <View style={[styles.allTimeDivider, { backgroundColor: colors.border }]} />
            <AnimatedBar
              value={stats.totalCompleted}
              maxValue={stats.totalAssigned || 1}
              color={colors.complete}
              delay={400}
            />
            <Text style={[styles.allTimeSub, { color: colors.textMuted, fontFamily: "Lexend_400Regular" }]}>
              {stats.totalCompleted} of {stats.totalAssigned} tasks completed
            </Text>
          </View>

          {stats.topTasks && stats.topTasks.length > 0 && (
            <View
              style={[
                styles.topTasksCard,
                { backgroundColor: cardBg, borderColor: cardBorder },
              ]}
            >
              <Text style={[styles.topTasksTitle, { color: colors.textMuted, fontFamily: "Lexend_600SemiBold" }]}>
                Recent Tasks
              </Text>
              {stats.topTasks.slice(0, 8).map((task, idx) => {
                const dotColor =
                  task.status === "Completed"
                    ? colors.statusActive
                    : task.status === "Canceled"
                    ? colors.statusCancelled
                    : colors.accent;
                return (
                  <View
                    key={`task_${idx}`}
                    style={[
                      styles.topTaskRow,
                      { borderBottomColor: colors.border },
                      idx === Math.min(stats.topTasks.length - 1, 7) && styles.topTaskLast,
                    ]}
                  >
                    <View style={[styles.topTaskDot, { backgroundColor: dotColor }]} />
                    <Text
                      style={[styles.topTaskName, { color: colors.textSecondary, fontFamily: "Lexend_400Regular" }]}
                      numberOfLines={1}
                    >
                      {task.name}
                    </Text>
                    <Text style={[styles.topTaskHours, { color: dotColor, fontFamily: "Lexend_600SemiBold" }]}>
                      {task.hours}h
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}

      {!stats && !statsQuery.isLoading && configured && (
        <View style={[styles.infoCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <Text style={[styles.infoText, { color: colors.textMuted, fontFamily: "Lexend_400Regular" }]}>
            All-time stats appear once the Apps Script{"\n"}getCollectorStats endpoint is configured.
          </Text>
        </View>
      )}

      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  pageHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-end" as const,
    marginBottom: 24,
  },
  pageTitle: { fontSize: 28, letterSpacing: -0.5 },
  pageRig: { fontSize: 13, marginTop: 2 },
  perfBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  perfBadgeText: { fontSize: 11 },
  sectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: 1.4,
  },
  sectionLabelMuted: {
    fontSize: 11,
    letterSpacing: 1.2,
  },
  heroGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 10,
    marginBottom: 16,
  },
  heroCard: {
    flex: 1,
    minWidth: "44%" as unknown as number,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  heroIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 12,
  },
  heroValue: { fontSize: 26, letterSpacing: -0.5 },
  heroLabel: { fontSize: 12, marginTop: 2 },
  heroSub: { fontSize: 11, marginTop: 4 },
  progressCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 12,
  },
  progressTitle: { fontSize: 15 },
  progressPct: { fontSize: 17 },
  progressSub: { fontSize: 12, marginTop: 10 },
  weekCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  weekRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  weekSep: { width: 1, height: 32 },
  smallStat: { flex: 1, alignItems: "center" as const },
  smallValue: { fontSize: 18 },
  smallLabel: { fontSize: 11, marginTop: 3 },
  loadingWrap: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    paddingVertical: 20,
  },
  loadingText: { fontSize: 13 },
  allTimeCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  allTimeGrid: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: 14,
  },
  allTimeItem: { flex: 1, alignItems: "center" as const },
  allTimeSep: { width: 1, height: 28 },
  allTimeVal: { fontSize: 16 },
  allTimeLbl: { fontSize: 11, marginTop: 3 },
  allTimeDivider: { height: 1, marginBottom: 12 },
  allTimeSub: { fontSize: 11, marginTop: 8, textAlign: "center" as const },
  topTasksCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  topTasksTitle: {
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase" as const,
    marginBottom: 12,
  },
  topTaskRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  topTaskLast: { borderBottomWidth: 0 },
  topTaskDot: { width: 6, height: 6, borderRadius: 3 },
  topTaskName: { flex: 1, fontSize: 13 },
  topTaskHours: { fontSize: 13 },
  infoCard: { borderRadius: 14, padding: 16, marginTop: 8, borderWidth: 1 },
  infoText: { fontSize: 13, lineHeight: 19, textAlign: "center" as const },
  empty: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: 40,
    gap: 10,
  },
  emptyTitle: { fontSize: 17 },
  emptyText: { fontSize: 14, textAlign: "center" as const },
  spacer: { height: 20 },
  leaderboardCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  leaderboardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  leaderboardInfo: { flex: 1 },
  leaderboardTitle: { fontSize: 14 },
  leaderboardSub: { fontSize: 11, marginTop: 1 },
});
