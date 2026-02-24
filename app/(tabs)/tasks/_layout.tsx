import { Stack } from "expo-router";
import { useTheme } from "../../../providers/ThemeProvider";

export default function TasksLayout() {
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
        options={{ title: "My Tasks" }}
      />
    </Stack>
  );
}
