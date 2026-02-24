import React, { useMemo, useCallback, useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Animated,
  TouchableOpacity,
} from "react-native";
import {
  UserCheck,
  CheckCircle,
  XCircle,
  StickyNote,
  AlertCircle,
  Circle,
  Info,
} from "lucide-react-native";
import { useCollection } from "../../providers/CollectionProvider";
import { useTheme } from "../../providers/ThemeProvider";
import SelectPicker from "../../components/SelectPicker";
import ActionButton from "../../components/ActionButton";

export default function DashboardScreen() {
  const { colors, isDark } = useTheme();
  const {
    configured,
    collectors,
    tasks,
    selectedCollectorName,
    selectedCollector,
    selectedRig,
    selectedTaskName,
    hoursToLog,
    notes,
    openTasks,
    todayLog,
    isLoadingCollectors,
    collectorsError,
    tasksError,
    isLoadingTasks,
    isLoadingLog,
    isSubmitting,
    submitError,
    selectCollector,
    setSelectedTaskName,
    setHoursToLog,
    setNotes,
    assignTask,
    completeTask,
    cancelTask,
    addNote,
    refreshData,
  } = useCollection();

  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, speed: 18, bounciness: 5, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const collectorOptions = useMemo(
    () => collectors.map((c) => {
      const sfRigs = c.rigs.filter((r) => /^EGO-PROD-(2|3|4|5|6|9)$/i.test(r.trim()));
      const loc = sfRigs.length === c.rigs.length && c.rigs.length > 0
        ? "SF"
        : sfRigs.length === 0 && c.rigs.length > 0
        ? "MX"
        : c.rigs.length > 0
        ? "SF/MX"
        : "";
      const locTag = loc ? ` [${loc}]` : "";
      const rigList = c.rigs.length > 0 ? `  (${c.rigs.join(", ")})` : "";
      return {
        value: c.name,
        label: `${c.name}${locTag}${rigList}`,
      };
    }),
    [collectors]
  );

  const taskOptions = useMemo(
    () => tasks.map((t) => ({ value: t.name, label: t.label })),
    [tasks]
  );

  const canSubmit = !!selectedCollectorName && !!selectedTaskName;
  const latestOpenTask = openTasks.length > 0 ? openTasks[0] : null;

  const plannedHoursHint = latestOpenTask ? latestOpenTask.plannedHours : 0;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    refreshData();
    setTimeout(() => setRefreshing(false), 1200);
  }, [refreshData]);

  const handleAssign = useCallback(async () => {
    try {
      await assignTask();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to assign task";
      Alert.alert("Error", msg);
    }
  }, [assignTask]);

  const handleComplete = useCallback(async () => {
    if (!latestOpenTask) return;
    try {
      await completeTask(latestOpenTask.taskName);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to complete task";
      Alert.alert("Error", msg);
    }
  }, [completeTask, latestOpenTask]);

  const handleCancel = useCallback(async () => {
    if (!latestOpenTask) return;
    Alert.alert("Cancel Task", `Cancel "${latestOpenTask.taskName}"?`, [
      { text: "No", style: "cancel" },
      {
        text: "Yes",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelTask(latestOpenTask.taskName);
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Failed to cancel";
            Alert.alert("Error", msg);
          }
        },
      },
    ]);
  }, [cancelTask, latestOpenTask]);

  const handleAddNote = useCallback(async () => {
    if (!latestOpenTask || !notes.trim()) return;
    try {
      await addNote(latestOpenTask.taskName);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save note";
      Alert.alert("Error", msg);
    }
  }, [addNote, latestOpenTask, notes]);

  const todayStats = useMemo(() => {
    const completed = todayLog.filter((e) => e.status === "Completed").length;
    const totalLogged = todayLog.reduce((s, e) => s + e.loggedHours, 0);
    const totalPlanned = todayLog.reduce((s, e) => s + e.plannedHours, 0);
    return { completed, totalLogged, totalPlanned, total: todayLog.length };
  }, [todayLog]);

  const statusColor = useCallback((status: string) => {
    if (status === "Completed") return colors.statusActive;
    if (status === "Partial") return colors.statusPending;
    if (status === "Canceled") return colors.statusCancelled;
    return colors.accent;
  }, [colors]);

  const cardBg = isDark ? '#1C1C20' : '#FFFFFF';
  const cardBorder = isDark ? '#2A2A30' : '#DDD9CF';

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Animated.View
        style={[
          styles.flex,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        >
          <View style={styles.header}>
            <View>
              <Text style={[styles.greeting, { color: colors.textMuted, fontFamily: "Lexend_600SemiBold" }]}>
                {configured ? "Collection Hub" : "Offline Mode"}
              </Text>
              <Text style={[styles.title, { color: colors.textPrimary, fontFamily: "Lexend_700Bold" }]}>
                {selectedCollector
                  ? `${selectedCollector.name.split(" ")[0]}'s Workspace`
                  : "Let's Collect"}
              </Text>
              {selectedRig !== "" && (
                <Text style={[styles.rigLabel, { color: colors.textMuted, fontFamily: "Lexend_400Regular" }]}>
                  {selectedRig}
                </Text>
              )}
            </View>
            {openTasks.length > 0 && (
              <View style={[styles.activePill, { backgroundColor: colors.accentSoft, borderColor: colors.accentDim }]}>
                <Circle size={6} color={colors.accent} fill={colors.accent} />
                <Text style={[styles.activePillText, { color: colors.accent, fontFamily: "Lexend_600SemiBold" }]}>
                  {openTasks.length} open
                </Text>
              </View>
            )}
          </View>

          {!configured && (
            <View style={[styles.notice, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <AlertCircle size={15} color={colors.statusPending} />
              <Text style={[styles.noticeText, { color: colors.textSecondary, fontFamily: "Lexend_400Regular" }]}>
                Set EXPO_PUBLIC_GOOGLE_SCRIPT_URL to connect
              </Text>
            </View>
          )}

          {!!submitError && (
            <View style={[styles.notice, { backgroundColor: colors.cancelBg, borderColor: colors.cancel + "30" }]}>
              <AlertCircle size={15} color={colors.cancel} />
              <Text style={[styles.noticeText, { color: colors.cancel, fontFamily: "Lexend_400Regular" }]}>{submitError}</Text>
            </View>
          )}

          {!!collectorsError && (
            <View style={[styles.notice, { backgroundColor: colors.cancelBg, borderColor: colors.cancel + "30" }]}>
              <AlertCircle size={15} color={colors.cancel} />
              <Text style={[styles.noticeText, { color: colors.cancel, fontFamily: "Lexend_400Regular" }]}>Collectors failed: {collectorsError}</Text>
            </View>
          )}

          {!!tasksError && (
            <View style={[styles.notice, { backgroundColor: colors.cancelBg, borderColor: colors.cancel + "30" }]}>
              <AlertCircle size={15} color={colors.cancel} />
              <Text style={[styles.noticeText, { color: colors.cancel, fontFamily: "Lexend_400Regular" }]}>Tasks failed: {tasksError}</Text>
            </View>
          )}

          {selectedCollectorName !== "" && todayLog.length > 0 && (
            <View style={[styles.statsRow, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: colors.textPrimary, fontFamily: "Lexend_700Bold" }]}>{todayStats.total}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted, fontFamily: "Lexend_400Regular" }]}>Tasks</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: colors.complete, fontFamily: "Lexend_700Bold" }]}>{todayStats.completed}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted, fontFamily: "Lexend_400Regular" }]}>Done</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: colors.accent, fontFamily: "Lexend_700Bold" }]}>{todayStats.totalLogged.toFixed(1)}h</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted, fontFamily: "Lexend_400Regular" }]}>Logged</Text>
              </View>
            </View>
          )}

          {latestOpenTask && (
            <View style={[styles.activeTaskBanner, { backgroundColor: colors.accentSoft, borderColor: colors.accentDim }]}>
              <Circle size={7} color={colors.accent} fill={colors.accent} />
              <View style={styles.activeTaskInfo}>
                <Text style={[styles.activeTaskName, { color: colors.accent, fontFamily: "Lexend_700Bold" }]} numberOfLines={1}>
                  {latestOpenTask.taskName}
                </Text>
                <Text style={[styles.activeTaskMeta, { color: colors.accentLight, fontFamily: "Lexend_400Regular" }]}>
                  In Progress · {latestOpenTask.loggedHours}h / {latestOpenTask.plannedHours}h planned
                </Text>
              </View>
            </View>
          )}

          <View style={[styles.formCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            {!selectedCollectorName && (
              <View style={styles.formField}>
                <View style={styles.fieldRow}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontFamily: "Lexend_700Bold" }]}>Collector</Text>
                  {isLoadingCollectors && <ActivityIndicator size="small" color={colors.accent} />}
                </View>
                <SelectPicker
                  label=""
                  options={collectorOptions}
                  selectedValue={selectedCollectorName}
                  onValueChange={selectCollector}
                  placeholder="Who are you? (set in Tools)"
                  testID="collector-picker"
                />
                <View style={[styles.separator, { backgroundColor: colors.border }]} />
              </View>
            )}

            <View style={styles.formField}>
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontFamily: "Lexend_700Bold" }]}>Task</Text>
                {isLoadingTasks && <ActivityIndicator size="small" color={colors.accent} />}
              </View>
              <SelectPicker
                label=""
                options={taskOptions}
                selectedValue={selectedTaskName}
                onValueChange={setSelectedTaskName}
                placeholder="Choose a task..."
                testID="task-picker"
                searchable
                searchPlaceholder="Search tasks..."
              />
            </View>

            <View style={[styles.separator, { backgroundColor: colors.border }]} />

            <View style={styles.formField}>
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontFamily: "Lexend_700Bold" }]}>Hours</Text>
                <Text style={[styles.optionalTag, { color: colors.textMuted, fontFamily: "Lexend_400Regular" }]}>optional</Text>
              </View>
              <TextInput
                style={[styles.input, {
                  backgroundColor: colors.bgInput,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                  fontFamily: "Lexend_500Medium",
                }]}
                value={hoursToLog}
                onChangeText={setHoursToLog}
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="decimal-pad"
                testID="hours-input"
              />
              {latestOpenTask && plannedHoursHint > 0 && (
                <View style={styles.hintRow}>
                  <Info size={11} color={colors.statusPending} />
                  <Text style={[styles.hintText, { color: colors.statusPending, fontFamily: "Lexend_400Regular" }]}>
                    Planned chunk: {plannedHoursHint}h — you can log more if needed
                  </Text>
                </View>
              )}
            </View>

            <View style={[styles.separator, { backgroundColor: colors.border }]} />

            <View style={styles.formField}>
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontFamily: "Lexend_700Bold" }]}>Notes</Text>
                <Text style={[styles.optionalTag, { color: colors.textMuted, fontFamily: "Lexend_400Regular" }]}>optional</Text>
              </View>
              <TextInput
                style={[styles.input, styles.notesInput, {
                  backgroundColor: colors.bgInput,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                  fontFamily: "Lexend_400Regular",
                }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                testID="notes-input"
              />
            </View>
          </View>

          <View style={styles.actionsRow}>
            <ActionButton
              title="Assign"
              icon={<UserCheck size={16} color={colors.assign} />}
              color={colors.assign}
              bgColor={colors.assignBg}
              onPress={handleAssign}
              disabled={!canSubmit || isSubmitting}
              loading={isSubmitting}
              testID="assign-btn"
            />
            <ActionButton
              title="Done"
              icon={<CheckCircle size={16} color={colors.complete} />}
              color={colors.complete}
              bgColor={colors.completeBg}
              onPress={handleComplete}
              disabled={!latestOpenTask || isSubmitting}
              loading={isSubmitting}
              testID="complete-btn"
            />
            <ActionButton
              title="Cancel"
              icon={<XCircle size={16} color={colors.cancel} />}
              color={colors.cancel}
              bgColor={colors.cancelBg}
              onPress={handleCancel}
              disabled={!latestOpenTask || isSubmitting}
              loading={isSubmitting}
              testID="cancel-btn"
            />
          </View>

          {latestOpenTask !== null && notes.trim().length > 0 && (
            <ActionButton
              title="Save Note Only"
              icon={<StickyNote size={16} color={colors.accent} />}
              color={colors.accent}
              bgColor={colors.accentSoft}
              onPress={handleAddNote}
              disabled={isSubmitting}
              loading={isSubmitting}
              fullWidth
              testID="note-btn"
            />
          )}

          {todayLog.length > 0 && (
            <View style={[styles.logSection, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Text style={[styles.logTitle, { color: colors.textMuted, fontFamily: "Lexend_700Bold" }]}>
                {"Today's Log"}
              </Text>
              {isLoadingLog && (
                <ActivityIndicator size="small" color={colors.accent} style={{ marginBottom: 8 }} />
              )}
              {todayLog.slice(0, 10).map((entry, idx) => (
                <View
                  key={entry.assignmentId || `log_${idx}`}
                  style={[
                    styles.logItem,
                    { borderBottomColor: colors.border },
                    idx === Math.min(todayLog.length - 1, 9) && styles.logItemLast,
                  ]}
                >
                  <View style={[styles.logDot, { backgroundColor: statusColor(entry.status) }]} />
                  <View style={styles.logInfo}>
                    <Text style={[styles.logName, { color: colors.textPrimary, fontFamily: "Lexend_600SemiBold" }]} numberOfLines={1}>
                      {entry.taskName}
                    </Text>
                    <Text style={[styles.logMeta, { color: colors.textMuted, fontFamily: "Lexend_400Regular" }]}>
                      {entry.status} · {entry.loggedHours}h / {entry.plannedHours}h
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.spacer} />
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    marginBottom: 20,
  },
  greeting: {
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: 3,
    textTransform: "uppercase" as const,
  },
  title: {
    fontSize: 24,
    letterSpacing: -0.6,
  },
  rigLabel: {
    fontSize: 13,
    marginTop: 2,
  },
  activePill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 6,
    borderWidth: 1,
  },
  activePillText: {
    fontSize: 11,
  },
  notice: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    gap: 10,
    borderWidth: 1,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: "row" as const,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  statItem: { flex: 1, alignItems: "center" as const },
  statNum: { fontSize: 20 },
  statLabel: { fontSize: 11, marginTop: 2 },
  statDivider: { width: 1 },
  activeTaskBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
    borderWidth: 1,
  },
  activeTaskInfo: { flex: 1 },
  activeTaskName: { fontSize: 13 },
  activeTaskMeta: { fontSize: 12, marginTop: 1 },
  formCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  formField: { paddingVertical: 2 },
  fieldLabel: { fontSize: 11, marginBottom: 8, letterSpacing: 0.5, textTransform: "uppercase" as const },
  fieldRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 8,
  },
  optionalTag: { fontSize: 11 },
  separator: { height: 1, marginVertical: 12 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
  },
  notesInput: { minHeight: 64, fontSize: 14 },
  hintRow: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 5,
    marginTop: 7,
  },
  hintText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
  },
  actionsRow: {
    flexDirection: "row" as const,
    gap: 8,
    marginBottom: 10,
  },
  logSection: {
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  logTitle: {
    fontSize: 11,
    letterSpacing: 1.2,
    marginBottom: 12,
    textTransform: "uppercase" as const,
  },
  logItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  logItemLast: { borderBottomWidth: 0 },
  logDot: { width: 7, height: 7, borderRadius: 4, marginRight: 12 },
  logInfo: { flex: 1 },
  logName: { fontSize: 14 },
  logMeta: { fontSize: 12, marginTop: 2 },
  spacer: { height: 20 },
});
