import React, { useCallback, useRef, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Animated,
  Platform,
} from "react-native";
import {
  MessageSquare,
  Clock,
  AlertTriangle,
  ChevronRight,
  Moon,
  Sun,
  User,
  Cpu,
  Check,
  Timer,
  Play,
  Pause,
  RotateCcw,
  ChevronDown,
  ClipboardList,
  BarChart3,
  LayoutDashboard,
  ExternalLink,
  Palette,
  Database,
  Zap,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useTheme } from "../../../providers/ThemeProvider";
import { useCollection } from "../../../providers/CollectionProvider";
import SelectPicker from "../../../components/SelectPicker";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const FONT_MONO = Platform.select({ ios: "Courier New", android: "monospace", default: "monospace" });

const SHEET_PAGES = [
  { id: "log", label: "Assignment Log", icon: ClipboardList, desc: "View task assignment history" },
  { id: "taskActuals", label: "Task Actuals", icon: BarChart3, desc: "Collection progress by task" },
  { id: "admin", label: "Admin Dashboard", icon: LayoutDashboard, desc: "Overview & system health" },
];

const TIMER_PRESETS = [
  { mins: 5, label: "5m", color: "#30CC78" },
  { mins: 10, label: "10m", color: "#2563EB" },
  { mins: 15, label: "15m", color: "#7C3AED" },
  { mins: 20, label: "20m", color: "#F0A020" },
  { mins: 25, label: "25m", color: "#E03030" },
  { mins: 30, label: "30m", color: "#DC2626" },
];

function SectionHeader({ label, icon }: { label: string; icon?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={sectionStyles.row}>
      {icon}
      <Text style={[sectionStyles.label, { color: colors.textMuted, fontWeight: "700" as const }]}>
        {label}
      </Text>
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  label: {
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase" as const,
  },
});

function CompactTimer() {
  const { colors, isDark } = useTheme();
  const [selectedMinutes, setSelectedMinutes] = useState(10);
  const [secondsLeft, setSecondsLeft] = useState(10 * 60);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const totalSeconds = selectedMinutes * 60;
  const progress = totalSeconds > 0 ? (totalSeconds - secondsLeft) / totalSeconds : 0;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  useEffect(() => {
    if (Platform.OS !== "web") {
      Notifications.requestPermissionsAsync().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (finished) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 400, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
    pulseAnim.setValue(1);
  }, [finished, pulseAnim]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress * 100,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  const fireAlarm = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 400);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 800);
    setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning), 1200);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 1600);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 2000);

    if (Platform.OS !== "web") {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Timer Complete",
            body: `Your ${selectedMinutes} minute timer has finished!`,
            sound: true,
          },
          trigger: null,
        });
      } catch (e) {
        console.log("[Timer] Notification error:", e);
      }
    }
  }, [selectedMinutes]);

  const start = useCallback(() => {
    if (finished) {
      setFinished(false);
      setSecondsLeft(selectedMinutes * 60);
    }
    setRunning(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [finished, selectedMinutes]);

  const pause = useCallback(() => {
    setRunning(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const reset = useCallback(() => {
    setRunning(false);
    setFinished(false);
    setSecondsLeft(selectedMinutes * 60);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [selectedMinutes]);

  const selectDuration = useCallback(
    (mins: number) => {
      setSelectedMinutes(mins);
      setSecondsLeft(mins * 60);
      setRunning(false);
      setFinished(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    []
  );

  useEffect(() => {
    if (running && secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            setRunning(false);
            setFinished(true);
            fireAlarm();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, secondsLeft, fireAlarm]);

  const activePreset = TIMER_PRESETS.find(p => p.mins === selectedMinutes);
  const ringColor = finished
    ? colors.cancel
    : running
    ? activePreset?.color ?? colors.accent
    : colors.textMuted;

  return (
    <Animated.View style={[timerStyles.card, {
      backgroundColor: colors.bgCard,
      borderColor: finished ? colors.cancel + '40' : colors.border,
      shadowColor: colors.shadow,
      transform: [{ scale: pulseAnim }],
    }]}>
      <View style={timerStyles.topRow}>
        <View style={[timerStyles.timeDisplay, {
          borderColor: ringColor + '60',
          backgroundColor: finished ? colors.cancel + '10' : running ? (activePreset?.color ?? colors.accent) + '08' : colors.bgElevated,
        }]}>
          <Text style={[timerStyles.timeText, {
            color: finished ? colors.cancel : running ? colors.textPrimary : colors.textSecondary,
            fontFamily: FONT_MONO,
          }]}>
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </Text>
          {finished && (
            <Text style={[timerStyles.doneLabel, { color: colors.cancel, fontFamily: FONT_MONO }]}>DONE</Text>
          )}
        </View>

        <View style={timerStyles.controlCol}>
          <View style={timerStyles.presetRow}>
            {TIMER_PRESETS.map((p) => (
              <TouchableOpacity
                key={p.mins}
                style={[
                  timerStyles.presetChip,
                  {
                    backgroundColor: p.mins === selectedMinutes ? (p.color + '20') : colors.bgInput,
                    borderColor: p.mins === selectedMinutes ? (p.color + '50') : 'transparent',
                  },
                ]}
                onPress={() => selectDuration(p.mins)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    timerStyles.presetText,
                    {
                      color: p.mins === selectedMinutes ? p.color : colors.textMuted,
                      fontWeight: p.mins === selectedMinutes ? "700" as const : "400" as const,
                    },
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={timerStyles.btnRow}>
            <TouchableOpacity
              style={[timerStyles.resetBtn, { backgroundColor: colors.bgInput, borderColor: colors.border }]}
              onPress={reset}
              activeOpacity={0.75}
            >
              <RotateCcw size={14} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[timerStyles.playBtn, {
                backgroundColor: finished ? colors.cancel : running ? colors.completeBg : (activePreset?.color ?? colors.accent),
                shadowColor: colors.shadow,
              }]}
              onPress={running ? pause : start}
              activeOpacity={0.85}
            >
              {running ? (
                <Pause size={18} color={finished ? colors.white : colors.complete} />
              ) : (
                <Play size={18} color={colors.white} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {!finished && (
        <View style={[timerStyles.progressBar, { backgroundColor: colors.bgInput }]}>
          <Animated.View
            style={[
              timerStyles.progressFill,
              {
                backgroundColor: ringColor,
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      )}
    </Animated.View>
  );
}

export default function ToolsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const {
    collectors,
    selectedCollectorName,
    selectedCollector,
    selectedRig,
    selectCollector,
    setSelectedRig,
  } = useCollection();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, speed: 18, bounciness: 5, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const collectorOptions = useMemo(
    () => collectors.map((c) => ({ value: c.name, label: c.name })),
    [collectors]
  );

  const rigOptions = useMemo(() => {
    if (!selectedCollector || !selectedCollector.rigs.length) return [];
    return selectedCollector.rigs.map((r) => ({ value: r, label: r }));
  }, [selectedCollector]);

  const openSlack = useCallback(() => {
    const slackDeepLink = "slack://open";
    const slackWeb = "https://slack.com/";
    if (Platform.OS === "web") {
      Linking.openURL(slackWeb);
    } else {
      Linking.canOpenURL(slackDeepLink)
        .then((supported) => {
          if (supported) Linking.openURL(slackDeepLink);
          else Linking.openURL(slackWeb);
        })
        .catch(() => Linking.openURL(slackWeb));
    }
  }, []);

  const openHubstaff = useCallback(() => {
    const hubstaffDeepLink = "hubstaff://";
    const hubstaffWeb = "https://app.hubstaff.com/";
    if (Platform.OS === "web") {
      Linking.openURL(hubstaffWeb);
    } else {
      Linking.canOpenURL(hubstaffDeepLink)
        .then((supported) => {
          if (supported) Linking.openURL(hubstaffDeepLink);
          else Linking.openURL(hubstaffWeb);
        })
        .catch(() => Linking.openURL(hubstaffWeb));
    }
  }, []);

  const openAirtableRigIssue = useCallback(() => {
    Linking.openURL("https://airtable.com/appvGgqeLbTxT4ld4/paghR1Qfi3cwZQtWZ/form");
  }, []);

  const openSheetPage = useCallback((sheetId: string, label: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/tools/sheet-viewer" as any,
      params: { sheetId, title: label },
    });
  }, []);

  const handleToggleTheme = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleTheme();
  }, [toggleTheme]);

  const handleSelectCollector = useCallback(
    (name: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      selectCollector(name);
    },
    [selectCollector]
  );

  const handleSelectRig = useCallback(
    (rig: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedRig(rig);
    },
    [setSelectedRig]
  );

  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.bgCard,
      borderColor: colors.border,
      shadowColor: colors.shadow,
    },
  ];

  return (
    <Animated.View
      style={[styles.flex, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
    >
      <ScrollView
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SectionHeader label="My Profile" icon={<User size={12} color={colors.textMuted} />} />

        <View style={cardStyle}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIconWrap, { backgroundColor: colors.accentSoft }]}>
              <User size={17} color={colors.accent} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: colors.textMuted, fontWeight: "600" as const }]}>
                Who are you?
              </Text>
              <SelectPicker
                label=""
                options={collectorOptions}
                selectedValue={selectedCollectorName}
                onValueChange={handleSelectCollector}
                placeholder="Select your name..."
                testID="settings-collector-picker"
              />
            </View>
          </View>

          {selectedCollectorName !== "" && (
            <>
              <View style={[styles.settingDivider, { backgroundColor: colors.border }]} />
              <View style={styles.settingRow}>
                <View style={[styles.settingIconWrap, { backgroundColor: colors.completeBg }]}>
                  <Cpu size={17} color={colors.complete} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingLabel, { color: colors.textMuted, fontWeight: "600" as const }]}>
                    Your Rig
                  </Text>
                  {rigOptions.length > 0 ? (
                    <SelectPicker
                      label=""
                      options={rigOptions}
                      selectedValue={selectedRig}
                      onValueChange={handleSelectRig}
                      placeholder="Select your rig..."
                      testID="rig-picker"
                    />
                  ) : (
                    <Text style={[styles.noRigText, { color: colors.textMuted, fontWeight: "400" as const }]}>
                      No rigs assigned to this collector
                    </Text>
                  )}
                </View>
              </View>
            </>
          )}
        </View>

        {selectedCollectorName !== "" && selectedRig !== "" && (
          <View
            style={[
              styles.profileBadge,
              { backgroundColor: colors.accentSoft, borderColor: colors.accentDim },
            ]}
          >
            <Check size={13} color={colors.accent} />
            <Text style={[styles.profileBadgeText, { color: colors.accent, fontWeight: "600" as const }]}>
              {selectedCollectorName} · {selectedRig}
            </Text>
          </View>
        )}

        <View style={styles.sectionGap} />
        <SectionHeader label="Collection Timer" icon={<Timer size={12} color={colors.textMuted} />} />
        <CompactTimer />

        <View style={styles.sectionGap} />
        <SectionHeader label="Appearance" icon={<Palette size={12} color={colors.textMuted} />} />

        <TouchableOpacity
          style={[cardStyle, styles.themeRow]}
          onPress={handleToggleTheme}
          activeOpacity={0.75}
          testID="theme-toggle"
        >
          <View
            style={[
              styles.settingIconWrap,
              { backgroundColor: isDark ? "#2A1A1A" : colors.bgElevated },
            ]}
          >
            {isDark ? <Sun size={17} color="#F5A623" /> : <Moon size={17} color={colors.textSecondary} />}
          </View>
          <View style={styles.themeContent}>
            <Text style={[styles.themeLabel, { color: colors.textPrimary, fontWeight: "500" as const }]}>
              {isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            </Text>
            <Text style={[styles.themeSub, { color: colors.textMuted, fontWeight: "400" as const }]}>
              {isDark ? "Easier on the eyes outdoors" : "Better for low-light collection"}
            </Text>
          </View>
          <ChevronRight size={16} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.sectionGap} />
        <SectionHeader label="Quick Actions" icon={<Zap size={12} color={colors.textMuted} />} />

        <View style={styles.quickGrid}>
          <QuickCard
            title="Slack"
            subtitle="Team chat"
            icon={<MessageSquare size={20} color={colors.slack} />}
            iconBg={colors.slackBg}
            onPress={openSlack}
            testID="slack-link"
            colors={colors}
          />
          <QuickCard
            title="Hubstaff"
            subtitle="Time track"
            icon={<Clock size={20} color={colors.hubstaff} />}
            iconBg={colors.hubstaffBg}
            onPress={openHubstaff}
            testID="hubstaff-link"
            colors={colors}
          />
          <QuickCard
            title="Report"
            subtitle="Rig issue"
            icon={<AlertTriangle size={20} color={colors.airtable} />}
            iconBg={colors.airtableBg}
            onPress={openAirtableRigIssue}
            testID="airtable-link"
            colors={colors}
          />
        </View>

        <View style={styles.sectionGap} />
        <SectionHeader label="Verify Data" icon={<Database size={12} color={colors.textMuted} />} />

        <View style={cardStyle}>
          {SHEET_PAGES.map((page, idx) => {
            const IconComp = page.icon;
            return (
              <View key={page.id}>
                {idx > 0 && (
                  <View style={[styles.sheetDivider, { backgroundColor: colors.border }]} />
                )}
                <TouchableOpacity
                  style={styles.sheetRow}
                  onPress={() => openSheetPage(page.id, page.label)}
                  activeOpacity={0.7}
                  testID={`sheet-${page.id}`}
                >
                  <View style={[styles.sheetIcon, { backgroundColor: colors.sheetsBg }]}>
                    <IconComp size={16} color={colors.sheets} />
                  </View>
                  <View style={styles.sheetInfo}>
                    <Text style={[styles.sheetRowText, { color: colors.textPrimary, fontWeight: "500" as const }]}>
                      {page.label}
                    </Text>
                    <Text style={[styles.sheetDesc, { color: colors.textMuted, fontWeight: "400" as const }]}>
                      {page.desc}
                    </Text>
                  </View>
                  <ExternalLink size={14} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </Animated.View>
  );
}

function QuickCard({
  title,
  subtitle,
  icon,
  iconBg,
  onPress,
  testID,
  colors,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  onPress: () => void;
  testID: string;
  colors: ReturnType<typeof useTheme>["colors"];
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.93,
      useNativeDriver: true,
      speed: 60,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const onPressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  }, [scaleAnim]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  return (
    <Animated.View style={[styles.quickCardWrap, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={[
          styles.quickCard,
          {
            backgroundColor: colors.bgCard,
            borderColor: colors.border,
            shadowColor: colors.shadow,
          },
        ]}
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.9}
        testID={testID}
      >
        <View style={[styles.quickIcon, { backgroundColor: iconBg }]}>{icon}</View>
        <Text style={[styles.quickTitle, { color: colors.textPrimary, fontWeight: "700" as const }]}>
          {title}
        </Text>
        <Text style={[styles.quickSub, { color: colors.textMuted, fontWeight: "400" as const }]}>
          {subtitle}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const timerStyles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 4,
    marginBottom: 2,
  },
  topRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
  },
  timeDisplay: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2.5,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  timeText: {
    fontSize: 20,
    fontWeight: "900" as const,
    letterSpacing: 1,
  },
  doneLabel: {
    fontSize: 7,
    letterSpacing: 3,
    marginTop: -2,
    fontWeight: "800" as const,
  },
  controlCol: {
    flex: 1,
    gap: 10,
  },
  presetRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 6,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 40,
    alignItems: "center" as const,
  },
  presetText: {
    fontSize: 11,
  },
  btnRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  resetBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  playBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  progressBar: {
    height: 3,
    borderRadius: 2,
    overflow: "hidden" as const,
    marginTop: 12,
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
  },
});

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  sectionGap: { height: 24 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden" as const,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 2,
  },
  settingRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  settingIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  settingContent: { flex: 1 },
  settingLabel: {
    fontSize: 11,
    letterSpacing: 0.4,
    marginBottom: 4,
    textTransform: "uppercase" as const,
  },
  settingDivider: { height: 1, marginLeft: 66 },
  noRigText: {
    fontSize: 13,
    fontStyle: "italic" as const,
    paddingVertical: 4,
  },
  profileBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: "flex-start" as const,
  },
  profileBadgeText: { fontSize: 12 },
  themeRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  themeContent: {
    flex: 1,
  },
  themeLabel: { fontSize: 15 },
  themeSub: { fontSize: 11, marginTop: 2 },
  quickGrid: {
    flexDirection: "row" as const,
    gap: 10,
  },
  quickCardWrap: {
    flex: 1,
  },
  quickCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    aspectRatio: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 6,
  },
  quickTitle: { fontSize: 12, marginBottom: 1, textAlign: "center" as const },
  quickSub: { fontSize: 10, textAlign: "center" as const },
  sheetRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  sheetDivider: { height: 1, marginLeft: 64 },
  sheetIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  sheetInfo: {
    flex: 1,
  },
  sheetRowText: { fontSize: 14 },
  sheetDesc: { fontSize: 11, marginTop: 2 },
  bottomSpacer: { height: 20 },
});
