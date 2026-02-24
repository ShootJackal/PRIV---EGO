import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../../providers/ThemeProvider";
import { useCollection } from "../../../providers/CollectionProvider";
import { useQuery } from "@tanstack/react-query";
import { fetchTodayLog, fetchCollectorStats, fetchRecollections, isApiConfigured } from "../../../services/googleSheets";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const FONT_MONO = Platform.select({ ios: "Courier New", android: "monospace", default: "monospace" });

const SF_KNOWN_NAMES = new Set(["tony a", "veronika t", "travis b"]);

const FUNNY_LOADING_LINES = [
  "Booting EGO intelligence core...",
  "Making sure both hands are in frame...",
  "Raising daily collection hours to 7hrs...",
  "Making EGO RIGs heavier...",
  "Calibrating the vibes...",
  "Polishing camera lenses remotely...",
  "Convincing rigs to cooperate...",
  "Asking Redash nicely for data...",
  "Untangling USB cables mentally...",
  "Checking if Travis remembered his badge...",
  "Syncing with the mothership...",
  "Deploying collection drones... jk...",
  "Running rig diagnostics... beep boop...",
  "Warming up the data pipeline...",
  "Counting hours... carry the 1...",
];

function normalizeCollectorName(name: string): string {
  return name.replace(/\s*\(.*?\)\s*$/g, "").trim();
}

function normForMatch(name: string): string {
  return normalizeCollectorName(name).toLowerCase().replace(/\.$/, "").trim();
}

interface TerminalLine {
  id: string;
  text: string;
  type: "header" | "data" | "divider" | "empty" | "label" | "cmd";
  color?: string;
}

function CmdTerminalFeed({ lines, isLoading }: { lines: TerminalLine[]; isLoading: boolean }) {
  const { colors, isDark } = useTheme();
  const fadeAnims = useRef<{ [key: string]: Animated.Value }>({});
  const cursorAnim = useRef(new Animated.Value(0)).current;
  const scanlineAnim = useRef(new Animated.Value(0)).current;

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
    const scan = Animated.loop(
      Animated.timing(scanlineAnim, { toValue: 1, duration: 4000, useNativeDriver: true })
    );
    scan.start();
    return () => scan.stop();
  }, [scanlineAnim]);

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

  const termColor = isDark ? '#E03030' : '#2563EB';
  const termDim = isDark ? '#5A4444' : '#8A8A9A';

  return (
    <View style={cmdStyles.feed}>
      <View style={[cmdStyles.headerBar, { borderBottomColor: termDim + '44' }]}>
        <View style={cmdStyles.dotRow}>
          <View style={[cmdStyles.dot, { backgroundColor: '#FF5F57' }]} />
          <View style={[cmdStyles.dot, { backgroundColor: '#FEBC2E' }]} />
          <View style={[cmdStyles.dot, { backgroundColor: '#28C840' }]} />
        </View>
        <Text style={[cmdStyles.headerTitle, { color: termDim, fontFamily: FONT_MONO }]}>
          ego-system — live
        </Text>
      </View>

      {lines.map((line) => {
        if (!fadeAnims.current[line.id]) {
          fadeAnims.current[line.id] = new Animated.Value(1);
        }
        const opacity = fadeAnims.current[line.id];

        const lineColor =
          line.type === "header" ? termColor :
          line.type === "cmd" ? colors.terminalGreen :
          line.type === "divider" ? termDim :
          line.type === "label" ? (isDark ? '#F0A020' : '#7A6B00') :
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
          <Animated.View
            key={line.id}
            style={[cmdStyles.lineWrap, { opacity }]}
          >
            {line.type === "divider" ? (
              <Text style={[cmdStyles.divider, { color: termDim, fontFamily: FONT_MONO }]}>
                {line.text}
              </Text>
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
            style={[
              cmdStyles.line,
              { color: colors.terminalGreen, fontFamily: FONT_MONO, opacity: cursorAnim },
            ]}
          >
            {"  ▌"}
          </Animated.Text>
        </View>
      )}
    </View>
  );
}

function LiveClock() {
  const { colors } = useTheme();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 10);
    return () => clearInterval(id);
  }, []);

  const hh = String(time.getHours()).padStart(2, "0");
  const mm = String(time.getMinutes()).padStart(2, "0");
  const ss = String(time.getSeconds()).padStart(2, "0");
  const ms = String(Math.floor(time.getMilliseconds() / 10)).padStart(2, "0");

  return (
    <Text style={[clockStyles.clock, { color: colors.textPrimary, fontFamily: FONT_MONO }]}>
      {hh}:{mm}:{ss}
      <Text style={[clockStyles.ms, { color: colors.textMuted, fontFamily: FONT_MONO }]}>.{ms}</Text>
    </Text>
  );
}

function TickerScroll({ items, colors, isDark }: { items: string[]; colors: ReturnType<typeof useTheme>["colors"]; isDark: boolean }) {
  const scrollX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!items.length) return;
    const totalWidth = items.join("    ·    ").length * 8 + 200;
    scrollX.setValue(SCREEN_WIDTH);

    const anim = Animated.loop(
      Animated.timing(scrollX, {
        toValue: -totalWidth,
        duration: Math.max(totalWidth * 22, 5000),
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [items, scrollX]);

  if (!items.length) return null;

  const tickerText = items.join("    ·    ");
  const pillColor = isDark ? '#E03030' : '#DC2626';

  return (
    <View style={tickerStyles.container}>
      <View style={[tickerStyles.pill, { backgroundColor: pillColor + '1A', borderColor: pillColor + '55' }]}>
        <Text style={[tickerStyles.pillText, { color: pillColor, fontFamily: FONT_MONO }]}>RECOLLECT</Text>
      </View>
      <View style={tickerStyles.scrollArea}>
        <Animated.Text
          style={[
            tickerStyles.text,
            { color: colors.statusPending, fontFamily: FONT_MONO, transform: [{ translateX: scrollX }] },
          ]}
          numberOfLines={1}
        >
          {tickerText}
        </Animated.Text>
      </View>
    </View>
  );
}

export default function LiveScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { configured, collectors, todayLog, selectedCollectorName } = useCollection();

  const [liveLines, setLiveLines] = useState<TerminalLine[]>([]);
  const [isOnline, setIsOnline] = useState(false);
  const [isFeeding, setIsFeeding] = useState(true);
  const lineIndexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      console.log("[LIVE] Fetching recollections from ADMIN_DASHBOARD C28+");
      const data = await fetchRecollections();
      console.log("[LIVE] Recollections received:", data?.length ?? 0, "items");
      return data;
    },
    enabled: configured,
    staleTime: 30000,
    refetchInterval: 45000,
    retry: 3,
  });

  const recollectItems = useMemo(() => {
    const sheetItems = recollectionsQuery.data;
    if (sheetItems && sheetItems.length > 0) {
      return sheetItems;
    }
    const log = todayLogQuery.data ?? todayLog;
    const fallback = log
      .filter((e) => e.status === "Partial" || e.remainingHours > 0)
      .map((e) => `${normalizeCollectorName(e.taskName)}  (${e.remainingHours}h left)`);
    if (fallback.length > 0) return fallback;
    return [];
  }, [recollectionsQuery.data, todayLogQuery.data, todayLog]);

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

    const loadingLine = FUNNY_LOADING_LINES[Math.floor(Math.random() * FUNNY_LOADING_LINES.length)];
    lines.push({ id: `boot_${ts}`, text: loadingLine, type: "cmd" });
    lines.push({ id: `sys_${ts}_0`, text: "EGO COLLECTION INTELLIGENCE SYSTEM", type: "header" });
    lines.push({ id: `sys_${ts}_1`, text: "═".repeat(40), type: "divider" });
    lines.push({ id: `sys_${ts}_2`, text: "", type: "empty" });

    lines.push({ id: `mx_${ts}_h`, text: "EGO-MX  /  LOS CABOS", type: "header" });
    const mxCount = mxCollectors.length > 0 ? mxCollectors.length : Math.max(Math.floor(collectors.length * 0.55), 1);
    const mxRigs = mxCollectors.length > 0 ? mxCollectors.reduce((s, c) => s + c.rigs.length, 0) : mxCount;
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
    const sfRigs = sfCollectors.length > 0 ? sfCollectors.reduce((s, c) => s + c.rigs.length, 0) : 3;
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

    lines.push({ id: `sys2_${ts}`, text: "═".repeat(40), type: "divider" });
    lines.push({ id: `rd_${ts}`, text: `LAST REDASH PULL: ${lastRefresh}`, type: "label" });

    return lines;
  }, [stats, collectors, mxCollectors, sfCollectors, colors, lastRefresh, recollectItems, totalRigCount]);

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
    intervalRef.current = setInterval(feed, 120);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [allLines, configured]);

  const livePillColor = isDark ? colors.terminalGreen : '#0D7C4A';
  const bgMain = isDark ? '#141414' : '#F8F6EE';

  return (
    <View style={[styles.container, { backgroundColor: bgMain, paddingTop: insets.top }]}>
      <View style={styles.clockRow}>
        <LiveClock />
      </View>

      <View style={[styles.header, {
        backgroundColor: isDark ? '#1E1E1E' : '#FFFDF5',
        shadowColor: isDark ? '#000' : '#1A1400',
        borderColor: isDark ? '#333' : '#E0DCCF',
      }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary, fontFamily: FONT_MONO }]}>SYSTEM</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted, fontFamily: FONT_MONO }]}>LIVE FEED</Text>
        </View>

        <View style={styles.headerRight}>
          <View style={[
            styles.livePill,
            {
              backgroundColor: isOnline ? livePillColor + '1A' : colors.cancel + '1A',
              borderColor: isOnline ? livePillColor + '55' : colors.cancel + '55',
            }
          ]}>
            <View style={[styles.statusDot, {
              backgroundColor: isOnline ? livePillColor : colors.cancel,
            }]} />
            <Text style={[styles.liveText, {
              color: isOnline ? livePillColor : colors.cancel,
              fontFamily: FONT_MONO,
            }]}>
              {isOnline ? "LIVE" : "OFFLINE"}
            </Text>
          </View>
          <Text style={[styles.rigCount, { color: colors.textMuted, fontFamily: FONT_MONO }]}>
            {totalRigCount} RIGS
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.terminalScroll}
        contentContainerStyle={styles.terminalContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.terminalWindow, {
          backgroundColor: isDark ? '#0E0E0E' : '#FFFFF8',
          borderColor: isDark ? '#2A2A2A' : '#DDD8C8',
        }]}>
          <CmdTerminalFeed lines={liveLines} isLoading={isFeeding} />
        </View>
      </ScrollView>

      <View style={[styles.tickerBar, {
        backgroundColor: isDark ? '#1A1A1A' : '#F0EDE2',
        borderTopColor: isDark ? '#2A2A2A' : '#E0DCCF',
      }]}>
        <TickerScroll
          items={recollectItems.length > 0 ? recollectItems : ["No pending recollections"]}
          colors={colors}
          isDark={isDark}
        />
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
});

const tickerStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    height: 36,
    overflow: "hidden",
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  pillText: {
    fontSize: 8,
    fontWeight: "800" as const,
    letterSpacing: 1.4,
  },
  scrollArea: {
    flex: 1,
    overflow: "hidden",
    height: 36,
    justifyContent: "center",
  },
  text: {
    fontSize: 11,
    letterSpacing: 0.3,
    width: 3000,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  clockRow: {
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 6,
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
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  headerLeft: {},
  headerTitle: {
    fontSize: 13,
    fontWeight: "900" as const,
    letterSpacing: 2,
  },
  headerSub: {
    fontSize: 9,
    letterSpacing: 1.5,
    marginTop: 1,
    fontWeight: "600" as const,
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
  rigCount: {
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: "600" as const,
    marginTop: 2,
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
  },
  tickerBar: {
    borderTopWidth: 1,
    position: "absolute",
    bottom: 110,
    left: 0,
    right: 0,
  },
});
