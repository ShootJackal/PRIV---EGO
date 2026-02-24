import { Stack } from "expo-router";
import { useTheme } from "../../../providers/ThemeProvider";

export default function ToolsLayout() {
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
        options={{ title: "Tools" }}
      />
      <Stack.Screen
        name="sheet-viewer"
        options={{ title: "Google Sheet" }}
      />
    </Stack>
  );
}
