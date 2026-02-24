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
  const [percent, setPercent] = useState(0);
  const fadeOut = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const cursorAnim = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const terminalOpacity = useRef(new Animated.Value(0)).current;
  const enterOpacity = useRef(new Animated.Value(0)).current;
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    const id = progressAnim.addListener(({ value }) => {
      setPercent(Math.round(value * 100));
    });
    return () => progressAnim.removeListener(id);
  }, [progressAnim]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 35,
        friction: 9,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 1100,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      Animated.timing(terminalOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, 1000);

    const shuffled = [...ALL_LINES].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 10);

    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(cursorAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ])
    );
    blink.start();

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 13000,
      useNativeDriver: false,
    }).start();

    const timers: ReturnType<typeof setTimeout>[] = [];

    setLines(["$ taskflow --boot --verbose"]);

    selected.forEach((line, i) => {
      timers.push(
        setTimeout(() => {
          setLines((prev) => [...prev, `> ${line}`]);
        }, 1100 + i * 1050)
      );
    });

    timers.push(
      setTimeout(() => {
        setLines((prev) => [...prev, "[ OK ] All systems nominal. Welcome, Collector."]);
      }, 1100 + selected.length * 1050)
    );

    timers.push(
      setTimeout(() => {
        blink.stop();
        setBootComplete(true);
        Animated.timing(enterOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }, 2200 + selected.length * 1050)
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
    enterOpacity,
  ]);

  const handleEnter = useCallback(() => {
    Animated.timing(fadeOut, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
    }).start(() => {
      onFinishRef.current();
    });
  }, [fadeOut]);

  return (
    <Animated.View style={[s.container, { opacity: fadeOut }]}>
      <Animated.View
        style={[
          s.logoWrap,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        <Image
          source={require("../assets/images/taskflow-logo.png")}
          style={s.logoIcon}
          resizeMode="contain"
        />
        <Text style={s.appName}>TASKFLOW</Text>
        <Text style={s.logoSub}>EGO COLLECTION INTELLIGENCE</Text>
      </Animated.View>

      <Animated.View style={[s.terminal, { opacity: terminalOpacity }]}>
        <View style={s.headerBar}>
          <View style={s.dotRow}>
            <View style={[s.dot, { backgroundColor: "#FF5F57" }]} />
            <View style={[s.dot, { backgroundColor: "#FEBC2E" }]} />
            <View style={[s.dot, { backgroundColor: "#28C840" }]} />
          </View>
          <Text style={s.headerTitle}>taskflow — boot</Text>
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

        <View style={s.progressSection}>
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
          <Text style={s.percentText}>{percent}%</Text>
        </View>
      </Animated.View>

      {bootComplete && (
        <Animated.View style={[s.enterWrap, { opacity: enterOpacity }]}>
          <TouchableOpacity
            onPress={handleEnter}
            activeOpacity={0.8}
            testID="enter-system-btn"
          >
            <View style={s.enterBtn}>
              <Text style={s.enterText}>ENTER</Text>
              <Text style={s.enterArrow}>→</Text>
            </View>
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
    backgroundColor: "#0F0D16",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
    gap: 20,
  },
  logoWrap: {
    alignItems: "center",
    gap: 8,
  },
  logoIcon: {
    width: 72,
    height: 72,
    marginBottom: 6,
  },
  appName: {
    color: "#E0D8F0",
    fontSize: 24,
    fontFamily: "Lexend_700Bold",
    letterSpacing: 8,
  },
  logoSub: {
    color: "#443D58",
    fontSize: 9,
    fontFamily: "Courier New",
    letterSpacing: 3,
    textTransform: "uppercase",
    marginTop: 2,
  },
  terminal: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 400,
    backgroundColor: "#13111C",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#23212E",
    overflow: "hidden",
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 11,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1D1B28",
    backgroundColor: "#100E18",
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
    color: "#443D58",
    fontSize: 11,
    fontFamily: "Courier New",
    letterSpacing: 0.5,
  },
  body: {
    padding: 14,
    minHeight: 180,
  },
  line: {
    color: "#8B7FC0",
    fontSize: 11.5,
    fontFamily: "Courier New",
    lineHeight: 22,
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
    color: "#8B7FC0",
    fontSize: 14,
    fontFamily: "Courier New",
    marginTop: 2,
  },
  progressSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: "#1A182A",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 3,
    backgroundColor: "#7C3AED",
    borderRadius: 2,
  },
  percentText: {
    color: "#443D58",
    fontSize: 10,
    fontFamily: "Courier New",
    letterSpacing: 0.5,
    width: 32,
    textAlign: "right" as const,
  },
  enterWrap: {
    marginTop: 10,
    alignItems: "center",
  },
  enterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 34,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.2)",
    backgroundColor: "rgba(167,139,250,0.05)",
  },
  enterText: {
    color: "#C4B5FD",
    fontSize: 12,
    fontFamily: "Courier New",
    fontWeight: "700" as const,
    letterSpacing: 3,
  },
  enterArrow: {
    color: "#A78BFA",
    fontSize: 16,
    fontFamily: "Courier New",
  },
  versionTag: {
    color: "#2A2640",
    fontSize: 10,
    fontFamily: "Courier New",
    letterSpacing: 1.5,
    position: "absolute",
    bottom: 40,
  },
});
