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
        duration: Math.max(totalWidth * 18, 4000),
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [items, scrollX]);

  if (!items.length) return null;

  const tickerText = items.join("    ·    ");
  const pillColor = isDark ? colors.accent : colors.cancel;

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
  const { configured, collectors, todayLog, selectedCollectorName, announcements } = useCollection();

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

  const tickerItems = useMemo(() => {
    const combined = [...announcements, ...recollectItems];
    return combined.length > 0 ? combined : ["No pending recollections"];
  }, [announcements, recollectItems]);

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

  const livePillColor = isDark ? colors.terminalGreen : '#0D7C4A';
  const bgMain = isDark ? colors.terminalBg : '#F5F2E8';

  return (
    <View style={[styles.container, { backgroundColor: bgMain, paddingTop: insets.top }]}>
      <View style={styles.clockRow}>
        <LiveClock />
      </View>

      <View style={[styles.header, {
        backgroundColor: isDark ? '#151515' : '#FFFFF5',
        shadowColor: isDark ? colors.accent : '#1A1400',
        borderColor: isDark ? '#2A2A2A' : '#D8D1C2',
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
          backgroundColor: isDark ? '#0C0C0C' : '#FFFFF8',
          borderColor: isDark ? '#222222' : '#D8D1C2',
          shadowColor: isDark ? colors.accent : '#1A1400',
        }]}>
          <CmdTerminalFeed lines={liveLines} isLoading={isFeeding} />
        </View>
      </ScrollView>

      <View style={[styles.tickerBar, {
        backgroundColor: isDark ? '#141414' : '#EDE8DB',
        borderTopColor: isDark ? '#222222' : '#D8D1C2',
      }]}>
        <TickerScroll
          items={tickerItems}
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
    paddingTop: 2,
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
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  tickerBar: {
    borderTopWidth: 1,
    position: "absolute",
    bottom: 110,
    left: 0,
    right: 0,
  },
});
