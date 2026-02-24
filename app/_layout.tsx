import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, Text, StyleSheet, Animated, Platform, Dimensions } from "react-native";
import { ThemeProvider, useTheme } from "../providers/ThemeProvider";
import { CollectionProvider } from "../providers/CollectionProvider";
import {
  useFonts,
  Lexend_400Regular,
  Lexend_500Medium,
  Lexend_600SemiBold,
  Lexend_700Bold,
} from "@expo-google-fonts/lexend";

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

function pickRandomMessages(count: number): string[] {
  const shuffled = [...BOOT_MESSAGES_POOL].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function BootSequence({ onComplete }: { onComplete: () => void }) {
  const { colors, isDark } = useTheme();
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [typingLine, setTypingLine] = useState("");
  const [typingIndex, setTypingIndex] = useState(0);
  const [currentMsgIndex, setCurrentMsgIndex] = useState(0);
  const [phase, setPhase] = useState<"init" | "typing" | "ready" | "fade">("init");
  const fadeOut = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const cursorBlink = useRef(new Animated.Value(1)).current;

  const messages = useRef(pickRandomMessages(3)).current;
  const systemLines = useRef([
    "EGO SYSTEM v2.4.1",
    "Initializing modules...",
  ]).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, speed: 12, bounciness: 8, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorBlink, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(cursorBlink, { toValue: 1, duration: 400, useNativeDriver: true }),
      ])
    );
    blink.start();

    const initTimer = setTimeout(() => {
      setPhase("typing");
      setBootLines(systemLines);
    }, 800);

    return () => {
      clearTimeout(initTimer);
      blink.stop();
    };
  }, [logoScale, logoOpacity, cursorBlink, systemLines]);

  useEffect(() => {
    if (phase !== "typing") return;
    if (currentMsgIndex >= messages.length) {
      setPhase("ready");
      return;
    }

    const fullMsg = messages[currentMsgIndex];
    if (typingIndex < fullMsg.length) {
      const speed = 25 + Math.random() * 20;
      const timer = setTimeout(() => {
        setTypingLine(fullMsg.slice(0, typingIndex + 1));
        setTypingIndex(typingIndex + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setBootLines((prev) => [...prev, `$ ${fullMsg}`]);
        setTypingLine("");
        setTypingIndex(0);
        setCurrentMsgIndex(currentMsgIndex + 1);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [phase, currentMsgIndex, typingIndex, messages]);

  useEffect(() => {
    if (phase !== "ready") return;

    Animated.timing(progressWidth, {
      toValue: 100,
      duration: 1200,
      useNativeDriver: false,
    }).start();

    const readyTimer = setTimeout(() => {
      setBootLines((prev) => [...prev, "$ Systems online. Welcome to EGO."]);
      setPhase("fade");
    }, 600);

    return () => clearTimeout(readyTimer);
  }, [phase, progressWidth]);

  useEffect(() => {
    if (phase !== "fade") return;

    const fadeTimer = setTimeout(() => {
      Animated.timing(fadeOut, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        onComplete();
      });
    }, 800);

    return () => clearTimeout(fadeTimer);
  }, [phase, fadeOut, onComplete]);

  const accentColor = isDark ? '#E03030' : '#2563EB';
  const dimColor = isDark ? '#444' : '#999';
  const bgColor = isDark ? '#0A0A0A' : '#FAFAF0';

  return (
    <Animated.View style={[bootStyles.container, { backgroundColor: bgColor, opacity: fadeOut }]}>
      <Animated.View style={[bootStyles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <Text style={[bootStyles.logoText, { color: accentColor, fontFamily: FONT_MONO }]}>EGO</Text>
        <Text style={[bootStyles.logoSub, { color: dimColor, fontFamily: FONT_MONO }]}>COLLECTION SYSTEM</Text>
      </Animated.View>

      <View style={bootStyles.terminalArea}>
        {bootLines.map((line, idx) => (
          <Text key={`boot_${idx}`} style={[bootStyles.termLine, { color: idx < 2 ? dimColor : accentColor, fontFamily: FONT_MONO }]}>
            {line}
          </Text>
        ))}
        {typingLine !== "" && (
          <View style={bootStyles.typingRow}>
            <Text style={[bootStyles.termLine, { color: colors.terminalGreen, fontFamily: FONT_MONO }]}>
              $ {typingLine}
            </Text>
            <Animated.Text style={[bootStyles.cursor, { color: colors.terminalGreen, opacity: cursorBlink, fontFamily: FONT_MONO }]}>
              _
            </Animated.Text>
          </View>
        )}
        {typingLine === "" && phase === "typing" && (
          <Animated.Text style={[bootStyles.cursor, { color: colors.terminalGreen, opacity: cursorBlink, fontFamily: FONT_MONO }]}>
            $ _
          </Animated.Text>
        )}
      </View>

      <View style={bootStyles.progressWrap}>
        <View style={[bootStyles.progressTrack, { backgroundColor: isDark ? '#222' : '#E0DCCF' }]}>
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
          {phase === "ready" || phase === "fade" ? "READY" : "LOADING"}
        </Text>
      </View>
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
    fontSize: 52,
    fontWeight: "900" as const,
    letterSpacing: 12,
  },
  logoSub: {
    fontSize: 10,
    letterSpacing: 4,
    marginTop: 6,
  },
  terminalArea: {
    width: Dimensions.get("window").width * 0.8,
    maxWidth: 360,
    minHeight: 120,
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
  const [fontsLoaded] = useFonts({
    Lexend_400Regular,
    Lexend_500Medium,
    Lexend_600SemiBold,
    Lexend_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppWithBoot />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
