import React, { useCallback, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Animated,
} from "react-native";
import { CheckCircle, XCircle, Clock, Inbox } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useCollection } from "../../../providers/CollectionProvider";
import { useTheme } from "../../../providers/ThemeProvider";
import { LogEntry } from "../../../types";

function TaskCard({
  entry,
  onComplete,
  onCancel,
  index,
}: {
  entry: LogEntry;
  onComplete: (taskName: string) => void;
  onCancel: (taskName: string) => void;
  index: number;
}) {
  const { colors } = useTheme();
  const isActive = entry.status === "In Progress" || entry.status === "Partial";
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 55,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 1,
        delay: index * 55,
        speed: 20,
        bounciness: 5,
        useNativeDriver: true,
      }),
    ]).start();
  }, [slideAnim, fadeAnim, index]);

  const handleComplete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onComplete(entry.taskName);
  }, [onComplete, entry.taskName]);

  const handleCancel = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCancel(entry.taskName);
  }, [onCancel, entry.taskName]);

  const dotColor =
    entry.status === "Completed"
      ? colors.statusActive
      : entry.status === "Canceled"
      ? colors.statusCancelled
      : entry.status === "Partial"
      ? colors.statusPending
      : colors.accent;

  const pct =
    entry.plannedHours > 0
      ? Math.min(entry.loggedHours / entry.plannedHours, 1)
      : 0;

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [
          {
            translateY: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }),
          },
        ],
      }}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.bgCard,
            borderColor: colors.border,
            shadowColor: colors.shadow,
          },
        ]}
      >
        <View style={styles.cardTop}>
          <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
          <View style={styles.cardTitleWrap}>
            <Text
              style={[styles.cardTitle, { color: colors.textPrimary }]}
              numberOfLines={2}
            >
              {entry.taskName}
            </Text>
          </View>
          <View style={[styles.statusTag, { backgroundColor: dotColor + "18" }]}>
            <Text style={[styles.statusTagText, { color: dotColor }]}>
              {entry.status}
            </Text>
          </View>
        </View>

        <View style={styles.progressRow}>
          <View style={[styles.progressTrack, { backgroundColor: colors.bgInput }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: dotColor,
                  width: `${Math.round(pct * 100)}%` as any,
                },
              ]}
            />
          </View>
          <View style={styles.hoursRow}>
            <Clock size={11} color={colors.textMuted} />
            <Text style={[styles.hoursText, { color: colors.textSecondary }]}>
              {entry.loggedHours}h / {entry.plannedHours}h
            </Text>
            {entry.remainingHours > 0 && (
              <Text style={[styles.remainText, { color: colors.statusPending }]}>
                · {entry.remainingHours}h left
              </Text>
            )}
          </View>
        </View>

        {entry.notes ? (
          <Text
            style={[styles.notesText, { color: colors.textMuted }]}
            numberOfLines={2}
          >
            {entry.notes}
          </Text>
        ) : null}

        {isActive && (
          <View
            style={[styles.actionsBar, { borderTopColor: colors.border }]}
          >
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.completeBg }]}
              onPress={handleComplete}
              activeOpacity={0.75}
            >
              <CheckCircle size={14} color={colors.complete} />
              <Text style={[styles.actionBtnText, { color: colors.complete }]}>
                Complete
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.cancelBg }]}
              onPress={handleCancel}
              activeOpacity={0.75}
            >
              <XCircle size={14} color={colors.cancel} />
              <Text style={[styles.actionBtnText, { color: colors.cancel }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const MemoizedTaskCard = React.memo(TaskCard);

export default function TasksScreen() {
  const { colors } = useTheme();
  const {
    todayLog,
    openTasks,
    selectedCollector,
    selectedRig,
    completeTask,
    cancelTask,
    refreshData,
  } = useCollection();

  const [refreshing, setRefreshing] = React.useState(false);

  const completedCount = useMemo(
    () => todayLog.filter((t) => t.status === "Completed").length,
    [todayLog]
  );

  const totalHours = useMemo(
    () => todayLog.reduce((s, t) => s + t.loggedHours, 0),
    [todayLog]
  );

  const completionPct = useMemo(() => {
    if (!todayLog.length) return 0;
    return Math.round((completedCount / todayLog.length) * 100);
  }, [completedCount, todayLog.length]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refreshData();
    setTimeout(() => setRefreshing(false), 1200);
  }, [refreshData]);

  const handleComplete = useCallback(
    async (taskName: string) => {
      try {
        await completeTask(taskName);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to complete";
        Alert.alert("Error", msg);
      }
    },
    [completeTask]
  );

  const handleCancel = useCallback(
    (taskName: string) => {
      Alert.alert("Cancel Task", `Cancel "${taskName}"?`, [
        { text: "No", style: "cancel" },
        {
          text: "Yes",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelTask(taskName);
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : "Failed to cancel";
              Alert.alert("Error", msg);
            }
          },
        },
      ]);
    },
    [cancelTask]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: LogEntry; index: number }) => (
      <MemoizedTaskCard
        entry={item}
        onComplete={handleComplete}
        onCancel={handleCancel}
        index={index}
      />
    ),
    [handleComplete, handleCancel]
  );

  const keyExtractor = useCallback(
    (item: LogEntry, index: number) => item.assignmentId || `entry_${index}`,
    []
  );

  if (!selectedCollector) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.bg }]}>
        <Inbox size={44} color={colors.border} />
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          No Collector Selected
        </Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Set your profile in the Tools tab first
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.bg }]}>
        <View>
          <Text style={[styles.headerName, { color: colors.textPrimary }]}>
            {selectedCollector.name.split(" ")[0]}
          </Text>
          {selectedRig !== "" && (
            <Text style={[styles.headerRig, { color: colors.textMuted }]}>
              {selectedRig}
            </Text>
          )}
        </View>
        <View style={styles.headerStats}>
          <View style={[styles.headerStatPill, { backgroundColor: colors.accentSoft }]}>
            <Text style={[styles.headerStatNum, { color: colors.accent }]}>
              {openTasks.length}
            </Text>
            <Text style={[styles.headerStatLabel, { color: colors.accentLight }]}>
              open
            </Text>
          </View>
          <View style={[styles.headerStatPill, { backgroundColor: colors.completeBg }]}>
            <Text style={[styles.headerStatNum, { color: colors.complete }]}>
              {completedCount}
            </Text>
            <Text style={[styles.headerStatLabel, { color: colors.complete + "99" }]}>
              done
            </Text>
          </View>
          <View style={[styles.headerStatPill, { backgroundColor: colors.bgElevated }]}>
            <Text style={[styles.headerStatNum, { color: colors.textPrimary }]}>
              {totalHours.toFixed(1)}h
            </Text>
            <Text style={[styles.headerStatLabel, { color: colors.textMuted }]}>
              logged
            </Text>
          </View>
        </View>
      </View>

      {todayLog.length > 0 && (
        <View style={[styles.progressBar, { backgroundColor: colors.bgCard }]}>
          <View style={styles.progressLabelRow}>
            <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
              Daily Progress
            </Text>
            <Text style={[styles.progressPct, { color: colors.accent }]}>
              {completionPct}%
            </Text>
          </View>
          <View style={[styles.progressTrackFull, { backgroundColor: colors.bgInput }]}>
            <Animated.View
              style={[
                styles.progressFillFull,
                {
                  backgroundColor: colors.accent,
                  width: `${completionPct}%` as any,
                },
              ]}
            />
          </View>
        </View>
      )}

      <FlatList
        data={todayLog}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <Text style={[styles.emptyListText, { color: colors.textSecondary }]}>
              No tasks today
            </Text>
            <Text style={[styles.emptyListSub, { color: colors.textMuted }]}>
              Assign a task from the Collect tab
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerName: { fontSize: 22, fontWeight: "700" as const, letterSpacing: -0.4 },
  headerRig: { fontSize: 13, fontWeight: "500" as const, marginTop: 2 },
  headerStats: {
    flexDirection: "row" as const,
    gap: 6,
  },
  headerStatPill: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "center" as const,
  },
  headerStatNum: { fontSize: 15, fontWeight: "700" as const },
  headerStatLabel: { fontSize: 10, fontWeight: "600" as const, marginTop: 1 },
  progressBar: {
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: 12,
    padding: 12,
  },
  progressLabelRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 8,
  },
  progressLabel: { fontSize: 12, fontWeight: "600" as const },
  progressPct: { fontSize: 13, fontWeight: "700" as const },
  progressTrackFull: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden" as const,
  },
  progressFillFull: {
    height: 6,
    borderRadius: 3,
  },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTop: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    marginBottom: 12,
    gap: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  cardTitleWrap: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: "600" as const, lineHeight: 19 },
  statusTag: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginTop: 1,
  },
  statusTagText: { fontSize: 11, fontWeight: "600" as const },
  progressRow: { marginBottom: 8 },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden" as const,
    marginBottom: 6,
  },
  progressFill: { height: 4, borderRadius: 2 },
  hoursRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  hoursText: { fontSize: 12, fontWeight: "500" as const },
  remainText: { fontSize: 12, fontWeight: "500" as const },
  notesText: {
    fontSize: 12,
    lineHeight: 16,
    fontStyle: "italic" as const,
    marginBottom: 10,
  },
  actionsBar: {
    flexDirection: "row" as const,
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnText: { fontSize: 13, fontWeight: "600" as const },
  empty: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: 40,
    gap: 10,
  },
  emptyTitle: { fontSize: 17, fontWeight: "600" as const },
  emptyText: { fontSize: 14, textAlign: "center" as const },
  emptyList: {
    alignItems: "center" as const,
    paddingTop: 60,
    gap: 6,
  },
  emptyListText: { fontSize: 15, fontWeight: "600" as const },
  emptyListSub: { fontSize: 13, textAlign: "center" as const },
});
