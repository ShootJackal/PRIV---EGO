import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, Text, StyleSheet, Animated, Platform, Dimensions, TouchableOpacity } from "react-native";
import { ThemeProvider, useTheme } from "../providers/ThemeProvider";
import { CollectionProvider } from "../providers/CollectionProvider";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const FONT_MONO = Platform.select({ ios: "Courier New", android: "monospace", default: "monospace" });

const BOOT_MESSAGES_POOL = [
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
  "Teaching rigs to smile for the camera...",
  "Optimizing snack break algorithms...",
  "Downloading more RAM... just kidding...",
  "Asking the rigs to please hold still...",
  "Bribing the Wi-Fi gods...",
];

const SYSTEM_LINES = [
  "TASKFLOW SYSTEM v3.0.1",
  "Initializing modules...",
  "Loading collection engine...",
  "Connecting to data pipeline...",
  "Authenticating session...",
];

function pickRandomMessages(count: number): string[] {
  const shuffled = [...BOOT_MESSAGES_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function BootSequence({ onComplete }: { onComplete: () => void }) {
  const { colors, isDark } = useTheme();
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [currentLineText, setCurrentLineText] = useState("");
  const [phase, setPhase] = useState<"booting" | "ready">("booting");
  const fadeOut = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const cursorBlink = useRef(new Animated.Value(1)).current;
  const enterBtnScale = useRef(new Animated.Value(0)).current;
  const enterGlow = useRef(new Animated.Value(0.4)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;

  const allMessages = useRef([
    ...SYSTEM_LINES,
    ...pickRandomMessages(5),
    "Systems online. Welcome to TaskFlow.",
  ]).current;

  const currentLineIndex = useRef(0);
  const charIndex = useRef(0);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, speed: 10, bounciness: 6, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]).start();

    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorBlink, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(cursorBlink, { toValue: 1, duration: 400, useNativeDriver: true }),
      ])
    );
    blink.start();

    return () => {
      blink.stop();
    };
  }, [logoScale, logoOpacity, cursorBlink]);

  useEffect(() => {
    if (phase !== "booting") return;

    const typeChar = () => {
      if (currentLineIndex.current >= allMessages.length) {
        setPhase("ready");
        return;
      }

      const fullLine = allMessages[currentLineIndex.current];

      if (charIndex.current < fullLine.length) {
        charIndex.current += 1;
        setCurrentLineText(fullLine.slice(0, charIndex.current));

        const progressPct = ((currentLineIndex.current + charIndex.current / fullLine.length) / allMessages.length) * 100;
        Animated.timing(progressWidth, {
          toValue: progressPct,
          duration: 50,
          useNativeDriver: false,
        }).start();

        const baseSpeed = 35;
        const variance = Math.random() * 30;
        setTimeout(typeChar, baseSpeed + variance);
      } else {
        const isSystem = currentLineIndex.current < SYSTEM_LINES.length;
        const prefix = isSystem ? "▸ " : "$ ";
        setDisplayedLines((prev) => [...prev.slice(-8), `${prefix}${fullLine}`]);
        setCurrentLineText("");
        charIndex.current = 0;
        currentLineIndex.current += 1;

        const pauseTime = isSystem ? 200 : 400;
        setTimeout(typeChar, pauseTime);
      }
    };

    const startDelay = setTimeout(typeChar, 1000);
    return () => clearTimeout(startDelay);
  }, [phase, allMessages, progressWidth]);

  useEffect(() => {
    if (phase !== "ready") return;

    Animated.timing(progressWidth, {
      toValue: 100,
      duration: 400,
      useNativeDriver: false,
    }).start();

    Animated.spring(enterBtnScale, {
      toValue: 1,
      speed: 10,
      bounciness: 8,
      useNativeDriver: true,
      delay: 300,
    }).start();

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(enterGlow, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(enterGlow, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
      ])
    );
    glow.start();

    return () => glow.stop();
  }, [phase, enterBtnScale, enterGlow, progressWidth]);

  const handleEnter = useCallback(() => {
    Animated.timing(fadeOut, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      onComplete();
    });
  }, [fadeOut, onComplete]);

  const accentColor = colors.accent;
  const dimColor = colors.terminalDim;
  const bgColor = isDark ? '#0C0C0E' : '#FAF8F3';

  return (
    <Animated.View style={[bootStyles.container, { backgroundColor: bgColor, opacity: fadeOut }]}>
      <Animated.View style={[bootStyles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <Text style={[bootStyles.logoText, { color: accentColor, fontFamily: FONT_MONO }]}>
          TASKFLOW
        </Text>
        <Text style={[bootStyles.logoSub, { color: dimColor, fontFamily: FONT_MONO }]}>
          COLLECTION SYSTEM
        </Text>
      </Animated.View>

      <View style={bootStyles.terminalArea}>
        {displayedLines.map((line, idx) => {
          const isSystem = line.startsWith("▸");
          return (
            <Text
              key={`boot_${idx}`}
              style={[
                bootStyles.termLine,
                {
                  color: isSystem ? dimColor : accentColor,
                  fontFamily: FONT_MONO,
                },
              ]}
            >
              {line}
            </Text>
          );
        })}
        {currentLineText !== "" && (
          <View style={bootStyles.typingRow}>
            <Text style={[bootStyles.termLine, { color: colors.terminalGreen, fontFamily: FONT_MONO }]}>
              $ {currentLineText}
            </Text>
            <Animated.Text style={[bootStyles.cursor, { color: colors.terminalGreen, opacity: cursorBlink, fontFamily: FONT_MONO }]}>
              _
            </Animated.Text>
          </View>
        )}
        {currentLineText === "" && phase === "booting" && (
          <Animated.Text style={[bootStyles.cursor, { color: colors.terminalGreen, opacity: cursorBlink, fontFamily: FONT_MONO }]}>
            $ _
          </Animated.Text>
        )}
      </View>

      <View style={bootStyles.progressWrap}>
        <View style={[bootStyles.progressTrack, { backgroundColor: isDark ? '#1E1E24' : '#E0DCD0' }]}>
          <Animated.View
            style={[
              bootStyles.progressFill,
              {
                backgroundColor: accentColor,
                width: progressWidth.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        <Text style={[bootStyles.progressLabel, { color: dimColor, fontFamily: FONT_MONO }]}>
          {phase === "ready" ? "READY" : "LOADING"}
        </Text>
      </View>

      {phase === "ready" && (
        <Animated.View style={[bootStyles.enterWrap, { transform: [{ scale: enterBtnScale }] }]}>
          <Animated.View
            style={[
              bootStyles.enterGlow,
              {
                backgroundColor: accentColor,
                opacity: enterGlow,
              },
            ]}
          />
          <TouchableOpacity
            style={[bootStyles.enterBtn, {
              backgroundColor: accentColor,
              shadowColor: accentColor,
            }]}
            onPress={handleEnter}
            activeOpacity={0.8}
            testID="enter-system-btn"
          >
            <Text style={[bootStyles.enterText, { color: '#FFFFFF', fontFamily: FONT_MONO }]}>
              ENTER SYSTEM
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const bootStyles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  logoWrap: {
    alignItems: "center",
    marginBottom: 48,
  },
  logoText: {
    fontSize: 36,
    fontWeight: "900" as const,
    letterSpacing: 8,
  },
  logoSub: {
    fontSize: 9,
    letterSpacing: 4,
    marginTop: 8,
  },
  terminalArea: {
    width: Dimensions.get("window").width * 0.85,
    maxWidth: 380,
    minHeight: 160,
    paddingBottom: 8,
  },
  termLine: {
    fontSize: 11,
    lineHeight: 20,
    letterSpacing: 0.3,
  },
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cursor: {
    fontSize: 12,
    lineHeight: 20,
  },
  progressWrap: {
    width: Dimensions.get("window").width * 0.6,
    maxWidth: 280,
    marginTop: 32,
    alignItems: "center",
    gap: 8,
  },
  progressTrack: {
    width: "100%",
    height: 2,
    borderRadius: 1,
    overflow: "hidden",
  },
  progressFill: {
    height: 2,
    borderRadius: 1,
  },
  progressLabel: {
    fontSize: 9,
    letterSpacing: 2,
  },
  enterWrap: {
    marginTop: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  enterGlow: {
    position: "absolute",
    width: 220,
    height: 56,
    borderRadius: 28,
    opacity: 0.3,
  },
  enterBtn: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 28,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  enterText: {
    fontSize: 13,
    fontWeight: "800" as const,
    letterSpacing: 3,
  },
});

function RootLayoutNav() {
  const { colors, isDark } = useTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <CollectionProvider>
        <StatusBar style={isDark ? "light" : "dark"} />
        <Stack screenOptions={{ headerBackTitle: "Back" }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </CollectionProvider>
    </GestureHandlerRootView>
  );
}

function AppWithBoot() {
  const [booted, setBooted] = useState(false);
  const handleBootComplete = useCallback(() => setBooted(true), []);

  return (
    <>
      <RootLayoutNav />
      {!booted && <BootSequence onComplete={handleBootComplete} />}
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppWithBoot />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
