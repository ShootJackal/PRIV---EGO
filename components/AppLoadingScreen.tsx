import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  Dimensions,
  Image,
  TouchableOpacity,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const FONT_MONO = Platform.select({
  ios: "Courier New",
  android: "monospace",
  default: "monospace",
});

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
  "Negotiating with the spreadsheet gods...",
  "Confirming collectors are awake...",
  "Recalculating collection efficiency...",
  "Telling the rigs it's almost Friday...",
];

interface Props {
  onFinish: () => void;
}

export default function AppLoadingScreen({ onFinish }: Props) {
  const [lines, setLines] = useState<string[]>([]);
  const [bootComplete, setBootComplete] = useState(false);
  const fadeOut = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const cursorAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const terminalOpacity = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.06)).current;
  const enterOpacity = useRef(new Animated.Value(0)).current;
  const enterPulse = useRef(new Animated.Value(0.92)).current;
  const enterGlow = useRef(new Animated.Value(0.3)).current;
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 35,
        friction: 8,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.18,
          duration: 2500,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.05,
          duration: 2500,
          useNativeDriver: false,
        }),
      ])
    ).start();

    setTimeout(() => {
      Animated.timing(terminalOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 800);

    const shuffled = [...ALL_LINES].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 10);

    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(cursorAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ])
    );
    blink.start();

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 11000,
      useNativeDriver: false,
    }).start();

    const timers: ReturnType<typeof setTimeout>[] = [];

    setLines(["$ taskflow --boot --verbose"]);

    selected.forEach((line, i) => {
      timers.push(
        setTimeout(() => {
          setLines((prev) => [...prev, `> ${line}`]);
        }, 900 + i * 900)
      );
    });

    timers.push(
      setTimeout(() => {
        setLines((prev) => [...prev, "[ OK ] All systems nominal. Welcome, Collector."]);
      }, 900 + selected.length * 900)
    );

    timers.push(
      setTimeout(() => {
        blink.stop();
        setBootComplete(true);
        Animated.timing(enterOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }).start();
        Animated.loop(
          Animated.sequence([
            Animated.timing(enterPulse, {
              toValue: 1.04,
              duration: 1400,
              useNativeDriver: true,
            }),
            Animated.timing(enterPulse, {
              toValue: 0.96,
              duration: 1400,
              useNativeDriver: true,
            }),
          ])
        ).start();
        Animated.loop(
          Animated.sequence([
            Animated.timing(enterGlow, {
              toValue: 0.7,
              duration: 1200,
              useNativeDriver: false,
            }),
            Animated.timing(enterGlow, {
              toValue: 0.25,
              duration: 1200,
              useNativeDriver: false,
            }),
          ])
        ).start();
      }, 1800 + selected.length * 900)
    );

    return () => {
      timers.forEach(clearTimeout);
      blink.stop();
    };
  }, [
    fadeOut,
    progressAnim,
    cursorAnim,
    logoScale,
    logoOpacity,
    terminalOpacity,
    glowAnim,
    enterOpacity,
    enterPulse,
    enterGlow,
  ]);

  const handleEnter = useCallback(() => {
    Animated.parallel([
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1.1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onFinishRef.current();
    });
  }, [fadeOut, logoScale]);

  return (
    <Animated.View style={[s.container, { opacity: fadeOut }]}>
      <Animated.View style={[s.bgGlow, { opacity: glowAnim }]} />
      <View style={s.bgGlowSmall} />

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
                style={[s.line, isCmd && s.cmdLine, isOk && s.okLine]}
              >
                {line}
              </Text>
            );
          })}
          {!bootComplete && (
            <Animated.Text style={[s.cursor, { opacity: cursorAnim }]}>
              {"▌"}
            </Animated.Text>
          )}
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

      {bootComplete && (
        <Animated.View style={[s.enterWrap, { opacity: enterOpacity }]}>
          <TouchableOpacity
            onPress={handleEnter}
            activeOpacity={0.85}
            testID="enter-system-btn"
          >
            <Animated.View
              style={[s.enterBtn, { transform: [{ scale: enterPulse }] }]}
            >
              <Animated.View
                style={[s.enterBtnGlow, { opacity: enterGlow }]}
              />
              <Text style={s.enterText}>ENTER SYSTEM</Text>
              <Text style={s.enterSub}>tap to continue</Text>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      )}

      <Text style={s.versionTag}>v1.0 · EGO Data Division</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#08060E",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
    gap: 24,
  },
  bgGlow: {
    position: "absolute",
    top: "12%",
    left: "50%",
    marginLeft: -180,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: "#7C3AED",
  },
  bgGlowSmall: {
    position: "absolute",
    bottom: "18%",
    right: "15%",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#6D28D9",
    opacity: 0.04,
  },
  logoWrap: {
    alignItems: "center",
    gap: 12,
  },
  logoIconBox: {
    shadowColor: "#A78BFA",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 35,
    elevation: 24,
  },
  logoIcon: {
    width: 260,
    height: 75,
    tintColor: "#E8E0FF",
  },
  logoSub: {
    color: "#5C5075",
    fontSize: 9,
    fontFamily: "Courier New",
    letterSpacing: 3.5,
    textTransform: "uppercase",
  },
  terminal: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 420,
    backgroundColor: "#0D0B16",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#2A2640",
    overflow: "hidden",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 20,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1E1A2E",
    backgroundColor: "#0A0814",
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
    color: "#5C5075",
    fontSize: 11,
    fontFamily: FONT_MONO,
    letterSpacing: 0.5,
  },
  body: {
    padding: 16,
    minHeight: 200,
  },
  line: {
    color: "#A78BFA",
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
    color: "#A78BFA",
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
    backgroundColor: "#7C3AED",
    borderRadius: 2,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  enterWrap: {
    marginTop: 8,
    alignItems: "center",
  },
  enterBtn: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#7C3AED50",
    backgroundColor: "#7C3AED18",
    alignItems: "center",
    gap: 4,
    overflow: "hidden",
  },
  enterBtnGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#7C3AED",
    borderRadius: 28,
  },
  enterText: {
    color: "#E8E0FF",
    fontSize: 15,
    fontFamily: FONT_MONO,
    fontWeight: "800" as const,
    letterSpacing: 3,
  },
  enterSub: {
    color: "#7C5CBF",
    fontSize: 10,
    fontFamily: FONT_MONO,
    letterSpacing: 1,
  },
  versionTag: {
    color: "#2E2840",
    fontSize: 10,
    fontFamily: FONT_MONO,
    letterSpacing: 1.5,
    position: "absolute",
    bottom: 40,
  },
});
