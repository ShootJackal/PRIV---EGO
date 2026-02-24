import { Stack } from "expo-router";
import { useTheme } from "../../../providers/ThemeProvider";

export default function StatsLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: "600" as const },
        contentStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: "Statistics" }}
      />
      <Stack.Screen
        name="leaderboard"
        options={{ title: "Leaderboard" }}
      />
    </Stack>
  );
}
