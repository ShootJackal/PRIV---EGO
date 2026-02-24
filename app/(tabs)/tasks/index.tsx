import React, { useCallback, useMemo, useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Animated,
  TextInput,
  Platform,
} from "react-native";
import { CheckCircle, XCircle, Clock, Inbox, Search, X } from "lucide-react-native";
const FONT_MONO = Platform.select({ ios: "Courier New", android: "monospace", default: "monospace" });
import * as Haptics from "expo-haptics";
import { useCollection } from "../../../providers/CollectionProvider";
import { useTheme } from "../../../providers/ThemeProvider";
import { LogEntry } from "../../../types";

function TaskCard({ entry, onComplete, onCancel, index }: {
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
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, delay: index * 45, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 1, delay: index * 45, speed: 22, bounciness: 4, useNativeDriver: true }),
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
    entry.status === "Completed" ? colors.statusActive
    : entry.status === "Canceled" ? colors.statusCancelled
    : entry.status === "Partial" ? colors.statusPending
    : colors.accent;

  const pct = entry.plannedHours > 0 ? Math.min(entry.loggedHours / entry.plannedHours, 1) : 0;

  return (
    <Animated.View style={{
      opacity: fadeAnim,
      transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
    }}>
      <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border, shadowColor: colors.shadow }]}>
        <View style={styles.cardTop}>
          <View style={[styles.statusStripe, { backgroundColor: dotColor }]} />
          <View style={styles.cardTitleWrap}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={2}>
              {entry.taskName}
            </Text>
          </View>
          <View style={[styles.statusTag, { backgroundColor: dotColor + "14" }]}>
            <Text style={[styles.statusTagText, { color: dotColor }]}>{entry.status}</Text>
          </View>
        </View>

        <View style={styles.progressRow}>
          <View style={[styles.progressTrack, { backgroundColor: colors.bgInput }]}>
            <View style={[styles.progressFill, { backgroundColor: dotColor, width: `${Math.round(pct * 100)}%` as any }]} />
          </View>
          <View style={styles.hoursRow}>
            <Clock size={10} color={colors.textMuted} />
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
          <Text style={[styles.notesText, { color: colors.textMuted }]} numberOfLines={2}>
            {entry.notes}
          </Text>
        ) : null}

        {isActive && (
          <View style={[styles.actionsBar, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.completeBg }]}
              onPress={handleComplete}
              activeOpacity={0.75}
            >
              <CheckCircle size={13} color={colors.complete} />
              <Text style={[styles.actionBtnText, { color: colors.complete }]}>Complete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.cancelBg }]}
              onPress={handleCancel}
              activeOpacity={0.75}
            >
              <XCircle size={13} color={colors.cancel} />
              <Text style={[styles.actionBtnText, { color: colors.cancel }]}>Cancel</Text>
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
    todayLog, openTasks, selectedCollector, selectedRig,
    completeTask, cancelTask, refreshData,
  } = useCollection();

  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const searchAnim = useRef(new Animated.Value(0)).current;

  const toggleSearch = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (showSearch) {
      Animated.timing(searchAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start(() => {
        setShowSearch(false);
        setSearchQuery("");
      });
    } else {
      setShowSearch(true);
      Animated.timing(searchAnim, { toValue: 1, duration: 250, useNativeDriver: false }).start();
    }
  }, [showSearch, searchAnim]);

  const filteredLog = useMemo(() => {
    if (!searchQuery.trim()) return todayLog;
    const q = searchQuery.toLowerCase();
    return todayLog.filter((e) =>
      e.taskName.toLowerCase().includes(q) ||
      e.status.toLowerCase().includes(q)
    );
  }, [todayLog, searchQuery]);

  const completedCount = useMemo(() => todayLog.filter((t) => t.status === "Completed").length, [todayLog]);
  const totalHours = useMemo(() => todayLog.reduce((s, t) => s + t.loggedHours, 0), [todayLog]);
  const completionPct = useMemo(() => {
    if (!todayLog.length) return 0;
    return Math.round((completedCount / todayLog.length) * 100);
  }, [completedCount, todayLog.length]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    refreshData();
    setTimeout(() => setRefreshing(false), 1200);
  }, [refreshData]);

  const handleComplete = useCallback(async (taskName: string) => {
    try { await completeTask(taskName); } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to complete");
    }
  }, [completeTask]);

  const handleCancel = useCallback((taskName: string) => {
    Alert.alert("Cancel Task", `Cancel "${taskName}"?`, [
      { text: "No", style: "cancel" },
      { text: "Yes", style: "destructive", onPress: async () => {
        try { await cancelTask(taskName); } catch (e: unknown) {
          Alert.alert("Error", e instanceof Error ? e.message : "Failed to cancel");
        }
      }},
    ]);
  }, [cancelTask]);

  const renderItem = useCallback(
    ({ item, index }: { item: LogEntry; index: number }) => (
      <MemoizedTaskCard entry={item} onComplete={handleComplete} onCancel={handleCancel} index={index} />
    ),
    [handleComplete, handleCancel]
  );

  const keyExtractor = useCallback((item: LogEntry, index: number) => item.assignmentId || `entry_${index}`, []);

  if (!selectedCollector) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.bg }]}>
        <Inbox size={44} color={colors.border} />
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Collector Selected</Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Set your profile in the Tools tab first</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.brandText, { color: colors.accent, fontFamily: FONT_MONO }]}>TASKS</Text>
            <Text style={[styles.brandSub, { color: colors.textMuted, fontFamily: FONT_MONO }]}>
              {selectedCollector.name.split(" ")[0]}{selectedRig ? ` · ${selectedRig}` : ""}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.searchBtn, {
                backgroundColor: showSearch ? colors.accentSoft : colors.bgCard,
                borderColor: showSearch ? colors.accentDim : colors.border,
              }]}
              onPress={toggleSearch}
              activeOpacity={0.7}
              testID="search-toggle"
            >
              {showSearch ? <X size={16} color={colors.accent} /> : <Search size={16} color={colors.textMuted} />}
            </TouchableOpacity>
            <View style={styles.headerStats}>
              <View style={[styles.headerStatPill, { backgroundColor: colors.accentSoft }]}>
                <Text style={[styles.headerStatNum, { color: colors.accent }]}>{openTasks.length}</Text>
                <Text style={[styles.headerStatLabel, { color: colors.accentLight }]}>open</Text>
              </View>
              <View style={[styles.headerStatPill, { backgroundColor: colors.completeBg }]}>
                <Text style={[styles.headerStatNum, { color: colors.complete }]}>{completedCount}</Text>
                <Text style={[styles.headerStatLabel, { color: colors.complete + "88" }]}>done</Text>
              </View>
            </View>
          </View>
        </View>

        {showSearch && (
          <Animated.View style={[styles.searchWrap, {
            opacity: searchAnim,
            maxHeight: searchAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 50] }),
          }]}>
            <View style={[styles.searchBar, { backgroundColor: colors.bgInput, borderColor: colors.border }]}>
              <Search size={14} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search tasks..."
                placeholderTextColor={colors.textMuted}
                autoFocus
                testID="task-search-input"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
                  <X size={14} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        )}
      </View>

      {todayLog.length > 0 && (
        <View style={[styles.progressBar, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={styles.progressLabelRow}>
            <Text style={[styles.progressLabel, { color: colors.textMuted }]}>Daily Progress</Text>
            <Text style={[styles.progressPct, { color: colors.accent }]}>{completionPct}%</Text>
          </View>
          <View style={[styles.progressTrackFull, { backgroundColor: colors.bgInput }]}>
            <View style={[styles.progressFillFull, { backgroundColor: colors.accent, width: `${completionPct}%` as any }]} />
          </View>
        </View>
      )}

      <FlatList
        data={filteredLog}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} colors={[colors.accent]} />}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <Text style={[styles.emptyListText, { color: colors.textSecondary }]}>
              {searchQuery ? "No matching tasks" : "No tasks today"}
            </Text>
            <Text style={[styles.emptyListSub, { color: colors.textMuted }]}>
              {searchQuery ? "Try a different search" : "Assign a task from the Collect tab"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10, borderBottomWidth: 1 },
  headerTop: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "flex-start" as const },
  brandText: { fontSize: 22, fontWeight: "900" as const, letterSpacing: 4 },
  brandSub: { fontSize: 9, letterSpacing: 1, marginTop: 2 },
  headerRight: { alignItems: "flex-end" as const, gap: 8 },
  searchBtn: {
    width: 34, height: 34, borderRadius: 10, borderWidth: 1,
    alignItems: "center" as const, justifyContent: "center" as const,
  },
  headerStats: { flexDirection: "row" as const, gap: 6 },
  headerStatPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignItems: "center" as const },
  headerStatNum: { fontSize: 14, fontWeight: "700" as const },
  headerStatLabel: { fontSize: 9, fontWeight: "600" as const, marginTop: 1 },
  searchWrap: { marginTop: 10, overflow: "hidden" as const },
  searchBar: {
    flexDirection: "row" as const, alignItems: "center" as const,
    paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 10 },
  progressBar: { marginHorizontal: 20, marginBottom: 12, borderRadius: 10, padding: 10, borderWidth: 1 },
  progressLabelRow: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const, marginBottom: 6 },
  progressLabel: { fontSize: 11, fontWeight: "600" as const },
  progressPct: { fontSize: 12, fontWeight: "700" as const },
  progressTrackFull: { height: 4, borderRadius: 2, overflow: "hidden" as const },
  progressFillFull: { height: 4, borderRadius: 2 },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTop: { flexDirection: "row" as const, alignItems: "flex-start" as const, marginBottom: 10, gap: 8 },
  statusStripe: { width: 3, borderRadius: 2, minHeight: 24, marginTop: 2 },
  cardTitleWrap: { flex: 1 },
  cardTitle: { fontSize: 13, fontWeight: "600" as const, lineHeight: 18 },
  statusTag: { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, marginTop: 1 },
  statusTagText: { fontSize: 10, fontWeight: "600" as const },
  progressRow: { marginBottom: 6 },
  progressTrack: { height: 3, borderRadius: 2, overflow: "hidden" as const, marginBottom: 5 },
  progressFill: { height: 3, borderRadius: 2 },
  hoursRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 4 },
  hoursText: { fontSize: 11, fontWeight: "500" as const },
  remainText: { fontSize: 11, fontWeight: "500" as const },
  notesText: { fontSize: 11, lineHeight: 15, fontStyle: "italic" as const, marginBottom: 8 },
  actionsBar: { flexDirection: "row" as const, borderTopWidth: 1, paddingTop: 10, gap: 8 },
  actionBtn: {
    flex: 1, flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const,
    gap: 5, paddingVertical: 7, borderRadius: 8,
  },
  actionBtnText: { fontSize: 12, fontWeight: "600" as const },
  empty: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, padding: 40, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: "600" as const },
  emptyText: { fontSize: 14, textAlign: "center" as const },
  emptyList: { alignItems: "center" as const, paddingTop: 60, gap: 6 },
  emptyListText: { fontSize: 15, fontWeight: "600" as const },
  emptyListSub: { fontSize: 13, textAlign: "center" as const },
});
