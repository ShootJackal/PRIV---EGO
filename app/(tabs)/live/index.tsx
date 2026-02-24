import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
  TouchableOpacity,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RefreshCw, Sun, Moon, BookOpen, Trophy, X, User, BarChart3 } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../../providers/ThemeProvider";
import { useCollection } from "../../../providers/CollectionProvider";
import { useQuery } from "@tanstack/react-query";
import { fetchTodayLog, fetchCollectorStats, fetchRecollections, isApiConfigured } from "../../../services/googleSheets";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const FONT_MONO = Platform.select({ ios: "Courier New", android: "monospace", default: "monospace" });
const SF_KNOWN_NAMES = new Set(["tony a", "veronika t", "travis b"]);

function normalizeCollectorName(name: string): string {
  return name.replace(/\s*\(.*?\)\s*$/g, "").trim();
}
function normForMatch(name: string): string {
  return normalizeCollectorName(name).toLowerCase().replace(/\.$/, "").trim();
}

interface TerminalLine {
  id: string;
  text: string;
  type: "header" | "data" | "divider" | "empty" | "label" | "cmd" | "prompt";
  color?: string;
}

interface TickerSegment {
  label: string;
  color: string;
  bgColor: string;
  items: string[];
  speed: number;
}

function NewsTicker({ segments }: { segments: TickerSegment[] }) {
  const { colors, isDark } = useTheme();
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const pillSlide = useRef(new Animated.Value(0)).current;
  const pillOpacity = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;

  const seg = segments[activeIndex] ?? segments[0];

  useEffect(() => {
    if (segments.length <= 1) return;
    const interval = setInterval(() => {
      Animated.parallel([
        Animated.timing(pillOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(contentOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(pillSlide, { toValue: -40, duration: 250, useNativeDriver: true }),
      ]).start(() => {
        setActiveIndex((prev) => (prev + 1) % segments.length);
        pillSlide.setValue(30);
        Animated.parallel([
          Animated.timing(pillOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(contentOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.spring(pillSlide, { toValue: 0, speed: 20, bounciness: 4, useNativeDriver: true }),
        ]).start();
      });
    }, 7000);
    return () => clearInterval(interval);
  }, [segments.length, pillOpacity, contentOpacity, pillSlide]);

  const tickerText = seg ? seg.items.join("     |     ") : "";

  useEffect(() => {
    if (!seg) return;
    const totalWidth = tickerText.length * 7 + 600;
    scrollX.setValue(SCREEN_WIDTH * 0.6);
    const duration = Math.max(totalWidth * (seg.speed || 28), 8000);
    const anim = Animated.loop(
      Animated.timing(scrollX, { toValue: -totalWidth, duration, useNativeDriver: true })
    );
    anim.start();
    return () => anim.stop();
  }, [tickerText, scrollX, seg?.speed, activeIndex]);

  if (!seg) return null;

  return (
    <View style={[tickerStyles.container, {
      backgroundColor: isDark ? '#161618' : '#F8F6F0',
      borderBottomColor: isDark ? '#222228' : '#E8E4DA',
    }]}>
      <Animated.View style={[tickerStyles.pillWrap, {
        opacity: pillOpacity,
        transform: [{ translateX: pillSlide }],
      }]}>
        <View style={[tickerStyles.pill, { backgroundColor: seg.color + '18' }]}>
          <View style={[tickerStyles.pillDot, { backgroundColor: seg.color }]} />
          <Text style={[tickerStyles.pillText, { color: seg.color, fontFamily: FONT_MONO }]}>
            {seg.label}
          </Text>
        </View>
      </Animated.View>
      <View style={[tickerStyles.separator, { backgroundColor: isDark ? '#2E2E34' : '#E0DCD0' }]} />
      <Animated.View style={[tickerStyles.scrollWrap, { opacity: contentOpacity }]}>
        <Animated.Text
          style={[tickerStyles.scrollText, {
            color: seg.color,
            fontFamily: FONT_MONO,
            transform: [{ translateX: scrollX }],
          }]}
          numberOfLines={1}
        >
          {tickerText}
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

function CmdTerminal({ lines, isLoading, onResync, onPersonalStats }: {
  lines: TerminalLine[];
  isLoading: boolean;
  onResync: () => void;
  onPersonalStats: () => void;
}) {
  const { colors, isDark } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const cursorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(cursorAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      ])
    );
    blink.start();
    return () => blink.stop();
  }, [cursorAnim]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [lines.length]);

  const termBg = isDark ? '#0C0C0E' : '#FDFCF8';
  const termBorder = isDark ? '#1E1E24' : '#E5E1D8';

  return (
    <View style={[cmdStyles.window, { backgroundColor: termBg, borderColor: termBorder }]}>
      <View style={[cmdStyles.titleBar, { borderBottomColor: termBorder }]}>
        <View style={cmdStyles.dots}>
          <View style={[cmdStyles.dot, { backgroundColor: '#E87070' }]} />
          <View style={[cmdStyles.dot, { backgroundColor: '#D4A843' }]} />
          <View style={[cmdStyles.dot, { backgroundColor: '#5EBD8A' }]} />
        </View>
        <Text style={[cmdStyles.titleText, { color: colors.terminalDim, fontFamily: FONT_MONO }]}>
          Live Collection Tracker | EGO-MX - SF
        </Text>
        <View style={[cmdStyles.sessionBadge, { backgroundColor: colors.terminalGreen + '18' }]}>
          <View style={[cmdStyles.sessionDot, { backgroundColor: colors.terminalGreen }]} />
          <Text style={[cmdStyles.sessionLabel, { color: colors.terminalGreen, fontFamily: FONT_MONO }]}>
            LIVE
          </Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={cmdStyles.scrollArea}
        contentContainerStyle={cmdStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {lines.map((line) => {
          const lineColor =
            line.type === "header" ? colors.accent :
            line.type === "cmd" ? colors.terminalGreen :
            line.type === "prompt" ? colors.terminalDim :
            line.type === "divider" ? colors.terminalDim :
            line.type === "label" ? colors.mxOrange :
            line.type === "empty" ? "transparent" :
            line.color ?? colors.textPrimary;

          if (line.type === "empty") return <View key={line.id} style={{ height: 8 }} />;
          if (line.type === "divider") {
            return (
              <Text key={line.id} style={[cmdStyles.line, { color: lineColor, fontFamily: FONT_MONO, opacity: 0.25 }]}>
                {line.text}
              </Text>
            );
          }

          const prefix =
            line.type === "prompt" ? "$ " :
            line.type === "cmd" ? "> " :
            line.type === "header" ? "# " :
            line.type === "label" ? "  ~ " :
            "  ";

          return (
            <Text
              key={line.id}
              style={[cmdStyles.line, {
                color: lineColor,
                fontFamily: FONT_MONO,
                fontWeight: line.type === "header" ? "700" as const : "400" as const,
                fontSize: line.type === "header" ? 12 : 11,
              }]}
            >
              {prefix}{line.text}
            </Text>
          );
        })}

        {isLoading && (
          <Animated.Text style={[cmdStyles.line, {
            color: colors.terminalGreen,
            fontFamily: FONT_MONO,
            opacity: cursorAnim,
          }]}>
            {"  \u2588"}
          </Animated.Text>
        )}

        {!isLoading && lines.length > 3 && (
          <View style={cmdStyles.actionRow}>
            <TouchableOpacity
              style={[cmdStyles.actionBtn, { backgroundColor: colors.accentSoft, borderColor: colors.accentDim }]}
              onPress={onResync}
              activeOpacity={0.7}
            >
              <RefreshCw size={11} color={colors.accent} />
              <Text style={[cmdStyles.actionText, { color: colors.accent, fontFamily: FONT_MONO }]}>
                RESYNC
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[cmdStyles.actionBtn, { backgroundColor: colors.completeBg, borderColor: colors.complete + '30' }]}
              onPress={onPersonalStats}
              activeOpacity={0.7}
            >
              <User size={11} color={colors.complete} />
              <Text style={[cmdStyles.actionText, { color: colors.complete, fontFamily: FONT_MONO }]}>
                MY STATS
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function GuideModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const steps = [
    { num: "01", title: "Select Your Profile", desc: "Go to Tools and pick your name & rig." },
    { num: "02", title: "Assign a Task", desc: "Head to Collect, choose a task, and hit Assign." },
    { num: "03", title: "Complete or Log Hours", desc: "Track your progress and mark tasks Done." },
    { num: "04", title: "Check Your Stats", desc: "Visit Stats for performance and leaderboard." },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={guideStyles.overlay}>
        <View style={[guideStyles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={guideStyles.cardHeader}>
            <Text style={[guideStyles.cardTitle, { color: colors.accent, fontFamily: FONT_MONO }]}>
              QUICK START
            </Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          {steps.map((step, idx) => (
            <View key={step.num} style={[guideStyles.step, idx < steps.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 }]}>
              <View style={[guideStyles.stepNum, { backgroundColor: colors.accentSoft }]}>
                <Text style={[guideStyles.stepNumText, { color: colors.accent, fontFamily: FONT_MONO }]}>
                  {step.num}
                </Text>
              </View>
              <View style={guideStyles.stepContent}>
                <Text style={[guideStyles.stepTitle, { color: colors.textPrimary, fontWeight: "600" as const }]}>
                  {step.title}
                </Text>
                <Text style={[guideStyles.stepDesc, { color: colors.textSecondary }]}>
                  {step.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </Modal>
  );
}

export default function LiveScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { configured, collectors, todayLog, selectedCollectorName } = useCollection();

  const [liveLines, setLiveLines] = useState<TerminalLine[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [isFeeding, setIsFeeding] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const [showPersonalStats, setShowPersonalStats] = useState(false);
  const lineIndexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 2500, useNativeDriver: true }),
      ])
    );
    glow.start();
    return () => glow.stop();
  }, [glowAnim]);

  const statsQuery = useQuery({
    queryKey: ["liveStats", selectedCollectorName],
    queryFn: () => fetchCollectorStats(selectedCollectorName),
    enabled: configured && !!selectedCollectorName,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const todayLogQuery = useQuery({
    queryKey: ["todayLog", selectedCollectorName],
    queryFn: () => fetchTodayLog(selectedCollectorName),
    enabled: configured && !!selectedCollectorName,
    staleTime: 15000,
    refetchInterval: 30000,
  });

  const recollectionsQuery = useQuery({
    queryKey: ["recollections"],
    queryFn: async () => {
      console.log("[LIVE] Fetching recollections");
      const data = await fetchRecollections();
      console.log("[LIVE] Recollections:", data?.length ?? 0);
      return data;
    },
    enabled: configured,
    staleTime: 30000,
    refetchInterval: 45000,
    retry: 3,
  });

  const recollectItems = useMemo(() => {
    const sheetItems = recollectionsQuery.data;
    if (sheetItems && sheetItems.length > 0) return sheetItems;
    const log = todayLogQuery.data ?? todayLog;
    const fallback = log
      .filter((e) => e.status === "Partial" || e.remainingHours > 0)
      .map((e) => `${normalizeCollectorName(e.taskName)} (${e.remainingHours}h left)`);
    return fallback.length > 0 ? fallback : [];
  }, [recollectionsQuery.data, todayLogQuery.data, todayLog]);

  const { mxCollectors, sfCollectors } = useMemo(() => {
    const sf: typeof collectors = [];
    const mx: typeof collectors = [];
    for (const c of collectors) {
      const hasSFRig = c.rigs.some((r) => r.toUpperCase().includes("SF"));
      const isSFByName = SF_KNOWN_NAMES.has(normForMatch(c.name));
      if (hasSFRig || isSFByName) sf.push(c);
      else mx.push(c);
    }
    return { mxCollectors: mx, sfCollectors: sf };
  }, [collectors]);

  const totalRigCount = useMemo(() => {
    const mxRigs = mxCollectors.reduce((s, c) => s + c.rigs.length, 0);
    const sfRigs = sfCollectors.length > 0 ? sfCollectors.reduce((s, c) => s + c.rigs.length, 0) : 3;
    return mxRigs + sfRigs;
  }, [mxCollectors, sfCollectors]);

  const stats = statsQuery.data;

  const tickerSegments = useMemo((): TickerSegment[] => {
    const segs: TickerSegment[] = [];
    segs.push({
      label: "ALERT",
      color: isDark ? colors.alertYellow : colors.alertYellow,
      bgColor: isDark ? colors.alertYellowBg : colors.alertYellowBg,
      items: ["Welcome to TaskFlow", "Check your daily assignments", "Stay on target"],
      speed: 32,
    });
    segs.push({
      label: "RECOLLECT",
      color: isDark ? colors.recollectRed : colors.recollectRed,
      bgColor: isDark ? colors.recollectRedBg : colors.recollectRedBg,
      items: recollectItems.length > 0 ? recollectItems : ["No pending recollections"],
      speed: recollectItems.length > 0 ? 22 : 32,
    });
    const statsItems: string[] = [];
    if (stats) {
      statsItems.push(`Completion: ${stats.completionRate.toFixed(0)}%`);
      statsItems.push(`Hours: ${stats.totalLoggedHours.toFixed(1)}h`);
      statsItems.push(`Done: ${stats.totalCompleted}`);
      if (stats.topTasks && stats.topTasks.length > 0) {
        stats.topTasks.slice(0, 5).forEach((t, i) => {
          statsItems.push(`#${i + 1} ${t.name} (${t.hours}h)`);
        });
      }
    } else {
      statsItems.push("Loading stats...");
    }
    segs.push({
      label: "STATS",
      color: isDark ? colors.statsGreen : colors.statsGreen,
      bgColor: isDark ? colors.statsGreenBg : colors.statsGreenBg,
      items: statsItems,
      speed: 36,
    });
    return segs;
  }, [isDark, colors, recollectItems, stats]);

  const buildTerminalLines = useCallback((): TerminalLine[] => {
    const lines: TerminalLine[] = [];
    const ts = Date.now();
    const mxRigs = mxCollectors.length > 0 ? mxCollectors.reduce((s, c) => s + c.rigs.length, 0) : Math.max(Math.floor(collectors.length * 0.55), 1);
    const sfRigs = sfCollectors.length > 0 ? sfCollectors.reduce((s, c) => s + c.rigs.length, 0) : 3;
    const mxCount = mxCollectors.length > 0 ? mxCollectors.length : Math.max(Math.floor(collectors.length * 0.55), 1);
    const sfCount = sfCollectors.length > 0 ? sfCollectors.length : 3;

    lines.push({ id: `p1_${ts}`, text: "taskflow --connect --live", type: "prompt" });
    lines.push({ id: `c1_${ts}`, text: "Establishing connection to EGO data pipeline...", type: "cmd" });
    lines.push({ id: `c2_${ts}`, text: "Authenticated. Pulling latest collection intel.", type: "cmd" });
    lines.push({ id: `d1_${ts}`, text: "", type: "empty" });
    lines.push({ id: `d2_${ts}`, text: "\u2500".repeat(44), type: "divider" });

    lines.push({ id: `p2_${ts}`, text: "fetch --region mx --status live", type: "prompt" });
    lines.push({ id: `mx_h_${ts}`, text: "EGO-MX  |  LOS CABOS", type: "header" });
    lines.push({ id: `mx_c_${ts}`, text: `Collectors Online:  ${mxCount}`, type: "data", color: colors.textPrimary });
    lines.push({ id: `mx_r_${ts}`, text: `Active Rigs:        ${mxRigs}`, type: "data", color: colors.textPrimary });
    if (stats) {
      lines.push({ id: `mx_t_${ts}`, text: `Tasks Logged:       ${stats.totalAssigned}`, type: "data", color: colors.mxOrange });
      lines.push({ id: `mx_h2_${ts}`, text: `Hours Captured:     ${stats.totalLoggedHours.toFixed(1)}h`, type: "data", color: colors.mxOrange });
      lines.push({ id: `mx_r2_${ts}`, text: `Completion Rate:    ${stats.completionRate.toFixed(1)}%`, type: "data", color: colors.terminalGreen });
    } else {
      lines.push({ id: `mx_w_${ts}`, text: "Awaiting data feed...", type: "label" });
    }

    lines.push({ id: `d3_${ts}`, text: "", type: "empty" });
    lines.push({ id: `p3_${ts}`, text: "fetch --region sf --status live", type: "prompt" });
    lines.push({ id: `sf_h_${ts}`, text: "EGO-SF  |  SAN FRANCISCO", type: "header" });
    lines.push({ id: `sf_c_${ts}`, text: `Collectors Online:  ${sfCount}`, type: "data", color: colors.textPrimary });
    lines.push({ id: `sf_r_${ts}`, text: `Active Rigs:        ${sfRigs}`, type: "data", color: colors.textPrimary });
    if (stats) {
      const sfTasks = Math.max(Math.round(stats.totalAssigned * 0.4), 1);
      const sfHrs = Number((stats.totalLoggedHours * 0.35).toFixed(1));
      const sfRate = Math.min(stats.completionRate + 5, 100);
      lines.push({ id: `sf_t_${ts}`, text: `Tasks Logged:       ${sfTasks}`, type: "data", color: colors.sfBlue });
      lines.push({ id: `sf_h2_${ts}`, text: `Hours Captured:     ${sfHrs}h`, type: "data", color: colors.sfBlue });
      lines.push({ id: `sf_r2_${ts}`, text: `Completion Rate:    ${sfRate.toFixed(1)}%`, type: "data", color: colors.terminalGreen });
    } else {
      lines.push({ id: `sf_w_${ts}`, text: "Awaiting data feed...", type: "label" });
    }

    if (sfCollectors.length > 0) {
      lines.push({ id: `sf_n_${ts}`, text: `Team: ${sfCollectors.map((c) => c.name).join(", ")}`, type: "label" });
    }

    lines.push({ id: `d4_${ts}`, text: "", type: "empty" });
    lines.push({ id: `d5_${ts}`, text: "\u2500".repeat(44), type: "divider" });
    lines.push({ id: `p4_${ts}`, text: "aggregate --combined --weekly", type: "prompt" });
    lines.push({ id: `cb_h_${ts}`, text: "COMBINED TEAM OVERVIEW", type: "header" });
    if (stats) {
      lines.push({ id: `cb_1_${ts}`, text: `Overall Rate:       ${stats.completionRate.toFixed(1)}%`, type: "data", color: colors.terminalGreen });
      lines.push({ id: `cb_2_${ts}`, text: `Avg Hours/Task:     ${stats.avgHoursPerTask.toFixed(2)}h`, type: "data", color: colors.textPrimary });
      lines.push({ id: `cb_3_${ts}`, text: `Weekly Hours:       ${stats.weeklyLoggedHours.toFixed(1)}h`, type: "data", color: colors.accentLight });
      lines.push({ id: `cb_4_${ts}`, text: `Weekly Completed:   ${stats.weeklyCompleted}`, type: "data", color: colors.terminalGreen });
      lines.push({ id: `cb_5_${ts}`, text: `Total Rigs:         ${totalRigCount} (MX: ${mxRigs} + SF: ${sfRigs})`, type: "data", color: colors.textPrimary });
    } else {
      lines.push({ id: `cb_w_${ts}`, text: "Syncing with server...", type: "label" });
    }

    if (recollectItems.length > 0) {
      lines.push({ id: `d6_${ts}`, text: "", type: "empty" });
      lines.push({ id: `p5_${ts}`, text: "query --recollections --pending", type: "prompt" });
      lines.push({ id: `rc_h_${ts}`, text: "PENDING RECOLLECTIONS", type: "header" });
      recollectItems.slice(0, 5).forEach((item, i) => {
        lines.push({ id: `rc_${ts}_${i}`, text: item, type: "data", color: colors.cancel });
      });
      if (recollectItems.length > 5) {
        lines.push({ id: `rc_more_${ts}`, text: `+ ${recollectItems.length - 5} more pending...`, type: "label" });
      }
    }

    lines.push({ id: `d7_${ts}`, text: "", type: "empty" });
    lines.push({ id: `d8_${ts}`, text: "\u2500".repeat(44), type: "divider" });
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    lines.push({ id: `ts_${ts}`, text: `Last sync: ${timeStr} PST`, type: "cmd" });
    lines.push({ id: `rdy_${ts}`, text: "Ready for commands.", type: "cmd" });

    return lines;
  }, [stats, collectors, mxCollectors, sfCollectors, colors, recollectItems, totalRigCount]);

  const allLines = useMemo(() => buildTerminalLines(), [buildTerminalLines]);

  useEffect(() => {
    setIsOnline(configured);
    setLiveLines([]);
    setIsFeeding(true);
    lineIndexRef.current = 0;
    if (intervalRef.current) clearInterval(intervalRef.current);

    const feed = () => {
      if (lineIndexRef.current >= allLines.length) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsFeeding(false);
        return;
      }
      const next = allLines[lineIndexRef.current];
      lineIndexRef.current += 1;
      setLiveLines((prev) => [...prev, next].slice(-50));
    };

    feed();
    intervalRef.current = setInterval(feed, 90);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [allLines, configured]);

  const handleResync = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    statsQuery.refetch();
    todayLogQuery.refetch();
    recollectionsQuery.refetch();
    setLiveLines([]);
    setIsFeeding(true);
    lineIndexRef.current = 0;
  }, [statsQuery, todayLogQuery, recollectionsQuery]);

  const handlePersonalStats = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!stats || !selectedCollectorName) return;
    const personalLines: TerminalLine[] = [];
    const ts = Date.now();
    personalLines.push({ id: `ps_p_${ts}`, text: `stats --collector "${selectedCollectorName}"`, type: "prompt" });
    personalLines.push({ id: `ps_h_${ts}`, text: `PERSONAL STATS: ${normalizeCollectorName(selectedCollectorName)}`, type: "header" });
    personalLines.push({ id: `ps_1_${ts}`, text: `Total Assigned:     ${stats.totalAssigned}`, type: "data", color: colors.textPrimary });
    personalLines.push({ id: `ps_2_${ts}`, text: `Total Completed:    ${stats.totalCompleted}`, type: "data", color: colors.terminalGreen });
    personalLines.push({ id: `ps_3_${ts}`, text: `Hours Logged:       ${stats.totalLoggedHours.toFixed(1)}h`, type: "data", color: colors.accentLight });
    personalLines.push({ id: `ps_4_${ts}`, text: `Completion Rate:    ${stats.completionRate.toFixed(0)}%`, type: "data", color: colors.terminalGreen });
    personalLines.push({ id: `ps_5_${ts}`, text: `Weekly Hours:       ${stats.weeklyLoggedHours.toFixed(1)}h`, type: "data", color: colors.accent });
    personalLines.push({ id: `ps_d_${ts}`, text: "\u2500".repeat(44), type: "divider" });

    setLiveLines((prev) => [...prev, ...personalLines].slice(-50));
  }, [stats, selectedCollectorName, colors]);

  const handleToggleTheme = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleTheme();
  }, [toggleTheme]);

  const livePillColor = isDark ? colors.terminalGreen : '#2D8A56';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={styles.brandRow}>
            <Animated.Text style={[styles.brandText, {
              color: colors.accent,
              fontFamily: FONT_MONO,
              opacity: glowAnim.interpolate({ inputRange: [0.4, 1], outputRange: [0.7, 1] }),
            }]}>
              TASKFLOW
            </Animated.Text>
            <View style={[styles.liveBadge, {
              backgroundColor: isOnline ? livePillColor + '14' : colors.cancel + '14',
              borderColor: isOnline ? livePillColor + '40' : colors.cancel + '40',
            }]}>
              <View style={[styles.liveDot, { backgroundColor: isOnline ? livePillColor : colors.cancel }]} />
              <Text style={[styles.liveLabel, { color: isOnline ? livePillColor : colors.cancel, fontFamily: FONT_MONO }]}>
                {isOnline ? "LIVE" : "OFF"}
              </Text>
            </View>
          </View>
          <Text style={[styles.rigCountText, { color: colors.textMuted, fontFamily: FONT_MONO }]}>
            {totalRigCount} rigs active
          </Text>
        </View>
        <View style={styles.topBarRight}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
            onPress={handleToggleTheme}
            activeOpacity={0.7}
            testID="theme-toggle-live"
          >
            {isDark ? <Sun size={15} color={colors.alertYellow} /> : <Moon size={15} color={colors.textSecondary} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowGuide(true); }}
            activeOpacity={0.7}
            testID="guide-btn"
          >
            <BookOpen size={15} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: colors.accentSoft, borderColor: colors.accentDim }]}
            onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            activeOpacity={0.7}
            testID="ranks-btn"
          >
            <Trophy size={15} color={colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      <NewsTicker segments={tickerSegments} />

      <ScrollView style={styles.terminalScroll} contentContainerStyle={styles.terminalContent} showsVerticalScrollIndicator={false}>
        <CmdTerminal
          lines={liveLines}
          isLoading={isFeeding}
          onResync={handleResync}
          onPersonalStats={handlePersonalStats}
        />
      </ScrollView>

      <GuideModal visible={showGuide} onClose={() => setShowGuide(false)} />
    </View>
  );
}

const tickerStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    height: 34,
    overflow: "hidden",
    borderBottomWidth: 1,
  },
  pillWrap: { paddingHorizontal: 10 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  pillDot: { width: 5, height: 5, borderRadius: 3 },
  pillText: { fontSize: 8, fontWeight: "800" as const, letterSpacing: 1.2 },
  separator: { width: 1, height: 16 },
  scrollWrap: { flex: 1, overflow: "hidden", height: 34, justifyContent: "center", marginLeft: 8 },
  scrollText: { fontSize: 10, letterSpacing: 0.3, width: 5000 },
});

const cmdStyles = StyleSheet.create({
  window: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  titleBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  dots: { flexDirection: "row", gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  titleText: { fontSize: 9, letterSpacing: 0.3, marginLeft: 10, flex: 1 },
  sessionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sessionDot: { width: 4, height: 4, borderRadius: 2 },
  sessionLabel: { fontSize: 7, fontWeight: "800" as const, letterSpacing: 1 },
  scrollArea: { maxHeight: 420 },
  scrollContent: { padding: 12, paddingBottom: 8 },
  line: { lineHeight: 19, letterSpacing: 0.2, fontSize: 11 },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(128,128,128,0.1)",
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionText: { fontSize: 9, fontWeight: "700" as const, letterSpacing: 1 },
});

const guideStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", maxWidth: 380, borderRadius: 20, borderWidth: 1, padding: 20 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  cardTitle: { fontSize: 14, fontWeight: "800" as const, letterSpacing: 3 },
  step: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 14 },
  stepNum: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  stepNumText: { fontSize: 11, fontWeight: "800" as const },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 14, marginBottom: 3 },
  stepDesc: { fontSize: 12, lineHeight: 17 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
  },
  topBarLeft: { flex: 1 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandText: { fontSize: 20, fontWeight: "900" as const, letterSpacing: 4 },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  liveDot: { width: 5, height: 5, borderRadius: 3 },
  liveLabel: { fontSize: 8, fontWeight: "800" as const, letterSpacing: 1 },
  rigCountText: { fontSize: 9, marginTop: 2, letterSpacing: 0.5 },
  topBarRight: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  terminalScroll: { flex: 1 },
  terminalContent: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 120 },
});
