import { useEffect, useState, useCallback, useMemo } from "react";
import { Platform, Alert } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import createContextHook from "@nkzw/create-context-hook";
import {
  Collector,
  Task,
  LogEntry,
  ActivityEntry,
  ActionType,
  SubmitPayload,
  LeaderboardEntry,
} from "@/types";
import {
  fetchCollectors,
  fetchTasks,
  fetchTodayLog,
  submitAction,
  fetchFullLog,
  fetchCATaggedWeekly,
  fetchWeeklyLog,
  isApiConfigured,
} from "@/services/googleSheets";

const STORAGE_KEYS = {
  SELECTED_COLLECTOR: "ci_selected_collector",
  SELECTED_RIG: "ci_selected_rig",
  ACTIVITY: "ci_activity_log",
  ANNOUNCEMENTS: "ci_announcements",
  NOTIFS_SCHEDULED: "ci_notifs_scheduled",
};

function normalizeCollectorName(name: string): string {
  return name.replace(/\s*\(.*?\)\s*$/g, "").trim();
}

const SF_RIG_PATTERN = /^EGO-PROD-(2|3|4|5|6|9)$/i;

const ADMIN_NAMES = new Set(["tony a", "travis b", "veronika t"]);

function isSFRig(rigId: string): boolean {
  return SF_RIG_PATTERN.test(rigId.trim());
}

function getLocationByRigs(rigs: string[]): "SF" | "MX" | "OTHER" {
  if (!rigs || rigs.length === 0) return "OTHER";
  const sfCount = rigs.filter(isSFRig).length;
  const mxCount = rigs.length - sfCount;
  if (sfCount > 0 && mxCount === 0) return "SF";
  if (mxCount > 0 && sfCount === 0) return "MX";
  if (sfCount > 0) return sfCount >= mxCount ? "SF" : "MX";
  return "OTHER";
}

function extractLocationFallback(name: string): "SF" | "MX" | "OTHER" {
  const match = name.match(/\(([^)]+)\)\s*$/);
  if (match) {
    const tag = match[1].toUpperCase().trim();
    if (tag === "SF") return "SF";
    if (tag === "MX") return "MX";
  }
  return "OTHER";
}

function resolveLocations(sitesWorked: Set<"SF" | "MX">): { location: "SF" | "MX" | "BOTH" | "OTHER"; locations: ("SF" | "MX")[] } {
  const hasSF = sitesWorked.has("SF");
  const hasMX = sitesWorked.has("MX");
  if (hasSF && hasMX) return { location: "BOTH", locations: ["SF", "MX"] };
  if (hasSF) return { location: "SF", locations: ["SF"] };
  if (hasMX) return { location: "MX", locations: ["MX"] };
  return { location: "OTHER", locations: [] };
}

function mergeCollectors(raw: Collector[]): Collector[] {
  const map = new Map<string, Collector>();
  for (const c of raw) {
    const key = normalizeCollectorName(c.name);
    if (map.has(key)) {
      const existing = map.get(key)!;
      const merged: Collector = {
        ...existing,
        rigs: Array.from(new Set([...existing.rigs, ...c.rigs])),
      };
      map.set(key, merged);
    } else {
      map.set(key, { ...c, name: key });
    }
  }
  return Array.from(map.values());
}

function getWeekStart(): Date {
  const now = new Date();
  const d = new Date(now);
  const dayOfWeek = d.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  d.setDate(d.getDate() - daysFromMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function scheduleNotifications() {
  if (Platform.OS === "web") return;
  try {
    const already = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFS_SCHEDULED);
    if (already === "v2") return;

    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      console.log("[Notifications] Permission not granted");
      return;
    }

    await Notifications.cancelAllScheduledNotificationsAsync();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "SSD Transfer Reminder",
        body: "End of day! Don't forget to transfer today's collection files to your SSD.",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 17,
        minute: 30,
      },
    });

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Good Morning, Collector",
        body: "Don't forget to assign your first task before starting work!",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 8,
        minute: 30,
      },
    });

    await AsyncStorage.setItem(STORAGE_KEYS.NOTIFS_SCHEDULED, "v2");
    console.log("[Notifications] Scheduled SSD + morning reminders");
  } catch (e) {
    console.log("[Notifications] Setup error:", e);
  }
}

export const [CollectionProvider, useCollection] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [selectedCollectorName, setSelectedCollectorName] = useState<string>("");
  const [selectedRig, setSelectedRigState] = useState<string>("");
  const [selectedTaskName, setSelectedTaskName] = useState<string>("");
  const [hoursToLog, setHoursToLog] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [announcements, setAnnouncementsState] = useState<string[]>([]);

  const configured = isApiConfigured();

  useEffect(() => {
    scheduleNotifications();
  }, []);

  const collectorQuery = useQuery({
    queryKey: ["collectors"],
    queryFn: fetchCollectors,
    enabled: configured,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const taskQuery = useQuery({
    queryKey: ["tasks"],
    queryFn: fetchTasks,
    enabled: configured,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const todayLogQuery = useQuery({
    queryKey: ["todayLog", selectedCollectorName],
    queryFn: () => fetchTodayLog(selectedCollectorName),
    enabled: configured && !!selectedCollectorName,
    refetchInterval: 30000,
    retry: 1,
  });

  const savedCollectorQuery = useQuery({
    queryKey: ["savedCollector"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_COLLECTOR);
      return stored ?? "";
    },
  });

  const savedRigQuery = useQuery({
    queryKey: ["savedRig"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_RIG);
      return stored ?? "";
    },
  });

  const activityQuery = useQuery({
    queryKey: ["activityLocal"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVITY);
      return stored ? (JSON.parse(stored) as ActivityEntry[]) : [];
    },
  });

  const announcementsQuery = useQuery({
    queryKey: ["localAnnouncements"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.ANNOUNCEMENTS);
      return stored ? (JSON.parse(stored) as string[]) : [];
    },
  });

  const leaderboardQuery = useQuery({
    queryKey: ["weeklyLeaderboard"],
    queryFn: async () => {
      console.log("[Provider] Fetching leaderboard — weeklyLog + CATagged + collectors");

      const [weeklyLogEntries, caTaggedEntries, rawCollectors] = await Promise.all([
        fetchWeeklyLog(),
        fetchCATaggedWeekly(),
        fetchCollectors(),
      ]);

      console.log("[Provider] weeklyLog:", weeklyLogEntries.length, "caTagged:", caTaggedEntries.length, "collectors:", rawCollectors.length);

      const mergedCollectors = mergeCollectors(rawCollectors);

      // Build rig-based location fallback from Collectors sheet
      const rigLocationFallback = new Map<string, "SF" | "MX" | "OTHER">();
      for (const c of mergedCollectors) {
        rigLocationFallback.set(c.name.toLowerCase(), getLocationByRigs(c.rigs));
      }

      const caTaggedSites = new Map<string, Set<"SF" | "MX">>();
      const caTaggedHours = new Map<string, number>();
      const caTaggedTasks = new Map<string, number>();
      for (const row of caTaggedEntries) {
        const name = normalizeCollectorName(row.collector);
        const key = name.toLowerCase();
        if (!caTaggedSites.has(key)) caTaggedSites.set(key, new Set());
        caTaggedSites.get(key)!.add(row.site);
        caTaggedHours.set(key, (caTaggedHours.get(key) ?? 0) + (row.hours ?? 0));
        caTaggedTasks.set(key, (caTaggedTasks.get(key) ?? 0) + 1);
      }
      console.log("[Provider] CA_Tagged site coverage:", caTaggedSites.size, "collectors, hours entries:", caTaggedHours.size);

      // Build leaderboard from weeklyLog (our task assignments)
      const collectorMap = new Map<string, {
        hours: number;
        completed: number;
        assigned: number;
        sitesWorked: Set<"SF" | "MX">;
        fallbackLocation: "SF" | "MX" | "OTHER";
      }>();

      for (const entry of weeklyLogEntries) {
        const name = normalizeCollectorName(entry.collector);
        const key = name.toLowerCase();

        if (!collectorMap.has(name)) {
          const fallbackLoc =
            rigLocationFallback.get(key) ??
            (extractLocationFallback(entry.collector) as "SF" | "MX" | "OTHER");
          collectorMap.set(name, {
            hours: 0,
            completed: 0,
            assigned: 0,
            sitesWorked: new Set<"SF" | "MX">(),
            fallbackLocation: fallbackLoc,
          });
        }

        const stats = collectorMap.get(name)!;
        stats.hours += entry.loggedHours;
        stats.assigned += 1;
        if (entry.status === "Completed") stats.completed += 1;

        // Merge CA_Tagged site info into this collector's worked sites
        const caKey = key;
        if (caTaggedSites.has(caKey)) {
          for (const site of caTaggedSites.get(caKey)!) {
            stats.sitesWorked.add(site);
          }
        }
      }

      for (const [key, sites] of caTaggedSites.entries()) {
        const matched = Array.from(collectorMap.keys()).find(n => n.toLowerCase() === key);
        if (!matched) {
          const displayName = normalizeCollectorName(
            rawCollectors.find(c => normalizeCollectorName(c.name).toLowerCase() === key)?.name ?? key
          );
          const fallbackLoc = rigLocationFallback.get(key) ?? "OTHER";
          const ctHours = caTaggedHours.get(key) ?? 0;
          const ctTasks = caTaggedTasks.get(key) ?? 0;
          collectorMap.set(displayName, {
            hours: ctHours,
            completed: ctTasks,
            assigned: ctTasks,
            sitesWorked: sites,
            fallbackLocation: fallbackLoc,
          });
          console.log(`[Leaderboard] CA_Tagged only collector: ${displayName}, hours: ${ctHours}, tasks: ${ctTasks}`);
        } else {
          const stats = collectorMap.get(matched)!;
          for (const site of sites) {
            stats.sitesWorked.add(site);
          }
          console.log(`[Leaderboard] Matched collector: ${matched}, weeklyLog hours: ${stats.hours}, CA_Tagged hours: ${caTaggedHours.get(key) ?? 0}`);
        }
      }

      const entries: LeaderboardEntry[] = Array.from(collectorMap.entries())
        .filter(([, stats]) => stats.hours > 0 || stats.assigned > 0 || stats.sitesWorked.size > 0)
        .map(([name, stats]) => {
          const { location, locations } =
            stats.sitesWorked.size > 0
              ? resolveLocations(stats.sitesWorked)
              : { location: stats.fallbackLocation as "SF" | "MX" | "BOTH" | "OTHER", locations: stats.fallbackLocation !== "OTHER" ? [stats.fallbackLocation as "SF" | "MX"] : [] };
          return {
            collectorName: name,
            weeklyHours: Math.round(stats.hours * 10) / 10,
            weeklyCompleted: stats.completed,
            weeklyAssigned: stats.assigned,
            location,
            locations,
            rank: 0,
          };
        })
        .sort((a, b) => b.weeklyHours - a.weeklyHours)
        .map((e, idx) => ({ ...e, rank: idx + 1 }));

      console.log("[Provider] Leaderboard entries:", entries.length, "BOTH:", entries.filter(e => e.location === "BOTH").length);
      return entries;
    },
    enabled: configured,
    staleTime: 60000,
    retry: 1,
  });

  useEffect(() => {
    if (savedCollectorQuery.data && !selectedCollectorName) {
      setSelectedCollectorName(savedCollectorQuery.data);
    }
  }, [savedCollectorQuery.data, selectedCollectorName]);

  useEffect(() => {
    if (savedRigQuery.data && !selectedRig) {
      setSelectedRigState(savedRigQuery.data);
    }
  }, [savedRigQuery.data, selectedRig]);

  useEffect(() => {
    if (activityQuery.data) {
      setActivity(activityQuery.data);
    }
  }, [activityQuery.data]);

  useEffect(() => {
    if (announcementsQuery.data) {
      setAnnouncementsState(announcementsQuery.data);
    }
  }, [announcementsQuery.data]);

  const collectors = useMemo<Collector[]>(() => {
    const raw = collectorQuery.data ?? [];
    return mergeCollectors(raw);
  }, [collectorQuery.data]);

  const tasks = useMemo<Task[]>(
    () => taskQuery.data ?? [],
    [taskQuery.data]
  );

  const todayLog = useMemo<LogEntry[]>(
    () => todayLogQuery.data ?? [],
    [todayLogQuery.data]
  );

  const openTasks = useMemo(
    () => todayLog.filter((e) => e.status === "In Progress" || e.status === "Partial"),
    [todayLog]
  );

  const selectedCollector = useMemo(
    () => collectors.find((c) => c.name === selectedCollectorName) ?? null,
    [collectors, selectedCollectorName]
  );

  const leaderboard = useMemo<LeaderboardEntry[]>(
    () => leaderboardQuery.data ?? [],
    [leaderboardQuery.data]
  );

  const selectCollector = useCallback(async (name: string) => {
    console.log("[Provider] selectCollector:", name);
    setSelectedCollectorName(name);
    setSelectedTaskName("");
    setSelectedRigState("");
    await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_COLLECTOR, name);
    await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_RIG, "");
  }, []);

  const setSelectedRig = useCallback(async (rig: string) => {
    console.log("[Provider] setSelectedRig:", rig);
    setSelectedRigState(rig);
    await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_RIG, rig);
  }, []);

  const isAdmin = useMemo(() => {
    const name = normalizeCollectorName(selectedCollectorName).toLowerCase();
    return ADMIN_NAMES.has(name);
  }, [selectedCollectorName]);

  const setAnnouncements = useCallback(async (items: string[]) => {
    const name = normalizeCollectorName(selectedCollectorName).toLowerCase();
    if (!ADMIN_NAMES.has(name)) {
      console.log("[Provider] Non-admin tried to set announcements:", name);
      Alert.alert("Not Authorized", "Only team leads can post announcements.");
      return;
    }
    console.log("[Provider] setAnnouncements:", items.length, "items");
    setAnnouncementsState(items);
    await AsyncStorage.setItem(STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(items));
    queryClient.invalidateQueries({ queryKey: ["localAnnouncements"] });
  }, [queryClient, selectedCollectorName]);

  const addActivityEntry = useCallback(
    async (
      action: ActionType,
      taskName: string,
      hours: number,
      planned: number,
      status: string,
      noteText: string
    ) => {
      const entry: ActivityEntry = {
        id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        collectorName: selectedCollectorName,
        taskName,
        action,
        hoursLogged: hours,
        plannedHours: planned,
        status,
        timestamp: Date.now(),
        notes: noteText,
      };
      const updated = [entry, ...activity].slice(0, 200);
      setActivity(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(updated));
    },
    [selectedCollectorName, activity]
  );

  const submitMutation = useMutation({
    mutationFn: async (payload: SubmitPayload) => {
      console.log("[Provider] submitAction:", payload.actionType, payload.task);
      const result = await submitAction(payload);
      return { payload, result };
    },
    onSuccess: async ({ payload, result }) => {
      console.log("[Provider] Submit success:", result.message);
      await addActivityEntry(
        payload.actionType,
        payload.task,
        result.hours ?? payload.hours,
        result.planned ?? 0,
        result.status ?? "",
        payload.notes
      );
      queryClient.invalidateQueries({ queryKey: ["todayLog", selectedCollectorName] });
      queryClient.invalidateQueries({ queryKey: ["collectorStats", selectedCollectorName] });
      queryClient.invalidateQueries({ queryKey: ["weeklyLeaderboard"] });
      setHoursToLog("");
      setNotes("");
      if (payload.actionType === "ASSIGN") {
        setSelectedTaskName("");
      }
    },
  });

  const assignTask = useCallback(async () => {
    if (!selectedCollectorName || !selectedTaskName) {
      throw new Error("Select collector and task first");
    }
    const hours = hoursToLog ? parseFloat(hoursToLog) : 0;
    await submitMutation.mutateAsync({
      collector: selectedCollectorName,
      task: selectedTaskName,
      hours,
      actionType: "ASSIGN",
      notes,
    });
  }, [selectedCollectorName, selectedTaskName, hoursToLog, notes, submitMutation]);

  const completeTask = useCallback(
    async (taskName: string) => {
      if (!selectedCollectorName) throw new Error("No collector selected");
      const hours = hoursToLog ? parseFloat(hoursToLog) : 0;

      const taskInLog = todayLog.find(
        (e) => e.taskName === taskName && (e.status === "In Progress" || e.status === "Partial")
      );
      if (!taskInLog) {
        Alert.alert(
          "Task Not Assigned",
          "This task wasn't formally assigned. Please assign tasks before completing them to keep accurate records.",
          [{ text: "OK" }]
        );
      }

      await submitMutation.mutateAsync({
        collector: selectedCollectorName,
        task: taskName,
        hours,
        actionType: "COMPLETE",
        notes,
      });
    },
    [selectedCollectorName, hoursToLog, notes, submitMutation, todayLog]
  );

  const cancelTask = useCallback(
    async (taskName: string) => {
      if (!selectedCollectorName) throw new Error("No collector selected");
      await submitMutation.mutateAsync({
        collector: selectedCollectorName,
        task: taskName,
        hours: 0,
        actionType: "CANCEL",
        notes,
      });
    },
    [selectedCollectorName, notes, submitMutation]
  );

  const addNote = useCallback(
    async (taskName: string) => {
      if (!selectedCollectorName || !notes.trim()) {
        throw new Error("Select collector and enter notes");
      }
      await submitMutation.mutateAsync({
        collector: selectedCollectorName,
        task: taskName,
        hours: 0,
        actionType: "NOTE_ONLY",
        notes: notes.trim(),
      });
    },
    [selectedCollectorName, notes, submitMutation]
  );

  const refreshData = useCallback(() => {
    console.log("[Provider] Refreshing all data");
    queryClient.invalidateQueries({ queryKey: ["collectors"] });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: ["todayLog", selectedCollectorName] });
    queryClient.invalidateQueries({ queryKey: ["collectorStats", selectedCollectorName] });
    queryClient.invalidateQueries({ queryKey: ["weeklyLeaderboard"] });
  }, [queryClient, selectedCollectorName]);

  return {
    configured,
    collectors,
    tasks,
    todayLog,
    openTasks,
    activity,
    announcements,
    leaderboard,
    isLoadingLeaderboard: leaderboardQuery.isLoading,
    selectedCollectorName,
    selectedCollector,
    selectedRig,
    selectedTaskName,
    hoursToLog,
    notes,

    isAdmin,
    isLoadingCollectors: collectorQuery.isLoading,
    isLoadingTasks: taskQuery.isLoading,
    isLoadingLog: todayLogQuery.isLoading,
    isSubmitting: submitMutation.isPending,
    submitError: submitMutation.error?.message ?? null,

    selectCollector,
    setSelectedRig,
    setSelectedTaskName,
    setHoursToLog,
    setNotes,
    setAnnouncements,
    assignTask,
    completeTask,
    cancelTask,
    addNote,
    refreshData,
  };
});
