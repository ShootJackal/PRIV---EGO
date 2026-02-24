import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Animated, Platform, Dimensions, Image } from "react-native";

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
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const terminalOpacity = useRef(new Animated.Value(0)).current;
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 8,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      Animated.timing(terminalOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 400);

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
      duration: 3200,
      useNativeDriver: false,
    }).start();

    const timers: ReturnType<typeof setTimeout>[] = [];

    setLines(["$ taskflow --boot"]);

    selected.forEach((line, i) => {
      timers.push(
        setTimeout(() => {
          setLines((prev) => [...prev, `> ${line}`]);
        }, 500 + i * 440)
      );
    });

    timers.push(
      setTimeout(() => {
        setLines((prev) => [...prev, "[ OK ] System online. Let's collect."]);
      }, 500 + selected.length * 440)
    );

    timers.push(
      setTimeout(() => {
        blink.stop();
        Animated.timing(fadeOut, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => {
          onFinishRef.current();
        });
      }, 800 + selected.length * 440)
    );

    return () => {
      timers.forEach(clearTimeout);
      blink.stop();
    };
  }, [fadeOut, progressAnim, cursorAnim, logoScale, logoOpacity, terminalOpacity]);

  return (
    <Animated.View style={[s.container, { opacity: fadeOut }]}>
      <View style={s.bgGlow} />

      <Animated.View
        style={[
          s.logoWrap,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        <View style={s.logoIconBox}>
          <Image
            source={require("../assets/images/taskflow-logo.png")}
            style={s.logoIcon}
            resizeMode="contain"
          />
        </View>
        <Text style={s.logoName}>TaskFlow</Text>
        <Text style={s.logoSub}>EGO COLLECTION INTELLIGENCE</Text>
      </Animated.View>

      <Animated.View style={[s.terminal, { opacity: terminalOpacity }]}>
        <View style={s.headerBar}>
          <View style={s.dotRow}>
            <View style={[s.dot, { backgroundColor: "#FF5F57" }]} />
            <View style={[s.dot, { backgroundColor: "#FEBC2E" }]} />
            <View style={[s.dot, { backgroundColor: "#28C840" }]} />
          </View>
          <Text style={s.headerTitle}>taskflow — boot sequence</Text>
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
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#07050F",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
    gap: 28,
  },
  bgGlow: {
    position: "absolute",
    top: "20%",
    left: "50%",
    marginLeft: -120,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "#7C3AED",
    opacity: 0.08,
  },
  logoWrap: {
    alignItems: "center",
    gap: 10,
  },
  logoIconBox: {
    width: 80,
    height: 80,
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#9B7BF7",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  logoIcon: {
    width: 80,
    height: 80,
  },
  logoName: {
    color: "#EEE8FF",
    fontSize: 28,
    fontFamily: "Lexend_700Bold",
    letterSpacing: -0.5,
  },
  logoSub: {
    color: "#5C5475",
    fontSize: 9,
    fontFamily: "Courier New",
    letterSpacing: 3,
    textTransform: "uppercase",
  },
  terminal: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 400,
    backgroundColor: "#0F0F1A",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2A2A3D",
    overflow: "hidden",
    shadowColor: "#9B7BF7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1E1E2A",
    backgroundColor: "#0A0A14",
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
    color: "#5C5475",
    fontSize: 11,
    fontFamily: FONT_MONO,
    letterSpacing: 0.5,
  },
  body: {
    padding: 16,
    minHeight: 160,
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
    backgroundColor: "#1A1A2E",
  },
  progressFill: {
    height: 3,
    backgroundColor: "#9B7BF7",
    borderRadius: 2,
    shadowColor: "#9B7BF7",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
});
