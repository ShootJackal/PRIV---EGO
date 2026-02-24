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
import { RefreshCw } from "lucide-react-native";
import * as Haptics from "expo-haptics";
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

  const termAccent = colors.terminal;
  const termDim = colors.terminalDim;

  return (
    <View style={cmdStyles.feed}>
      <View style={[cmdStyles.headerBar, { borderBottomColor: termDim + '30' }]}>
        <View style={cmdStyles.dotRow}>
          <View style={[cmdStyles.dot, { backgroundColor: isDark ? '#E03030' : '#FF5F57' }]} />
          <View style={[cmdStyles.dot, { backgroundColor: isDark ? '#F0A020' : '#FEBC2E' }]} />
          <View style={[cmdStyles.dot, { backgroundColor: isDark ? '#30CC78' : '#28C840' }]} />
        </View>
        <Text style={[cmdStyles.headerTitle, { color: termDim, fontFamily: FONT_MONO }]}>
          ego@system ~ live-feed
        </Text>
        <View style={cmdStyles.headerRight}>
          <View style={[cmdStyles.sessionDot, { backgroundColor: colors.terminalGreen }]} />
          <Text style={[cmdStyles.sessionText, { color: termDim, fontFamily: FONT_MONO }]}>session</Text>
        </View>
      </View>

      {lines.map((line) => {
        if (!fadeAnims.current[line.id]) {
          fadeAnims.current[line.id] = new Animated.Value(1);
        }
        const opacity = fadeAnims.current[line.id];

        const lineColor =
          line.type === "header" ? termAccent :
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
                    fontSize: line.type === "header" ? 12.5 : 11,
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

function AnnouncementTicker({ items, colors, isDark }: { items: string[]; colors: ReturnType<typeof useTheme>["colors"]; isDark: boolean }) {
  const scrollX = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  useEffect(() => {
    if (!items.length) return;
    const totalWidth = items.join("    ·    ").length * 7.5 + 300;
    scrollX.setValue(SCREEN_WIDTH);

    const anim = Animated.loop(
      Animated.timing(scrollX, {
        toValue: -totalWidth,
        duration: Math.max(totalWidth * 28, 8000),
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, [items, scrollX]);

  if (!items.length) return null;

  const tickerText = items.join("     ·     ");
  const alertColor = isDark ? '#E03030' : '#DC2626';
  const hasRecollects = items.some(i => !i.includes("No pending"));

  return (
    <View style={[tickerStyles.container, {
      backgroundColor: isDark ? '#1A0808' : '#FFF5F5',
      borderTopColor: isDark ? '#3D1818' : '#FECACA',
      borderBottomColor: isDark ? '#3D1818' : '#FECACA',
    }]}>
      <View style={tickerStyles.pillSection}>
        <Animated.View style={[tickerStyles.alertDot, { backgroundColor: alertColor, opacity: hasRecollects ? pulseAnim : 0.3 }]} />
        <Text style={[tickerStyles.pillText, { color: alertColor, fontFamily: FONT_MONO }]}>
          {hasRecollects ? "RECOLLECT" : "CLEAR"}
        </Text>
      </View>
      <View style={tickerStyles.dividerLine} />
      <View style={tickerStyles.scrollArea}>
        <Animated.Text
          style={[
            tickerStyles.text,
            {
              color: hasRecollects ? alertColor : colors.textMuted,
              fontFamily: FONT_MONO,
              transform: [{ translateX: scrollX }],
            },
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
    lines.push({ id: `sys_${ts}_1`, text: "─".repeat(42), type: "divider" });
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

    lines.push({ id: `sys2_${ts}`, text: "─".repeat(42), type: "divider" });
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

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    statsQuery.refetch();
    todayLogQuery.refetch();
    recollectionsQuery.refetch();
  }, [statsQuery, todayLogQuery, recollectionsQuery]);

  const livePillColor = isDark ? colors.terminalGreen : '#0D7C4A';
  const bgMain = isDark ? '#0E0E0E' : '#FAFAF0';

  return (
    <View style={[styles.container, { backgroundColor: bgMain, paddingTop: insets.top }]}>
      <View style={styles.titleRow}>
        <Text style={[styles.appName, { color: colors.accent, fontFamily: FONT_MONO }]}>EGO</Text>
        <View style={styles.titleRight}>
          <View style={[
            styles.livePill,
            {
              backgroundColor: isOnline ? livePillColor + '1A' : colors.cancel + '1A',
              borderColor: isOnline ? livePillColor + '44' : colors.cancel + '44',
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

      <AnnouncementTicker
        items={recollectItems.length > 0 ? recollectItems : ["No pending recollections"]}
        colors={colors}
        isDark={isDark}
      />

      <ScrollView
        style={styles.terminalScroll}
        contentContainerStyle={styles.terminalContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.terminalWindow, {
          backgroundColor: isDark ? '#0A0A0A' : '#FFFFF8',
          borderColor: isDark ? '#1E1E1E' : '#E0DCCF',
        }]}>
          <CmdTerminalFeed lines={liveLines} isLoading={isFeeding} />
        </View>

        <TouchableOpacity
          style={[styles.refreshBtn, {
            backgroundColor: isDark ? '#1A1A1A' : '#F0EDE2',
            borderColor: isDark ? '#2A2A2A' : '#E0DCCF',
          }]}
          onPress={handleRefresh}
          activeOpacity={0.7}
        >
          <RefreshCw size={12} color={colors.textMuted} />
          <Text style={[styles.refreshText, { color: colors.textMuted, fontFamily: FONT_MONO }]}>
            REFRESH FEED
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  dotRow: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  headerTitle: {
    fontSize: 10,
    letterSpacing: 0.5,
    marginLeft: 10,
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sessionDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  sessionText: {
    fontSize: 8,
    letterSpacing: 0.5,
  },
  lineWrap: {
    paddingVertical: 1,
    paddingHorizontal: 14,
  },
  line: {
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  divider: {
    fontSize: 11,
    letterSpacing: 0.5,
    opacity: 0.3,
    paddingVertical: 2,
    paddingHorizontal: 14,
  },
});

const tickerStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    height: 38,
    overflow: "hidden",
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  pillSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
  },
  alertDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  pillText: {
    fontSize: 8,
    fontWeight: "800" as const,
    letterSpacing: 1.6,
  },
  dividerLine: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(128,128,128,0.2)",
  },
  scrollArea: {
    flex: 1,
    overflow: "hidden",
    height: 38,
    justifyContent: "center",
    marginLeft: 8,
  },
  text: {
    fontSize: 10.5,
    letterSpacing: 0.3,
    width: 4000,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  appName: {
    fontSize: 28,
    fontWeight: "900" as const,
    letterSpacing: 6,
  },
  titleRight: {
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
    paddingTop: 10,
    paddingBottom: 120,
  },
  terminalWindow: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 4,
    overflow: "hidden",
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  refreshText: {
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: "700" as const,
  },
});
