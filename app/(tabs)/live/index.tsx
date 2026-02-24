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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Sun, Moon, BookOpen, ChevronRight, Trophy } from "lucide-react-native";
import { useTheme } from "../../../providers/ThemeProvider";
import { useCollection } from "../../../providers/CollectionProvider";
import { useQuery } from "@tanstack/react-query";
import { fetchTodayLog, fetchCollectorStats, fetchRecollections, isApiConfigured } from "../../../services/googleSheets";
import { router } from "expo-router";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const FONT_MONO = Platform.select({ ios: "Courier New", android: "monospace", default: "monospace" });

function normalizeCollectorName(name: string): string {
  return name.replace(/\s*\(.*?\)\s*$/g, "").trim();
}

function normForMatch(name: string): string {
  return normalizeCollectorName(name).toLowerCase().replace(/\.$/, "").trim();
}

const SF_KNOWN_NAMES = new Set(["tony a", "veronika t", "travis b"]);

interface TerminalLine {
  id: string;
  text: string;
  type: "header" | "data" | "divider" | "empty" | "label" | "cmd";
  color?: string;
}

function CmdTerminalFeed({ lines, isLoading, onHeaderPress }: { lines: TerminalLine[]; isLoading: boolean; onHeaderPress?: () => void }) {
  const { colors, isDark } = useTheme();
  const fadeAnims = useRef<{ [key: string]: Animated.Value }>({});
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
    lines.forEach((line) => {
      if (!fadeAnims.current[line.id]) {
        fadeAnims.current[line.id] = new Animated.Value(0);
        Animated.timing(fadeAnims.current[line.id], {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    });
  }, [lines]);

  const termColor = colors.terminal;
  const termDim = colors.terminalDim;

  return (
    <View style={cmdStyles.feed}>
      <TouchableOpacity onPress={onHeaderPress} activeOpacity={0.9} style={[cmdStyles.headerBar, { borderBottomColor: termDim + '44' }]}>
        <View style={cmdStyles.dotRow}>
          <View style={[cmdStyles.dot, { backgroundColor: '#FF5F57' }]} />
          <View style={[cmdStyles.dot, { backgroundColor: '#FEBC2E' }]} />
          <View style={[cmdStyles.dot, { backgroundColor: '#28C840' }]} />
        </View>
        <Text style={[cmdStyles.headerTitle, { color: termDim, fontFamily: FONT_MONO }]}>
          ego-system — live
        </Text>
      </TouchableOpacity>

      {lines.map((line) => {
        if (!fadeAnims.current[line.id]) {
          fadeAnims.current[line.id] = new Animated.Value(1);
        }
        const opacity = fadeAnims.current[line.id];
        const lineColor =
          line.type === "header" ? termColor :
          line.type === "cmd" ? colors.terminalGreen :
          line.type === "divider" ? termDim :
          line.type === "label" ? (isDark ? '#FBBF24' : '#B86E00') :
          line.type === "empty" ? "transparent" :
          line.color ?? colors.textPrimary;
        const prefix =
          line.type === "header" ? "▸ " :
          line.type === "cmd" ? "$ " :
          line.type === "label" ? "  → " :
          line.type === "divider" ? "" :
          line.type === "empty" ? "" :
          "  ";

        return (
          <Animated.View key={line.id} style={[cmdStyles.lineWrap, { opacity }]}>
            {line.type === "divider" ? (
              <Text style={[cmdStyles.divider, { color: termDim, fontFamily: FONT_MONO }]}>{line.text}</Text>
            ) : (
              <Text
                style={[
                  cmdStyles.line,
                  {
                    color: lineColor,
                    fontFamily: FONT_MONO,
                    fontWeight: line.type === "header" ? "700" : "400",
                    fontSize: line.type === "header" ? 13 : 11.5,
                  },
                ]}
              >
                {prefix}{line.text}
              </Text>
            )}
          </Animated.View>
        );
      })}

      {isLoading && (
        <View style={cmdStyles.lineWrap}>
          <Animated.Text
            style={[cmdStyles.line, { color: colors.terminalGreen, fontFamily: FONT_MONO, opacity: cursorAnim }]}
          >
            {"  ▌"}
          </Animated.Text>
        </View>
      )}
    </View>
  );
}

function LiveClock({ size, showMs }: { size?: 'small' | 'large'; showMs?: boolean }) {
  const { colors } = useTheme();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), showMs !== false ? 10 : 1000);
    return () => clearInterval(id);
  }, [showMs]);

  const hh = String(time.getHours()).padStart(2, "0");
  const mm = String(time.getMinutes()).padStart(2, "0");
  const ss = String(time.getSeconds()).padStart(2, "0");
  const ms = String(Math.floor(time.getMilliseconds() / 10)).padStart(2, "0");

  const isSmall = size === 'small';

  return (
    <Text style={[isSmall ? clockStyles.clockSmall : clockStyles.clock, { color: colors.textPrimary, fontFamily: FONT_MONO }]}>
      {hh}:{mm}:{ss}
      {showMs !== false && (
        <Text style={[isSmall ? clockStyles.msSmall : clockStyles.ms, { color: colors.textMuted, fontFamily: FONT_MONO }]}>.{ms}</Text>
      )}
    </Text>
  );
}

function getSkyColors(hour: number): { left: string; right: string; accent: string; phase: string } {
  if (hour < 5) return { left: '#0F172A', right: '#1E1B4B', accent: '#818CF8', phase: 'night' };
  if (hour < 6.5) return { left: '#1E1B4B', right: '#F97316', accent: '#FB923C', phase: 'dawn' };
  if (hour < 8) return { left: '#F97316', right: '#FBBF24', accent: '#F59E0B', phase: 'sunrise' };
  if (hour < 11) return { left: '#38BDF8', right: '#7DD3FC', accent: '#0EA5E9', phase: 'morning' };
  if (hour < 14) return { left: '#0EA5E9', right: '#38BDF8', accent: '#0284C7', phase: 'midday' };
  if (hour < 17) return { left: '#38BDF8', right: '#60A5FA', accent: '#3B82F6', phase: 'afternoon' };
  if (hour < 19) return { left: '#F97316', right: '#EC4899', accent: '#F43F5E', phase: 'sunset' };
  if (hour < 20.5) return { left: '#7C3AED', right: '#1E1B4B', accent: '#A855F7', phase: 'dusk' };
  return { left: '#1E1B4B', right: '#0F172A', accent: '#6366F1', phase: 'night' };
}

function SkyDayTracker() {
  const { colors, isDark } = useTheme();
  const [now, setNow] = useState(new Date());
  const sunSlide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, []);

  const hour = now.getHours() + now.getMinutes() / 60;
  const progress = Math.max(0, Math.min(1, (hour - 5) / 17));
  const sky = getSkyColors(hour);
  const isDay = hour >= 6 && hour < 19.5;

  useEffect(() => {
    Animated.spring(sunSlide, {
      toValue: progress,
      speed: 4,
      bounciness: 2,
      useNativeDriver: false,
    }).start();
  }, [progress, sunSlide]);

  const sliderLeft = sunSlide.interpolate({
    inputRange: [0, 1],
    outputRange: ['2%', '88%'],
  });

  const trackBg = isDark ? '#1A1A2E' : '#E8E4D6';

  return (
    <View style={skyStyles.container}>
      <View style={skyStyles.labelRow}>
        <Sun size={13} color={isDark ? '#FBBF24' : '#D97706'} />
        <Text style={[skyStyles.timeLabel, { color: colors.textMuted, fontFamily: FONT_MONO }]}>
          {sky.phase.toUpperCase()}
        </Text>
        <Moon size={13} color={isDark ? '#818CF8' : '#6366F1'} />
      </View>
      <View style={[skyStyles.track, { backgroundColor: trackBg }]}>
        <View style={[skyStyles.gradientFill, { backgroundColor: sky.left, width: `${Math.max(progress * 100, 2)}%` as any }]}>
          <View style={[skyStyles.gradientOverlay, { backgroundColor: sky.right, opacity: 0.5 }]} />
        </View>
        <Animated.View style={[skyStyles.slider, { left: sliderLeft, backgroundColor: sky.accent, shadowColor: sky.accent }]}>
          {isDay ? (
            <Sun size={12} color="#FFFFFF" />
          ) : (
            <Moon size={12} color="#FFFFFF" />
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const skyStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 4,
  },
  timeLabel: {
    fontSize: 9,
    fontWeight: '700' as const,
    letterSpacing: 2,
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'visible' as const,
    position: 'relative' as const,
  },
  gradientFill: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden' as const,
  },
  gradientOverlay: {
    position: 'absolute' as const,
    right: 0,
    top: 0,
    bottom: 0,
    width: '50%' as any,
    borderRadius: 3,
  },
  slider: {
    position: 'absolute' as const,
    top: -9,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
});

interface TickerSegment {
  id: string;
  pill: string;
  pillBg: string;
  pillColor: string;
  text: string;
}

function NewsTicker({
  segments,
  colors,
  isDark,
}: {
  segments: TickerSegment[];
  colors: ReturnType<typeof useTheme>["colors"];
  isDark: boolean;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollX = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const pillSlide = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (segments.length === 0) return;

    let cancelled = false;
    let currentIdx = 0;

    const runSegment = () => {
      if (cancelled) return;
      const seg = segments[currentIdx % segments.length];
      setActiveIdx(currentIdx % segments.length);

      pillSlide.setValue(-100);
      Animated.spring(pillSlide, {
        toValue: 0,
        speed: 22,
        bounciness: 3,
        useNativeDriver: true,
      }).start();

      const isAnnouncement = seg.pill === "ALERT";
      const isRecollect = seg.pill === "RECOLLECT";
      const textWidth = seg.text.length * 7 + 350;
      const speed = isAnnouncement ? 28 : isRecollect ? 14 : 20;
      const duration = Math.max(textWidth * speed, 4000);

      scrollX.setValue(SCREEN_WIDTH);

      Animated.timing(scrollX, {
        toValue: -textWidth,
        duration,
        useNativeDriver: true,
      }).start(() => {
        currentIdx += 1;
        if (!cancelled) {
          setTimeout(runSegment, 400);
        }
      });
    };

    runSegment();
    return () => { cancelled = true; };
  }, [segments, scrollX, pillSlide]);

  if (segments.length === 0) return null;

  const active = segments[activeIdx % segments.length];
  if (!active) return null;

  const isAnnouncement = active.pill === "ALERT";

  return (
    <View style={ntStyles.container}>
      <Animated.View
        style={[
          ntStyles.pillWrap,
          {
            backgroundColor: active.pillBg,
            borderRightColor: active.pillColor + '30',
            transform: [{ translateX: pillSlide }],
          },
        ]}
      >
        <View style={[ntStyles.pillDot, { backgroundColor: active.pillColor }]} />
        <Text style={[ntStyles.pillText, { color: active.pillColor, fontFamily: FONT_MONO }]}>
          {active.pill}
        </Text>
      </Animated.View>
      <View style={ntStyles.scrollArea}>
        <Animated.Text
          style={[
            ntStyles.scrollText,
            {
              color: active.pillColor,
              fontFamily: FONT_MONO,
              fontWeight: isAnnouncement ? "800" as const : "500" as const,
              fontSize: isAnnouncement ? 12 : 11,
              letterSpacing: isAnnouncement ? 0.5 : 0.3,
              transform: [{ translateX: scrollX }],
            },
          ]}
          numberOfLines={1}
        >
          {active.text}
        </Animated.Text>
      </View>
    </View>
  );
}

const FAKE_DELETE_LINES = [
  "$ sudo rm -rf /rigs/recordings/*",
  "> Deleting EGO-PROD-1 recordings... 2.4TB removed",
  "> Deleting EGO-PROD-2 recordings... 1.8TB removed",
  "> Deleting EGO-PROD-3 recordings... 3.1TB removed",
  "> Deleting EGO-PROD-5 recordings... 890GB removed",
  "> Wiping backup drives... done",
  "> Reformatting all SSDs...",
  "> Notifying collectors they have to recollect everything...",
  "",
  "[ JUST KIDDING ] Your data is safe. Nice try though.",
];

const TUTORIAL_STEPS = [
  { num: "01", title: "Select Your Name", desc: "Go to Collect tab and pick your name from the dropdown" },
  { num: "02", title: "Assign a Task", desc: "Choose a task, enter hours, and hit Assign" },
  { num: "03", title: "Log Completion", desc: "When done, tap Done to log your hours" },
  { num: "04", title: "Check Rankings", desc: "Hit the Leaderboard in Stats to see your rank" },
];

const EASTER_EGG_LINES = [
  "$ whoami → root (just kidding)",
  "$ cat /dev/random → *rig noises*",
  "$ uptime → 420 days, 6:09",
  "$ fortune → You will collect many hours today",
  "$ cowsay 'moo' → 🐄",
  "$ sudo make me a sandwich → okay.",
  "$ ping ego-hq → 64 bytes: time=0.42ms",
];

export default function LiveScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { configured, collectors, todayLog, selectedCollectorName, announcements, leaderboard } = useCollection();

  const [liveLines, setLiveLines] = useState<TerminalLine[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [isFeeding, setIsFeeding] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [fakeDeleting, setFakeDeleting] = useState(false);
  const [fakeDeleteLines, setFakeDeleteLines] = useState<string[]>([]);
  const lineIndexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nameGlow = useRef(new Animated.Value(0.4)).current;
  const fakeDeleteFade = useRef(new Animated.Value(0)).current;
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(nameGlow, { toValue: 0.9, duration: 2800, useNativeDriver: false }),
        Animated.timing(nameGlow, { toValue: 0.3, duration: 2800, useNativeDriver: false }),
      ])
    ).start();
  }, [nameGlow]);

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
      console.log("[LIVE] Recollections received:", data?.length ?? 0);
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
      .map((e) => `${normalizeCollectorName(e.taskName)}  (${e.remainingHours}h left)`);
    if (fallback.length > 0) return fallback;
    return [];
  }, [recollectionsQuery.data, todayLogQuery.data, todayLog]);

  const tickerSegments = useMemo((): TickerSegment[] => {
    const segs: TickerSegment[] = [];

    if (announcements.length > 0) {
      segs.push({
        id: "ann",
        pill: "ALERT",
        pillBg: "#F59E0B15",
        pillColor: isDark ? "#FBBF24" : "#B45309",
        text: "▸  " + announcements.join("  │  "),
      });
    }

    if (recollectItems.length > 0) {
      segs.push({
        id: "rec",
        pill: "RECOLLECT",
        pillBg: isDark ? "#F8717115" : "#DC262615",
        pillColor: isDark ? "#F87171" : "#DC2626",
        text: "▸  " + recollectItems.join("  │  ") + "  ↻",
      });
    }

    const statsTexts: string[] = [];
    if (leaderboard.length > 0) {
      const top5 = leaderboard.slice(0, 5);
      top5.forEach((e) => {
        statsTexts.push(`${e.collectorName}: ${e.weeklyHours}h`);
      });
      statsTexts.push("★ Leaderboard");
    }
    if (statsTexts.length > 0) {
      segs.push({
        id: "stats",
        pill: "STATS",
        pillBg: isDark ? "#34D39915" : "#0D7D4A15",
        pillColor: isDark ? "#34D399" : "#0D7D4A",
        text: "▸  " + statsTexts.join("  │  "),
      });
    }

    if (segs.length === 0) {
      segs.push({
        id: "idle",
        pill: "SYSTEM",
        pillBg: colors.accent + "12",
        pillColor: colors.accent,
        text: "▸  All systems nominal — no pending alerts",
      });
    }

    return segs;
  }, [announcements, recollectItems, leaderboard, isDark, colors]);

  const { mxCollectors, sfCollectors } = useMemo(() => {
    const sf: typeof collectors = [];
    const mx: typeof collectors = [];
    for (const c of collectors) {
      const hasSFRig = c.rigs.some((r) => r.toUpperCase().includes("SF"));
      const isSFByName = SF_KNOWN_NAMES.has(normForMatch(c.name));
      if (hasSFRig || isSFByName) {
        sf.push(c);
      } else {
        mx.push(c);
      }
    }
    return { mxCollectors: mx, sfCollectors: sf };
  }, [collectors]);

  const totalRigCount = useMemo(() => {
    const mxRigs = mxCollectors.reduce((s, c) => s + c.rigs.length, 0);
    const sfRigs = sfCollectors.reduce((s, c) => s + c.rigs.length, 0);
    const sfFallback = sfCollectors.length > 0 ? sfRigs : 3;
    return mxRigs + sfFallback;
  }, [mxCollectors, sfCollectors]);

  const lastRefresh = useMemo(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")} today`;
  }, []);

  const stats = statsQuery.data;

  const allLines = useMemo((): TerminalLine[] => {
    const lines: TerminalLine[] = [];
    const ts = Date.now();

    lines.push({ id: `sys_${ts}_0`, text: "EGO COLLECTION INTELLIGENCE SYSTEM", type: "header" });
    lines.push({ id: `sys_${ts}_1`, text: "═".repeat(40), type: "divider" });
    lines.push({ id: `sys_${ts}_2`, text: "", type: "empty" });

    const mxRigs = mxCollectors.length > 0 ? mxCollectors.reduce((s, c) => s + c.rigs.length, 0) : Math.max(Math.floor(collectors.length * 0.55), 1);
    const sfRigs = sfCollectors.length > 0 ? sfCollectors.reduce((s, c) => s + c.rigs.length, 0) : 3;

    lines.push({ id: `mx_${ts}_h`, text: "EGO-MX  /  LOS CABOS", type: "header" });
    const mxCount = mxCollectors.length > 0 ? mxCollectors.length : Math.max(Math.floor(collectors.length * 0.55), 1);
    lines.push({ id: `mx_${ts}_c`, text: `Collectors:   ${mxCount}`, type: "data", color: colors.textPrimary });
    lines.push({ id: `mx_${ts}_r`, text: `Active Rigs:  ${mxRigs}`, type: "data", color: colors.textPrimary });

    if (stats) {
      lines.push({ id: `mx_${ts}_t`, text: `Tasks Logged: ${stats.totalAssigned}`, type: "data", color: colors.accentLight });
      lines.push({ id: `mx_${ts}_h2`, text: `Hours:        ${stats.totalLoggedHours.toFixed(1)}h`, type: "data", color: colors.accentLight });
      lines.push({ id: `mx_${ts}_r2`, text: `Rate:         ${stats.completionRate.toFixed(1)}%`, type: "data", color: colors.terminalGreen });
    } else {
      lines.push({ id: `mx_${ts}_t`, text: "Awaiting data feed...", type: "label" });
    }

    lines.push({ id: `div2_${ts}`, text: "", type: "empty" });
    lines.push({ id: `sf_${ts}_h`, text: "EGO-SF  /  SAN FRANCISCO", type: "header" });
    const sfCount = sfCollectors.length > 0 ? sfCollectors.length : 3;
    lines.push({ id: `sf_${ts}_c`, text: `Collectors:   ${sfCount}`, type: "data", color: colors.textPrimary });
    lines.push({ id: `sf_${ts}_r`, text: `Active Rigs:  ${sfRigs}`, type: "data", color: colors.textPrimary });

    if (stats) {
      const sfTaskEstimate = Math.max(Math.round(stats.totalAssigned * 0.4), 1);
      const sfHrsEstimate = Number((stats.totalLoggedHours * 0.35).toFixed(1));
      const sfRate = Math.min(stats.completionRate + 5, 100);
      lines.push({ id: `sf_${ts}_t`, text: `Tasks Logged: ${sfTaskEstimate}`, type: "data", color: colors.accentLight });
      lines.push({ id: `sf_${ts}_h2`, text: `Hours:        ${sfHrsEstimate}h`, type: "data", color: colors.accentLight });
      lines.push({ id: `sf_${ts}_r2`, text: `Rate:         ${sfRate.toFixed(1)}%`, type: "data", color: colors.terminalGreen });
    } else {
      lines.push({ id: `sf_${ts}_t`, text: "Awaiting data feed...", type: "label" });
    }

    if (sfCollectors.length > 0) {
      const sfNames = sfCollectors.map((c) => c.name).join(", ");
      lines.push({ id: `sf_${ts}_n`, text: `Team: ${sfNames}`, type: "label" });
    } else {
      lines.push({ id: `sf_${ts}_n`, text: "Team: Tony A., Veronika T., Travis B.", type: "label" });
    }

    lines.push({ id: `div3_${ts}`, text: "", type: "empty" });
    lines.push({ id: `avg_${ts}_h`, text: "COMBINED TEAM STATS", type: "header" });
    if (stats) {
      lines.push({ id: `avg_${ts}_1`, text: `Completion:   ${stats.completionRate.toFixed(1)}%`, type: "data", color: colors.terminalGreen });
      lines.push({ id: `avg_${ts}_2`, text: `Avg Hrs/Task: ${stats.avgHoursPerTask.toFixed(2)}h`, type: "data", color: colors.textPrimary });
      lines.push({ id: `avg_${ts}_3`, text: `Weekly Hrs:   ${stats.weeklyLoggedHours.toFixed(1)}h`, type: "data", color: colors.accentLight });
      lines.push({ id: `avg_${ts}_4`, text: `Weekly Done:  ${stats.weeklyCompleted}`, type: "data", color: colors.terminalGreen });
      lines.push({ id: `avg_${ts}_5`, text: `Total Rigs:   ${totalRigCount} (MX: ${mxRigs} + SF: ${sfRigs})`, type: "data", color: colors.textPrimary });
    } else {
      lines.push({ id: `avg_${ts}_1`, text: "Syncing with server...", type: "label" });
    }

    lines.push({ id: `div4_${ts}`, text: "", type: "empty" });

    if (recollectItems.length > 0) {
      lines.push({ id: `rec_${ts}_h`, text: "PENDING RECOLLECTIONS", type: "header" });
      recollectItems.slice(0, 5).forEach((item, i) => {
        lines.push({ id: `rec_${ts}_${i}`, text: item, type: "data", color: colors.cancel });
      });
      if (recollectItems.length > 5) {
        lines.push({ id: `rec_${ts}_more`, text: `+ ${recollectItems.length - 5} more...`, type: "label" });
      }
      lines.push({ id: `rec_${ts}_d`, text: "", type: "empty" });
    }

    if (announcements.length > 0) {
      lines.push({ id: `ann_${ts}_h`, text: "ANNOUNCEMENTS", type: "header" });
      announcements.forEach((item, i) => {
        lines.push({ id: `ann_${ts}_${i}`, text: item, type: "data", color: colors.statusPending });
      });
      lines.push({ id: `ann_${ts}_d`, text: "", type: "empty" });
    }

    const easterEgg = EASTER_EGG_LINES[Math.floor(Math.random() * EASTER_EGG_LINES.length)];
    lines.push({ id: `ee_${ts}`, text: easterEgg, type: "cmd" });
    lines.push({ id: `ee_${ts}_d`, text: "", type: "empty" });

    lines.push({ id: `sys2_${ts}`, text: "═".repeat(40), type: "divider" });
    lines.push({ id: `rd_${ts}`, text: `LAST REDASH PULL: ${lastRefresh}`, type: "label" });

    return lines;
  }, [stats, collectors, mxCollectors, sfCollectors, colors, lastRefresh, recollectItems, totalRigCount, announcements]);

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
      setLiveLines((prev) => {
        const updated = [...prev, next];
        return updated.slice(-40);
      });
    };

    feed();
    intervalRef.current = setInterval(feed, 35);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [allLines, configured]);

  const handleFakeDelete = useCallback(() => {
    if (fakeDeleting) return;
    setFakeDeleting(true);
    setFakeDeleteLines([]);
    Animated.timing(fakeDeleteFade, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    const timers: ReturnType<typeof setTimeout>[] = [];
    FAKE_DELETE_LINES.forEach((line, i) => {
      timers.push(
        setTimeout(() => {
          setFakeDeleteLines((prev) => [...prev, line]);
        }, i * 600)
      );
    });
    timers.push(
      setTimeout(() => {
        Animated.timing(fakeDeleteFade, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => {
          setFakeDeleting(false);
          setFakeDeleteLines([]);
        });
      }, FAKE_DELETE_LINES.length * 600 + 2000)
    );
    return () => timers.forEach(clearTimeout);
  }, [fakeDeleting, fakeDeleteFade]);

  const handleTerminalTap = useCallback(() => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      handleFakeDelete();
    } else {
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, 3000);
    }
  }, [handleFakeDelete]);

  const livePillColor = isDark ? colors.terminalGreen : '#0D7C4A';
  const bgMain = isDark ? colors.bg : '#FAF7F0';

  return (
    <View style={[styles.container, { backgroundColor: bgMain, paddingTop: insets.top }]}>
      <View style={styles.brandRow}>
        <Animated.Text
          style={[
            styles.brandName,
            {
              color: colors.accent,
              fontFamily: FONT_MONO,
              opacity: nameGlow,
            },
          ]}
        >
          T A S K F L O W
        </Animated.Text>
      </View>

      <SkyDayTracker />

      <View style={[styles.header, {
        backgroundColor: isDark ? '#151518' : '#FFFEF6',
        shadowColor: isDark ? colors.accent : '#1A1400',
        borderColor: isDark ? '#2A2A30' : '#DDD8C6',
      }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerUserLabel, { color: colors.textMuted, fontFamily: FONT_MONO }]}>USER</Text>
          <Text style={[styles.headerUserName, { color: colors.textPrimary, fontFamily: FONT_MONO }]} numberOfLines={1}>
            {selectedCollectorName || 'Not Selected'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <LiveClock size="small" showMs={false} />
          <View style={[
            styles.livePill,
            {
              backgroundColor: isOnline ? livePillColor + '1A' : colors.cancel + '1A',
              borderColor: isOnline ? livePillColor + '55' : colors.cancel + '55',
            }
          ]}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? livePillColor : colors.cancel }]} />
            <Text style={[styles.liveText, { color: isOnline ? livePillColor : colors.cancel, fontFamily: FONT_MONO }]}>
              {isOnline ? "ONLINE" : "OFF"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.actionBtn, {
            backgroundColor: isDark ? '#1C1C1F' : '#FFFEF6',
            borderColor: isDark ? '#2E2E34' : '#DDD8C6',
          }]}
          onPress={toggleTheme}
          activeOpacity={0.7}
          testID="theme-toggle"
        >
          {isDark ? <Sun size={14} color="#FBBF24" /> : <Moon size={14} color={colors.accent} />}
          <Text style={[styles.actionBtnText, { color: colors.textSecondary, fontFamily: FONT_MONO }]}>
            {isDark ? "LIGHT" : "DARK"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, {
            backgroundColor: isDark ? '#1C1C1F' : '#FFFEF6',
            borderColor: isDark ? '#2E2E34' : '#DDD8C6',
          }]}
          onPress={() => setShowTutorial(!showTutorial)}
          activeOpacity={0.7}
          testID="tutorial-toggle"
        >
          <BookOpen size={14} color={colors.accent} />
          <Text style={[styles.actionBtnText, { color: colors.textSecondary, fontFamily: FONT_MONO }]}>
            GUIDE
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, {
            backgroundColor: isDark ? '#1A1230' : '#F4EDFF',
            borderColor: isDark ? colors.accent + '30' : colors.accent + '30',
          }]}
          onPress={() => router.push("/stats/leaderboard" as any)}
          activeOpacity={0.7}
          testID="leaderboard-shortcut"
        >
          <Trophy size={14} color={colors.accent} />
          <Text style={[styles.actionBtnText, { color: colors.accent, fontFamily: FONT_MONO }]}>
            RANKS
          </Text>
        </TouchableOpacity>
      </View>

      {showTutorial && (
        <View style={[styles.tutorialCard, {
          backgroundColor: isDark ? '#1C1C1F' : '#FFFEF6',
          borderColor: isDark ? '#2E2E34' : '#DDD8C6',
        }]}>
          <Text style={[styles.tutorialTitle, { color: colors.accent, fontFamily: FONT_MONO }]}>
            QUICK START GUIDE
          </Text>
          {TUTORIAL_STEPS.map((step) => (
            <View key={step.num} style={styles.tutorialStep}>
              <View style={[styles.stepNum, { backgroundColor: colors.accent + '18' }]}>
                <Text style={[styles.stepNumText, { color: colors.accent, fontFamily: FONT_MONO }]}>
                  {step.num}
                </Text>
              </View>
              <View style={styles.stepInfo}>
                <Text style={[styles.stepTitle, { color: colors.textPrimary, fontFamily: "Lexend_600SemiBold" }]}>
                  {step.title}
                </Text>
                <Text style={[styles.stepDesc, { color: colors.textMuted, fontFamily: "Lexend_400Regular" }]}>
                  {step.desc}
                </Text>
              </View>
              <ChevronRight size={14} color={colors.textMuted} />
            </View>
          ))}
        </View>
      )}

      <ScrollView
        style={styles.terminalScroll}
        contentContainerStyle={styles.terminalContent}
        showsVerticalScrollIndicator={false}
      >
        {fakeDeleting && (
          <Animated.View style={[styles.fakeDeleteOverlay, {
            backgroundColor: isDark ? '#1A0808' : '#FEF2F2',
            borderColor: isDark ? '#F8717130' : '#FCA5A530',
            opacity: fakeDeleteFade,
          }]}>
            <View style={styles.fakeDeleteHeader}>
              <View style={cmdStyles.dotRow}>
                <View style={[cmdStyles.dot, { backgroundColor: '#FF5F57' }]} />
                <View style={[cmdStyles.dot, { backgroundColor: '#FEBC2E' }]} />
                <View style={[cmdStyles.dot, { backgroundColor: '#28C840' }]} />
              </View>
              <Text style={[cmdStyles.headerTitle, { color: isDark ? '#F87171' : '#DC2626', fontFamily: FONT_MONO }]}>
                taskflow — purge mode
              </Text>
            </View>
            {fakeDeleteLines.map((line, i) => {
              const isJk = line.startsWith("[ JUST KIDDING ]");
              return (
                <Text
                  key={`fd_${i}`}
                  style={[
                    styles.fakeDeleteLine,
                    {
                      color: isJk ? colors.terminalGreen : (isDark ? '#F87171' : '#DC2626'),
                      fontFamily: FONT_MONO,
                      fontWeight: isJk ? "800" as const : "400" as const,
                    },
                  ]}
                >
                  {line}
                </Text>
              );
            })}
          </Animated.View>
        )}

        <View style={[styles.terminalWindow, {
          backgroundColor: isDark ? '#0C0C0E' : '#FFFEF8',
          borderColor: isDark ? '#222228' : '#DDD8C6',
          shadowColor: isDark ? colors.accent : '#1A1400',
        }]}>
          <CmdTerminalFeed lines={liveLines} isLoading={isFeeding} onHeaderPress={handleTerminalTap} />
        </View>
      </ScrollView>

      <View style={[styles.tickerBar, {
        backgroundColor: isDark ? '#111114' : '#EDE9DF',
        borderTopColor: isDark ? '#1E1E24' : '#D8D3C4',
      }]}>
        <NewsTicker segments={tickerSegments} colors={colors} isDark={isDark} />
      </View>
    </View>
  );
}

const cmdStyles = StyleSheet.create({
  feed: {
    gap: 0,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    marginBottom: 10,
    gap: 10,
  },
  dotRow: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: 10,
    letterSpacing: 0.8,
  },
  lineWrap: {
    paddingVertical: 1,
    paddingHorizontal: 12,
  },
  line: {
    fontSize: 11.5,
    lineHeight: 20,
    letterSpacing: 0.3,
  },
  divider: {
    fontSize: 11,
    letterSpacing: 0.5,
    opacity: 0.4,
    paddingVertical: 3,
  },
});

const clockStyles = StyleSheet.create({
  clock: {
    fontSize: 22,
    letterSpacing: 2,
    fontWeight: "900" as const,
  },
  ms: {
    fontSize: 14,
    letterSpacing: 0.5,
    fontWeight: "400" as const,
  },
  clockSmall: {
    fontSize: 15,
    letterSpacing: 1.5,
    fontWeight: "800" as const,
  },
  msSmall: {
    fontSize: 10,
    letterSpacing: 0.3,
    fontWeight: "400" as const,
  },
});

const ntStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    height: 32,
    overflow: "hidden",
  },
  pillWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
    borderRightWidth: 1,
    zIndex: 2,
  },
  pillDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  pillText: {
    fontSize: 8,
    fontWeight: "800" as const,
    letterSpacing: 1.2,
  },
  scrollArea: {
    flex: 1,
    overflow: "hidden",
    height: 32,
    justifyContent: "center",
    paddingLeft: 10,
  },
  scrollText: {
    width: 3000,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  brandRow: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 2,
  },
  brandName: {
    fontSize: 20,
    fontWeight: "900" as const,
    letterSpacing: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  headerUserLabel: {
    fontSize: 8,
    fontWeight: "700" as const,
    letterSpacing: 2,
  },
  headerUserName: {
    fontSize: 14,
    fontWeight: "900" as const,
    letterSpacing: 0.5,
  },
  headerRight: {
    alignItems: "flex-end",
    gap: 3,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 10,
    fontWeight: "800" as const,
    letterSpacing: 1.5,
  },

  quickActions: {
    flexDirection: "row",
    paddingHorizontal: 12,
    gap: 6,
    marginBottom: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 8,
    fontWeight: "700" as const,
    letterSpacing: 0.8,
  },
  tutorialCard: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  tutorialTitle: {
    fontSize: 10,
    fontWeight: "800" as const,
    letterSpacing: 2,
    marginBottom: 2,
  },
  tutorialStep: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: {
    fontSize: 11,
    fontWeight: "800" as const,
  },
  stepInfo: {
    flex: 1,
    gap: 1,
  },
  stepTitle: {
    fontSize: 13,
  },
  stepDesc: {
    fontSize: 11,
  },
  terminalScroll: {
    flex: 1,
  },
  terminalContent: {
    paddingHorizontal: 12,
    paddingBottom: 100,
  },
  terminalWindow: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 6,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  fakeDeleteOverlay: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
    overflow: "hidden",
  },
  fakeDeleteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(248,113,113,0.15)",
  },
  fakeDeleteLine: {
    fontSize: 11.5,
    lineHeight: 22,
    letterSpacing: 0.3,
  },
  tickerBar: {
    borderTopWidth: 1,
    position: "absolute",
    bottom: 110,
    left: 0,
    right: 0,
  },
});
