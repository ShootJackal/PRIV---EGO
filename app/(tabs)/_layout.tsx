import { Tabs, router } from "expo-router";
import { Send, Wrench, BarChart3, Radio } from "lucide-react-native";
import React, { useRef, useCallback, useEffect } from "react";
import {
  Platform,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  PanResponder,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../providers/ThemeProvider";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const TAB_ORDER = ["index", "live", "stats", "tools"] as const;
type TabName = (typeof TAB_ORDER)[number];

const TAB_CONFIG: Record<TabName, { title: string; icon: (color: string, size: number) => React.ReactNode }> = {
  index: {
    title: "Collect",
    icon: (color, size) => <Send size={size} color={color} />,
  },
  live: {
    title: "LIVE",
    icon: (color, size) => <Radio size={size} color={color} />,
  },
  stats: {
    title: "Stats",
    icon: (color, size) => <BarChart3 size={size} color={color} />,
  },
  tools: {
    title: "Tools",
    icon: (color, size) => <Wrench size={size} color={color} />,
  },
};

function AlertDot() {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <Animated.View
      style={[
        barStyles.alertDot,
        { opacity: pulseAnim },
      ]}
    />
  );
}

function CustomTabBar({ state, navigation }: { state: any; navigation: any }) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const sliderAnim = useRef(new Animated.Value(0)).current;

  const TAB_COUNT = TAB_ORDER.length;
  const ISLAND_MARGIN = 20;
  const ISLAND_WIDTH = SCREEN_WIDTH - ISLAND_MARGIN * 2;
  const TAB_WIDTH = ISLAND_WIDTH / TAB_COUNT;

  const currentIndex = state.index;

  React.useEffect(() => {
    Animated.spring(sliderAnim, {
      toValue: currentIndex * TAB_WIDTH,
      useNativeDriver: true,
      speed: 28,
      bounciness: 6,
    }).start();
  }, [currentIndex, TAB_WIDTH, sliderAnim]);

  const handlePress = useCallback(
    (tabName: string, index: number) => {
      const route = state.routes[index];
      const isFocused = state.index === index;
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    },
    [state, navigation]
  );

  const BOTTOM_PAD = insets.bottom > 0 ? insets.bottom : 12;

  const islandBg = isDark ? "rgba(28,28,32,0.92)" : "rgba(255,255,255,0.92)";
  const islandBorder = isDark ? "#2A2A30" : "#DDD9CF";

  const blurTint = isDark ? "dark" : "light";

  return (
    <View style={[barStyles.outerWrap, { paddingBottom: BOTTOM_PAD }]}>
      <LinearGradient
        colors={
          isDark
            ? ["transparent", "rgba(16,16,18,0.6)", "rgba(16,16,18,0.92)", "rgba(16,16,18,1)"] as const
            : ["transparent", "rgba(245,243,239,0.5)", "rgba(245,243,239,0.88)", "rgba(245,243,239,1)"] as const
        }
        style={barStyles.gradient}
        locations={[0, 0.25, 0.6, 1]}
        pointerEvents="none"
      />

      {Platform.OS !== "web" ? (
        <BlurView
          intensity={40}
          tint={blurTint}
          style={[
            barStyles.blurIsland,
            {
              borderColor: islandBorder,
            },
          ]}
        >
          <View style={barStyles.islandInner}>
            <Animated.View
              style={[
                barStyles.slider,
                {
                  backgroundColor: colors.accent,
                  width: TAB_WIDTH * 0.48,
                  left: TAB_WIDTH * 0.26,
                  transform: [{ translateX: sliderAnim }],
                },
              ]}
            />

            {TAB_ORDER.map((tabName, index) => {
              const isFocused = state.index === index;
              const cfg = TAB_CONFIG[tabName];
              const isLive = tabName === "live";
              const iconColor = isFocused
                ? isLive
                  ? colors.complete
                  : colors.accent
                : colors.textMuted;

              return (
                <TouchableOpacity
                  key={tabName}
                  style={[barStyles.tab, { width: TAB_WIDTH }]}
                  onPress={() => handlePress(tabName, index)}
                  activeOpacity={0.7}
                  testID={`tab-${tabName}`}
                >
                  <View
                    style={[
                      barStyles.iconWrap,
                      isFocused && {
                        backgroundColor: isLive
                          ? colors.complete + "18"
                          : colors.accent + "14",
                        borderRadius: 12,
                      },
                    ]}
                  >
                    {cfg.icon(iconColor, 20)}
                    {isLive && !isFocused && <AlertDot />}
                  </View>
                  <Text
                    style={[
                      barStyles.label,
                      {
                        color: iconColor,
                        fontFamily: isFocused ? "Lexend_700Bold" : "Lexend_400Regular",
                        fontSize: isLive ? 8 : 9,
                        letterSpacing: isLive ? 1.5 : 0.3,
                      },
                    ]}
                  >
                    {cfg.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </BlurView>
      ) : (
        <View
          style={[
            barStyles.island,
            {
              backgroundColor: islandBg,
              borderColor: islandBorder,
            },
          ]}
        >
          <Animated.View
            style={[
              barStyles.slider,
              {
                backgroundColor: colors.accent,
                width: TAB_WIDTH * 0.48,
                left: TAB_WIDTH * 0.26,
                transform: [{ translateX: sliderAnim }],
              },
            ]}
          />

          {TAB_ORDER.map((tabName, index) => {
            const isFocused = state.index === index;
            const cfg = TAB_CONFIG[tabName];
            const isLive = tabName === "live";
            const iconColor = isFocused
              ? isLive
                ? colors.complete
                : colors.accent
              : colors.textMuted;

            return (
              <TouchableOpacity
                key={tabName}
                style={[barStyles.tab, { width: TAB_WIDTH }]}
                onPress={() => handlePress(tabName, index)}
                activeOpacity={0.7}
                testID={`tab-${tabName}`}
              >
                <View
                  style={[
                    barStyles.iconWrap,
                    isFocused && {
                      backgroundColor: isLive
                        ? colors.complete + "18"
                        : colors.accent + "14",
                      borderRadius: 12,
                    },
                  ]}
                >
                  {cfg.icon(iconColor, 20)}
                  {isLive && !isFocused && <AlertDot />}
                </View>
                <Text
                  style={[
                    barStyles.label,
                    {
                      color: iconColor,
                      fontFamily: isFocused ? "Lexend_700Bold" : "Lexend_400Regular",
                      fontSize: isLive ? 8 : 9,
                      letterSpacing: isLive ? 1.5 : 0.3,
                    },
                  ]}
                >
                  {cfg.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

function TaskFlowHeader() {
  const { colors } = useTheme();
  const glowAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.5, duration: 2200, useNativeDriver: true }),
      ])
    ).start();
  }, [glowAnim]);

  return (
    <View style={hStyles.wrap}>
      <Image
        source={require("../../assets/images/taskflow-logo.png")}
        style={hStyles.logoIcon}
        resizeMode="contain"
      />
      <Animated.Text
        style={[
          hStyles.appNameText,
          { color: colors.textPrimary, opacity: glowAnim },
        ]}
      >
        TaskFlow
      </Animated.Text>
    </View>
  );
}

function SwipeWrapper({
  children,
  tabIndex,
}: {
  children: React.ReactNode;
  tabIndex: number;
}) {
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => {
        const isSwipe =
          Math.abs(g.dx) > 20 &&
          Math.abs(g.dy) < 40 &&
          Math.abs(g.dx) > Math.abs(g.dy) * 1.8;
        return isSwipe;
      },
      onPanResponderRelease: (_, g) => {
        const routeMap: Record<TabName, string> = {
          index: "/",
          live: "/live",
          stats: "/stats",
          tools: "/tools",
        };
        if (g.dx < -50 && tabIndex < TAB_ORDER.length - 1) {
          const next = TAB_ORDER[tabIndex + 1];
          router.navigate(routeMap[next] as any);
        } else if (g.dx > 50 && tabIndex > 0) {
          const prev = TAB_ORDER[tabIndex - 1];
          router.navigate(routeMap[prev] as any);
        }
      },
    })
  ).current;

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      {children}
    </View>
  );
}

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      initialRouteName="live"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Collect",
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.bg,
          },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: {
            fontFamily: "Lexend_700Bold",
            fontSize: 17,
            color: colors.textPrimary,
          },
          headerShadowVisible: false,
          headerTitle: () => <TaskFlowHeader />,
        }}
      />
      <Tabs.Screen name="live" options={{ title: "LIVE" }} />
      <Tabs.Screen name="stats" options={{ title: "Stats" }} />
      <Tabs.Screen name="tools" options={{ title: "Tools" }} />
    </Tabs>
  );
}

const barStyles = StyleSheet.create({
  outerWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  gradient: {
    position: "absolute",
    bottom: -20,
    left: 0,
    right: 0,
    height: 160,
  },
  blurIsland: {
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
    width: "100%",
  },
  islandInner: {
    flexDirection: "row",
    paddingVertical: 6,
    position: "relative",
  },
  island: {
    flexDirection: "row",
    borderRadius: 28,
    borderWidth: 1,
    paddingVertical: 6,
    position: "relative",
    overflow: "hidden",
    width: "100%",
  },
  slider: {
    position: "absolute",
    bottom: 0,
    height: 3,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    gap: 3,
  },
  iconWrap: {
    width: 40,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  alertDot: {
    position: "absolute",
    top: 3,
    right: 5,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#FF3B30",
  },
  label: {
    textTransform: "uppercase",
  },
});

const hStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 2,
    gap: 8,
  },
  logoIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
  },
  appNameText: {
    fontSize: 18,
    fontFamily: "Lexend_700Bold",
    letterSpacing: -0.3,
  },
});
