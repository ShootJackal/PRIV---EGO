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
  FileSpreadsheet,
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
  Megaphone,
  Plus,
  X,
} from "lucide-react-native";
import { TextInput } from "react-native";
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

const SHEET_PAGES = [
  { id: "log", label: "Assignment Log", icon: ClipboardList },
  { id: "taskActuals", label: "Task Actuals", icon: BarChart3 },
  { id: "admin", label: "Admin Dashboard", icon: LayoutDashboard },
];

const TIMER_DURATIONS = [5, 10, 15, 20, 25, 30];

function SectionHeader({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[sectionStyles.label, { color: colors.textMuted, fontFamily: "Lexend_700Bold" }]}>
      {label}
    </Text>
  );
}

const sectionStyles = StyleSheet.create({
  label: {
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase" as const,
    marginBottom: 10,
    marginTop: 4,
    paddingHorizontal: 2,
  },
});

function CompactTimer() {
  const { colors, isDark } = useTheme();
  const [selectedMinutes, setSelectedMinutes] = useState(10);
  const [secondsLeft, setSecondsLeft] = useState(10 * 60);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const totalSeconds = selectedMinutes * 60;
  const progress = (totalSeconds - secondsLeft) / totalSeconds;
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
      setShowPicker(false);
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

  const ringColor = finished
    ? colors.cancel
    : running
    ? colors.accent
    : colors.textMuted;

  return (
    <Animated.View style={[timerStyles.card, {
      backgroundColor: colors.bgCard,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      transform: [{ scale: pulseAnim }],
    }]}>
      <View style={timerStyles.row}>
        <View style={[timerStyles.timeCircle, {
          borderColor: ringColor,
          backgroundColor: finished ? colors.cancel + '15' : running ? colors.accentSoft : colors.bgElevated,
        }]}>
          <Text style={[timerStyles.timeText, {
            color: finished ? colors.cancel : running ? colors.textPrimary : colors.textSecondary,
            fontFamily: "Lexend_700Bold",
          }]}>
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </Text>
          {finished && (
            <Text style={[timerStyles.doneText, { color: colors.cancel, fontFamily: "Lexend_700Bold" }]}>UP</Text>
          )}
        </View>

        <TouchableOpacity
          style={[timerStyles.durBtn, { backgroundColor: colors.accentSoft, borderColor: colors.accentDim }]}
          onPress={() => setShowPicker((v) => !v)}
          activeOpacity={0.75}
        >
          <Timer size={12} color={colors.accent} />
          <Text style={[timerStyles.durText, { color: colors.accent, fontFamily: "Lexend_700Bold" }]}>
            {selectedMinutes}m
          </Text>
          <ChevronDown size={10} color={colors.accent} />
        </TouchableOpacity>

        <View style={timerStyles.btnGroup}>
          <TouchableOpacity
            style={[timerStyles.resetBtn, { backgroundColor: colors.bgInput, borderColor: colors.border }]}
            onPress={reset}
            activeOpacity={0.75}
          >
            <RotateCcw size={15} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[timerStyles.playBtn, {
              backgroundColor: finished ? colors.cancel : running ? colors.completeBg : colors.accent,
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

      {!finished && (
        <View style={[timerStyles.progressBar, { backgroundColor: colors.bgInput }]}>
          <View
            style={[
              timerStyles.progressFill,
              {
                backgroundColor: running ? colors.accent : colors.textMuted,
                width: `${Math.round(progress * 100)}%` as any,
              },
            ]}
          />
        </View>
      )}

      {showPicker && (
        <View style={[timerStyles.pickerRow, { borderTopColor: colors.border }]}>
          {TIMER_DURATIONS.map((m) => (
            <TouchableOpacity
              key={m}
              style={[
                timerStyles.pickerChip,
                {
                  backgroundColor: m === selectedMinutes ? colors.accent : colors.bgInput,
                  borderColor: m === selectedMinutes ? colors.accent : colors.border,
                },
              ]}
              onPress={() => selectDuration(m)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  timerStyles.pickerText,
                  {
                    color: m === selectedMinutes ? colors.white : colors.textPrimary,
                    fontFamily: m === selectedMinutes ? "Lexend_700Bold" : "Lexend_400Regular",
                  },
                ]}
              >
                {m}m
              </Text>
            </TouchableOpacity>
          ))}
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
    announcements,
    setAnnouncements,
  } = useCollection();

  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [rigNumberInput, setRigNumberInput] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

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

  const handleRigNumberChange = useCallback(
    (text: string) => {
      const cleaned = text.replace(/[^0-9]/g, "");
      setRigNumberInput(cleaned);
      if (cleaned.length > 0) {
        const rigId = `EGO-PROD-${cleaned}`;
        setSelectedRig(rigId);
      }
    },
    [setSelectedRig]
  );

  useEffect(() => {
    if (selectedRig && selectedRig.startsWith("EGO-PROD-")) {
      const num = selectedRig.replace("EGO-PROD-", "");
      if (num !== rigNumberInput) {
        setRigNumberInput(num);
      }
    }
  }, [selectedRig]);

  const handleAddAnnouncement = useCallback(() => {
    const text = newAnnouncement.trim();
    if (!text) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAnnouncements([...announcements, text]);
    setNewAnnouncement("");
  }, [newAnnouncement, announcements, setAnnouncements]);

  const handleRemoveAnnouncement = useCallback(
    (index: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const updated = announcements.filter((_, i) => i !== index);
      setAnnouncements(updated);
    },
    [announcements, setAnnouncements]
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
        <SectionHeader label="My Profile" />

        <View style={cardStyle}>
          <View style={styles.settingRow}>
            <View style={[styles.settingIconWrap, { backgroundColor: colors.accentSoft }]}>
              <User size={17} color={colors.accent} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: colors.textMuted, fontFamily: "Lexend_600SemiBold" }]}>
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
                  <Text style={[styles.settingLabel, { color: colors.textMuted, fontFamily: "Lexend_600SemiBold" }]}>
                    Your Rig
                  </Text>
                  <View style={styles.rigInputRow}>
                    <Text style={[styles.rigPrefix, { color: colors.textMuted }]}>EGO-PROD-</Text>
                    <TextInput
                      style={[
                        styles.rigNumberInput,
                        {
                          backgroundColor: colors.bgInput,
                          borderColor: colors.border,
                          color: colors.textPrimary,
                        },
                      ]}
                      value={rigNumberInput}
                      onChangeText={handleRigNumberChange}
                      placeholder="#"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      maxLength={2}
                      testID="rig-number-input"
                    />
                  </View>
                  {rigOptions.length > 0 && (
                    <View style={styles.rigChipsRow}>
                      {rigOptions.map((r) => (
                        <TouchableOpacity
                          key={r.value}
                          style={[
                            styles.rigChip,
                            {
                              backgroundColor: r.value === selectedRig ? colors.accentSoft : colors.bgInput,
                              borderColor: r.value === selectedRig ? colors.accent : colors.border,
                            },
                          ]}
                          onPress={() => {
                            handleSelectRig(r.value);
                            const num = r.value.replace("EGO-PROD-", "");
                            setRigNumberInput(num);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.rigChipText,
                              { color: r.value === selectedRig ? colors.accent : colors.textSecondary },
                            ]}
                          >
                            {r.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
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
            <Text style={[styles.profileBadgeText, { color: colors.accent, fontFamily: "Lexend_600SemiBold" }]}>
              {selectedCollectorName} · {selectedRig}
            </Text>
          </View>
        )}

        <View style={styles.sectionGap} />
        <SectionHeader label="Collection Timer" />
        <CompactTimer />

        <View style={styles.sectionGap} />
        <SectionHeader label="Appearance" />

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
          <Text style={[styles.themeLabel, { color: colors.textPrimary, fontFamily: "Lexend_500Medium" }]}>
            {isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          </Text>
          <ChevronRight size={16} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.sectionGap} />
        <SectionHeader label="Quick Actions" />

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
        <SectionHeader label="Verify Data" />

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
                  <Text style={[styles.sheetRowText, { color: colors.textPrimary, fontFamily: "Lexend_500Medium" }]}>
                    {page.label}
                  </Text>
                  <ChevronRight size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <View style={styles.sectionGap} />
        <SectionHeader label="Announcements" />

        <View style={cardStyle}>
          <View style={styles.announcementInputRow}>
            <View style={[styles.settingIconWrap, { backgroundColor: isDark ? '#2A1B4E' : '#FDF3E0' }]}>
              <Megaphone size={17} color={isDark ? colors.accent : colors.statusPending} />
            </View>
            <TextInput
              style={[
                styles.announcementInput,
                {
                  backgroundColor: colors.bgInput,
                  borderColor: colors.border,
                  color: colors.textPrimary,
                  fontFamily: 'Lexend_400Regular',
                },
              ]}
              value={newAnnouncement}
              onChangeText={setNewAnnouncement}
              placeholder="Type announcement..."
              placeholderTextColor={colors.textMuted}
              testID="announcement-input"
            />
            <TouchableOpacity
              style={[
                styles.announcementAddBtn,
                {
                  backgroundColor: newAnnouncement.trim() ? colors.accent : colors.bgInput,
                },
              ]}
              onPress={handleAddAnnouncement}
              activeOpacity={0.75}
              disabled={!newAnnouncement.trim()}
            >
              <Plus size={16} color={newAnnouncement.trim() ? colors.white : colors.textMuted} />
            </TouchableOpacity>
          </View>

          {announcements.length > 0 && (
            <View style={[styles.announcementList, { borderTopColor: colors.border }]}>
              {announcements.map((item, idx) => (
                <View
                  key={`ann_${idx}`}
                  style={[
                    styles.announcementItem,
                    idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.announcementText,
                      { color: colors.textPrimary, fontFamily: 'Lexend_400Regular' },
                    ]}
                    numberOfLines={2}
                  >
                    {item}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveAnnouncement(idx)}
                    activeOpacity={0.6}
                    style={[styles.announcementRemove, { backgroundColor: colors.cancelBg }]}
                  >
                    <X size={12} color={colors.cancel} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {announcements.length === 0 && (
            <Text
              style={[
                styles.announcementEmpty,
                { color: colors.textMuted, fontFamily: 'Lexend_400Regular' },
              ]}
            >
              No active announcements. Add one to show on the LIVE ticker.
            </Text>
          )}
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
        <Text style={[styles.quickTitle, { color: colors.textPrimary, fontFamily: "Lexend_700Bold" }]}>
          {title}
        </Text>
        <Text style={[styles.quickSub, { color: colors.textMuted, fontFamily: "Lexend_400Regular" }]}>
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
    padding: 12,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 4,
    marginBottom: 2,
  },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  timeCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2.5,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  timeText: {
    fontSize: 18,
    letterSpacing: 0.5,
  },
  doneText: {
    fontSize: 8,
    letterSpacing: 2,
    marginTop: -1,
  },
  durBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  durText: {
    fontSize: 13,
  },
  btnGroup: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginLeft: "auto" as const,
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
    width: 46,
    height: 46,
    borderRadius: 16,
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
    marginTop: 10,
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
  },
  pickerRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 7,
    paddingTop: 10,
    borderTopWidth: 1,
    marginTop: 10,
  },
  pickerChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 44,
    alignItems: "center" as const,
  },
  pickerText: {
    fontSize: 12,
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
  rigInputRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  rigPrefix: {
    fontSize: 15,
    fontWeight: "500" as const,
  },
  rigNumberInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 17,
    fontWeight: "700" as const,
    width: 56,
    textAlign: "center" as const,
  },
  rigChipsRow: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 6,
    marginTop: 8,
  },
  rigChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  rigChipText: {
    fontSize: 11,
    fontWeight: "600" as const,
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
  themeLabel: { flex: 1, fontSize: 15 },
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
    paddingVertical: 15,
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
  sheetRowText: { flex: 1, fontSize: 15 },
  bottomSpacer: { height: 20 },
  announcementInputRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  announcementInput: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    borderWidth: 1,
  },
  announcementAddBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  announcementList: {
    borderTopWidth: 1,
  },
  announcementItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  announcementText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  announcementRemove: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  announcementEmpty: {
    fontSize: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
    lineHeight: 17,
  },
});
