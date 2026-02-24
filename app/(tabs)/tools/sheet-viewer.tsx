import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { RefreshCw, AlertCircle, CheckCircle2, Clock, ArrowUpDown, RotateCcw, Activity } from "lucide-react-native";
import { useTheme } from "../../../providers/ThemeProvider";
import { useCollection } from "../../../providers/CollectionProvider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchFullLog,
  fetchTaskActualsData,
  fetchAdminDashboardData,
  fetchTodayLog,
  fetchRecollections,
} from "../../../services/googleSheets";
import type { FullLogEntry, TaskActualRow, AdminDashboardData } from "../../../types";

function StatusBadge({ status, colors }: { status: string; colors: any }) {
  const upper = status.toUpperCase();
  const isComplete = upper === "COMPLETED" || upper === "DONE";
  const isCanceled = upper === "CANCELED";
  const isRecollect = upper === "RECOLLECT";
  const isPartial = upper === "PARTIAL";
  const isProgress = upper === "IN PROGRESS" || upper === "IN_PROGRESS";

  const bg = isComplete ? colors.completeBg
    : isCanceled ? colors.cancelBg
    : isRecollect ? colors.cancel + "18"
    : isPartial ? colors.statusPending + "18"
    : isProgress ? colors.accentSoft
    : colors.bgInput;

  const fg = isComplete ? colors.complete
    : isCanceled ? colors.cancel
    : isRecollect ? colors.cancel
    : isPartial ? colors.statusPending
    : isProgress ? colors.accent
    : colors.textMuted;

  return (
    <View style={[badgeStyles.badge, { backgroundColor: bg }]}>
      <Text style={[badgeStyles.text, { color: fg }]}>{status || "—"}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  text: { fontSize: 10, fontWeight: "700" as const, letterSpacing: 0.3 },
});

function LoadingState({ colors, message }: { colors: any; message: string }) {
  return (
    <View style={viewStyles.center}>
      <ActivityIndicator color={colors.accent} size="large" />
      <Text style={[viewStyles.loadingText, { color: colors.textMuted }]}>{message}</Text>
    </View>
  );
}

function ErrorState({ colors, message, onRetry }: { colors: any; message: string; onRetry: () => void }) {
  return (
    <View style={viewStyles.center}>
      <AlertCircle size={32} color={colors.cancel} />
      <Text style={[viewStyles.errorTitle, { color: colors.textPrimary }]}>Failed to load</Text>
      <Text style={[viewStyles.errorText, { color: colors.textMuted }]}>{message}</Text>
      <TouchableOpacity
        style={[viewStyles.retryBtn, { backgroundColor: colors.accentSoft }]}
        onPress={onRetry}
        activeOpacity={0.7}
      >
        <RotateCcw size={14} color={colors.accent} />
        <Text style={[viewStyles.retryText, { color: colors.accent }]}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState({ colors, message }: { colors: any; message: string }) {
  return (
    <View style={viewStyles.center}>
      <Text style={[viewStyles.emptyText, { color: colors.textMuted }]}>{message}</Text>
    </View>
  );
}

function AssignmentLogView({ collectorName, configured }: { collectorName: string; configured: boolean }) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const logQuery = useQuery({
    queryKey: ["fullLog", collectorName],
    queryFn: () => fetchFullLog(collectorName || undefined),
    enabled: configured,
    staleTime: 30000,
    retry: 2,
  });

  const todayLogQuery = useQuery({
    queryKey: ["todayLog", collectorName],
    queryFn: () => fetchTodayLog(collectorName),
    enabled: configured && !!collectorName,
    staleTime: 30000,
  });

  const entries = logQuery.data ?? [];
  const todayEntries = todayLogQuery.data ?? [];
  const displayEntries = entries.length > 0 ? entries : todayEntries.map((e) => ({
    collector: collectorName,
    taskName: e.taskName,
    status: e.status,
    loggedHours: e.loggedHours,
    plannedHours: e.plannedHours,
    remainingHours: e.remainingHours,
    assignedDate: e.assignedDate,
  }));

  if (logQuery.isLoading && todayLogQuery.isLoading) {
    return <LoadingState colors={colors} message="Loading assignment log..." />;
  }

  if (logQuery.isError && todayLogQuery.isError) {
    return (
      <ErrorState
        colors={colors}
        message={logQuery.error?.message ?? "Unknown error"}
        onRetry={() => {
          queryClient.invalidateQueries({ queryKey: ["fullLog"] });
          queryClient.invalidateQueries({ queryKey: ["todayLog"] });
        }}
      />
    );
  }

  if (!displayEntries.length) {
    return <EmptyState colors={colors} message={collectorName ? `No log entries found for ${collectorName}` : "Select a collector in Tools to see your log"} />;
  }

  return (
    <View style={viewStyles.list}>
      <Text style={[viewStyles.countLabel, { color: colors.textMuted }]}>
        {displayEntries.length} {displayEntries.length === 1 ? "entry" : "entries"}
      </Text>
      {displayEntries.map((entry, idx) => (
        <View
          key={`log_${idx}`}
          style={[viewStyles.entryCard, { backgroundColor: colors.bgCard, borderColor: colors.border, shadowColor: colors.shadow }]}
        >
          <View style={viewStyles.entryTop}>
            <Text style={[viewStyles.taskName, { color: colors.textPrimary }]} numberOfLines={2}>
              {entry.taskName}
            </Text>
            <StatusBadge status={entry.status} colors={colors} />
          </View>
          <View style={viewStyles.entryMeta}>
            {entry.collector ? (
              <Text style={[viewStyles.metaChip, { color: colors.accent, backgroundColor: colors.accentSoft }]}>
                {entry.collector}
              </Text>
            ) : null}
            <Text style={[viewStyles.metaText, { color: colors.textSecondary }]}>
              {entry.loggedHours}h / {entry.plannedHours}h
            </Text>
            {entry.remainingHours > 0 && (
              <Text style={[viewStyles.metaText, { color: colors.statusPending }]}>
                {entry.remainingHours}h left
              </Text>
            )}
          </View>
          {entry.assignedDate ? (
            <Text style={[viewStyles.dateText, { color: colors.textMuted }]}>{entry.assignedDate}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function TaskActualsView({ configured }: { configured: boolean }) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const taskQuery = useQuery({
    queryKey: ["taskActualsSheet"],
    queryFn: fetchTaskActualsData,
    enabled: configured,
    staleTime: 60000,
    retry: 2,
  });

  const tasks = taskQuery.data ?? [];

  const grouped = useMemo(() => {
    const done: TaskActualRow[] = [];
    const active: TaskActualRow[] = [];
    const recollect: TaskActualRow[] = [];
    const other: TaskActualRow[] = [];

    for (const t of tasks) {
      const st = t.status.toUpperCase();
      if (st === "DONE") done.push(t);
      else if (st === "RECOLLECT") recollect.push(t);
      else if (st === "IN_PROGRESS") active.push(t);
      else other.push(t);
    }
    return { recollect, active, other, done };
  }, [tasks]);

  if (taskQuery.isLoading) {
    return <LoadingState colors={colors} message="Loading task actuals..." />;
  }

  if (taskQuery.isError) {
    return (
      <ErrorState
        colors={colors}
        message={taskQuery.error?.message ?? "Add getTaskActualsSheet endpoint to your Apps Script and redeploy"}
        onRetry={() => queryClient.invalidateQueries({ queryKey: ["taskActualsSheet"] })}
      />
    );
  }

  if (!tasks.length) {
    return <EmptyState colors={colors} message="No task actuals data available" />;
  }

  return (
    <View style={viewStyles.list}>
      <View style={[viewStyles.summaryRow, { borderColor: colors.border }]}>
        <SummaryChip label="Total" value={String(tasks.length)} color={colors.textPrimary} bg={colors.bgInput} />
        <SummaryChip label="Active" value={String(grouped.active.length)} color={colors.accent} bg={colors.accentSoft} />
        <SummaryChip label="Recollect" value={String(grouped.recollect.length)} color={colors.cancel} bg={colors.cancelBg} />
        <SummaryChip label="Done" value={String(grouped.done.length)} color={colors.complete} bg={colors.completeBg} />
      </View>

      {grouped.recollect.length > 0 && (
        <View style={viewStyles.section}>
          <Text style={[viewStyles.sectionTitle, { color: colors.cancel }]}>RECOLLECT ({grouped.recollect.length})</Text>
          {grouped.recollect.map((t, i) => <TaskRow key={`r_${i}`} task={t} colors={colors} />)}
        </View>
      )}

      {grouped.active.length > 0 && (
        <View style={viewStyles.section}>
          <Text style={[viewStyles.sectionTitle, { color: colors.accent }]}>IN PROGRESS ({grouped.active.length})</Text>
          {grouped.active.map((t, i) => <TaskRow key={`a_${i}`} task={t} colors={colors} />)}
        </View>
      )}

      {grouped.other.length > 0 && (
        <View style={viewStyles.section}>
          <Text style={[viewStyles.sectionTitle, { color: colors.textMuted }]}>OTHER ({grouped.other.length})</Text>
          {grouped.other.map((t, i) => <TaskRow key={`o_${i}`} task={t} colors={colors} />)}
        </View>
      )}

      {grouped.done.length > 0 && (
        <View style={viewStyles.section}>
          <Text style={[viewStyles.sectionTitle, { color: colors.complete }]}>DONE ({grouped.done.length})</Text>
          {grouped.done.map((t, i) => <TaskRow key={`d_${i}`} task={t} colors={colors} />)}
        </View>
      )}
    </View>
  );
}

function TaskRow({ task, colors }: { task: TaskActualRow; colors: any }) {
  return (
    <View style={[viewStyles.taskCard, { backgroundColor: colors.bgCard, borderColor: colors.border, shadowColor: colors.shadow }]}>
      <View style={viewStyles.taskTop}>
        <Text style={[viewStyles.taskName, { color: colors.textPrimary }]} numberOfLines={2}>{task.taskName}</Text>
        <StatusBadge status={task.status} colors={colors} />
      </View>
      <View style={viewStyles.taskStats}>
        <StatChip label="Collected" value={`${task.collectedHours}h`} color={colors.accent} />
        <StatChip label="Good" value={`${task.goodHours}h`} color={colors.complete} />
        <StatChip label="Remaining" value={`${task.remainingHours}h`} color={task.remainingHours > 0 ? colors.statusPending : colors.textMuted} />
      </View>
    </View>
  );
}

function StatChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={viewStyles.statChip}>
      <Text style={[viewStyles.statLabel, { color: color + "99" }]}>{label}</Text>
      <Text style={[viewStyles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

function SummaryChip({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <View style={[viewStyles.sumChip, { backgroundColor: bg }]}>
      <Text style={[viewStyles.sumValue, { color }]}>{value}</Text>
      <Text style={[viewStyles.sumLabel, { color: color + "99" }]}>{label}</Text>
    </View>
  );
}

function AdminDashboardView({ configured }: { configured: boolean }) {
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const adminQuery = useQuery({
    queryKey: ["adminDashboard"],
    queryFn: fetchAdminDashboardData,
    enabled: configured,
    staleTime: 60000,
    retry: 2,
  });

  const recollectQuery = useQuery({
    queryKey: ["recollections"],
    queryFn: fetchRecollections,
    enabled: configured,
    staleTime: 30000,
    retry: 2,
  });

  const isLoading = adminQuery.isLoading && recollectQuery.isLoading;
  const hasAdminData = !!adminQuery.data;
  const recollections = adminQuery.data?.recollections ?? recollectQuery.data ?? [];

  if (isLoading) {
    return <LoadingState colors={colors} message="Loading admin dashboard..." />;
  }

  if (adminQuery.isError && recollectQuery.isError) {
    return (
      <ErrorState
        colors={colors}
        message="Add getAdminDashboardData endpoint to your Apps Script and redeploy"
        onRetry={() => {
          queryClient.invalidateQueries({ queryKey: ["adminDashboard"] });
          queryClient.invalidateQueries({ queryKey: ["recollections"] });
        }}
      />
    );
  }

  const data = adminQuery.data;

  return (
    <View style={viewStyles.list}>
      {hasAdminData && data && (
        <View style={viewStyles.summaryRow}>
          <SummaryChip label="Total" value={String(data.totalTasks)} color={colors.textPrimary} bg={colors.bgInput} />
          <SummaryChip label="Done" value={String(data.completedTasks)} color={colors.complete} bg={colors.completeBg} />
          <SummaryChip label="Active" value={String(data.inProgressTasks)} color={colors.accent} bg={colors.accentSoft} />
          <SummaryChip label="Recollect" value={String(data.recollectTasks)} color={colors.cancel} bg={colors.cancelBg} />
        </View>
      )}

      <View style={[viewStyles.recollectSection, { backgroundColor: colors.bgCard, borderColor: colors.border, shadowColor: colors.shadow }]}>
        <View style={viewStyles.recollectHeader}>
          <Activity size={16} color={colors.cancel} />
          <Text style={[viewStyles.recollectTitle, { color: colors.textPrimary }]}>
            Pending Recollections
          </Text>
          <Text style={[viewStyles.recollectCount, { color: colors.cancel, backgroundColor: colors.cancelBg }]}>
            {recollections.length}
          </Text>
        </View>

        {recollections.length > 0 ? (
          recollections.map((item, idx) => (
            <View
              key={`rec_${idx}`}
              style={[viewStyles.recollectItem, { borderTopColor: colors.border }]}
            >
              <View style={[viewStyles.recollectDot, { backgroundColor: colors.cancel }]} />
              <Text style={[viewStyles.recollectText, { color: colors.textPrimary }]} numberOfLines={2}>
                {item}
              </Text>
            </View>
          ))
        ) : (
          <View style={viewStyles.recollectEmpty}>
            <CheckCircle2 size={20} color={colors.complete} />
            <Text style={[viewStyles.recollectEmptyText, { color: colors.textMuted }]}>
              No pending recollections
            </Text>
          </View>
        )}
      </View>

      {!hasAdminData && (
        <View style={[viewStyles.hintCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[viewStyles.hintTitle, { color: colors.textMuted }]}>
            Want more dashboard data?
          </Text>
          <Text style={[viewStyles.hintText, { color: colors.textMuted }]}>
            Add <Text style={{ fontWeight: "700" as const, color: colors.textSecondary }}>getAdminDashboardData</Text> endpoint to your Apps Script and redeploy to see task summary stats.
          </Text>
        </View>
      )}
    </View>
  );
}

export default function SheetViewerScreen() {
  const { colors } = useTheme();
  const { sheetId = "log", title = "Data" } = useLocalSearchParams<{ sheetId?: string; title?: string }>();
  const { selectedCollectorName, configured } = useCollection();
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(() => {
    console.log("[SheetViewer] Refreshing:", sheetId);
    if (sheetId === "log") {
      queryClient.invalidateQueries({ queryKey: ["fullLog"] });
      queryClient.invalidateQueries({ queryKey: ["todayLog"] });
    } else if (sheetId === "taskActuals") {
      queryClient.invalidateQueries({ queryKey: ["taskActualsSheet"] });
    } else if (sheetId === "admin") {
      queryClient.invalidateQueries({ queryKey: ["adminDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["recollections"] });
    }
  }, [sheetId, queryClient]);

  return (
    <View style={[pageStyles.container, { backgroundColor: colors.bg }]}>
      <Stack.Screen
        options={{
          title: title as string,
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
          headerRight: () => (
            <TouchableOpacity onPress={handleRefresh} style={pageStyles.headerBtn} activeOpacity={0.7}>
              <RefreshCw size={18} color={colors.accent} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={pageStyles.scroll}
        contentContainerStyle={pageStyles.content}
        showsVerticalScrollIndicator={false}
      >
        {sheetId === "log" && (
          <AssignmentLogView collectorName={selectedCollectorName} configured={configured} />
        )}
        {sheetId === "taskActuals" && (
          <TaskActualsView configured={configured} />
        )}
        {sheetId === "admin" && (
          <AdminDashboardView configured={configured} />
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const viewStyles = StyleSheet.create({
  center: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingVertical: 60,
    gap: 10,
  },
  loadingText: { fontSize: 14 },
  errorTitle: { fontSize: 16, fontWeight: "700" as const, marginTop: 4 },
  errorText: { fontSize: 13, textAlign: "center" as const, maxWidth: 280 },
  retryBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 8,
  },
  retryText: { fontSize: 14, fontWeight: "600" as const },
  emptyText: { fontSize: 14, textAlign: "center" as const },
  list: { gap: 12 },
  countLabel: { fontSize: 12, marginBottom: 4 },
  entryCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  entryTop: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 8,
    marginBottom: 8,
  },
  taskName: { flex: 1, fontSize: 14, fontWeight: "600" as const, lineHeight: 18 },
  entryMeta: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    flexWrap: "wrap" as const,
  },
  metaChip: {
    fontSize: 11,
    fontWeight: "600" as const,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: "hidden" as const,
  },
  metaText: { fontSize: 12, fontWeight: "500" as const },
  dateText: { fontSize: 11, marginTop: 6 },
  summaryRow: {
    flexDirection: "row" as const,
    gap: 8,
    marginBottom: 4,
  },
  sumChip: {
    flex: 1,
    alignItems: "center" as const,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 2,
  },
  sumValue: { fontSize: 18, fontWeight: "800" as const },
  sumLabel: { fontSize: 10, fontWeight: "600" as const, letterSpacing: 0.3 },
  section: { gap: 8 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 1.2,
    marginTop: 4,
  },
  taskCard: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  taskTop: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 8,
    marginBottom: 8,
  },
  taskStats: {
    flexDirection: "row" as const,
    gap: 12,
  },
  statChip: { gap: 1 },
  statLabel: { fontSize: 10, fontWeight: "500" as const },
  statValue: { fontSize: 14, fontWeight: "700" as const },
  recollectSection: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden" as const,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  recollectHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  recollectTitle: { flex: 1, fontSize: 15, fontWeight: "700" as const },
  recollectCount: {
    fontSize: 12,
    fontWeight: "700" as const,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: "hidden" as const,
  },
  recollectItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  recollectDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  recollectText: { flex: 1, fontSize: 14, lineHeight: 18 },
  recollectEmpty: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopWidth: 0,
    justifyContent: "center" as const,
  },
  recollectEmptyText: { fontSize: 14 },
  hintCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginTop: 4,
  },
  hintTitle: { fontSize: 13, fontWeight: "600" as const, marginBottom: 6 },
  hintText: { fontSize: 12, lineHeight: 17 },
});

const pageStyles = StyleSheet.create({
  container: { flex: 1 },
  headerBtn: { padding: 8 },
  scroll: { flex: 1 },
  content: { padding: 16 },
});
