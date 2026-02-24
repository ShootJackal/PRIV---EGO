import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, Platform, Dimensions } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const FONT_MONO = Platform.select({ ios: "Courier New", android: "monospace", default: "monospace" });

const ALL_LINES = [
  "Convincing rigs to cooperate...",
  "Making sure both hands are in frame...",
  "Raising daily collection hours to 7hrs...",
  "Making EGO RIGs heavier...",
  "Calibrating the vibes...",
  "Checking if Travis remembered his badge...",
  "Polishing camera lenses remotely...",
  "Untangling USB cables mentally...",
  "Deploying collection drones... jk...",
  "Running rig diagnostics... beep boop...",
  "Warming up the data pipeline...",
  "Asking Redash nicely for data...",
  "Syncing with the mothership...",
  "Counting hours... carry the 1...",
  "Reminding rigs they signed a contract...",
  "Bribing the servers with electricity...",
];

interface Props {
  onFinish: () => void;
}

export default function AppLoadingScreen({ onFinish }: Props) {
  const [lines, setLines] = useState<string[]>([]);
  const fadeOut = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const cursorAnim = useRef(new Animated.Value(0)).current;
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    const shuffled = [...ALL_LINES].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 5);

    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(cursorAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ])
    );
    blink.start();

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    }).start();

    const timers: ReturnType<typeof setTimeout>[] = [];

    setLines(["$ ego-system --boot"]);

    selected.forEach((line, i) => {
      timers.push(
        setTimeout(() => {
          setLines((prev) => [...prev, `> ${line}`]);
        }, 350 + i * 420)
      );
    });

    timers.push(
      setTimeout(() => {
        setLines((prev) => [...prev, "[ OK ] System online. Let's collect."]);
      }, 350 + selected.length * 420)
    );

    timers.push(
      setTimeout(() => {
        blink.stop();
        Animated.timing(fadeOut, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }).start(() => {
          onFinishRef.current();
        });
      }, 650 + selected.length * 420)
    );

    return () => {
      timers.forEach(clearTimeout);
      blink.stop();
    };
  }, [fadeOut, progressAnim, cursorAnim]);

  return (
    <Animated.View style={[s.container, { opacity: fadeOut }]}>
      <View style={s.terminal}>
        <View style={s.headerBar}>
          <View style={s.dotRow}>
            <View style={[s.dot, { backgroundColor: "#FF5F57" }]} />
            <View style={[s.dot, { backgroundColor: "#FEBC2E" }]} />
            <View style={[s.dot, { backgroundColor: "#28C840" }]} />
          </View>
          <Text style={s.headerTitle}>ego-system — boot</Text>
        </View>

        <View style={s.body}>
          {lines.map((line, i) => {
            const isCmd = line.startsWith("$");
            const isOk = line.startsWith("[ OK ]");
            return (
              <Text
                key={`boot_${i}`}
                style={[
                  s.line,
                  isCmd && s.cmdLine,
                  isOk && s.okLine,
                ]}
              >
                {line}
              </Text>
            );
          })}
          <Animated.Text style={[s.cursor, { opacity: cursorAnim }]}>
            {"▌"}
          </Animated.Text>
        </View>

        <View style={s.progressTrack}>
          <Animated.View
            style={[
              s.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>
      </View>

      <Text style={s.brand}>EGO COLLECTION INTELLIGENCE</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#080808",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  terminal: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 400,
    backgroundColor: "#111111",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2A2A2A",
    overflow: "hidden",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1E1E1E",
  },
  dotRow: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  headerTitle: {
    color: "#555555",
    fontSize: 11,
    fontFamily: FONT_MONO,
    letterSpacing: 0.5,
  },
  body: {
    padding: 16,
    minHeight: 200,
  },
  line: {
    color: "#9B7BF7",
    fontSize: 12,
    fontFamily: FONT_MONO,
    lineHeight: 24,
    letterSpacing: 0.3,
  },
  cmdLine: {
    color: "#34D399",
  },
  okLine: {
    color: "#34D399",
    fontWeight: "700" as const,
  },
  cursor: {
    color: "#9B7BF7",
    fontSize: 14,
    fontFamily: FONT_MONO,
    marginTop: 2,
  },
  progressTrack: {
    height: 3,
    backgroundColor: "#1A1A1A",
  },
  progressFill: {
    height: 3,
    backgroundColor: "#9B7BF7",
    borderRadius: 2,
  },
  brand: {
    color: "#333333",
    fontSize: 10,
    fontFamily: FONT_MONO,
    letterSpacing: 3,
    marginTop: 24,
  },
});
