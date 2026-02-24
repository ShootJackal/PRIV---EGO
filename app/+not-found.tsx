import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { LightTheme } from "@/constants/colors";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <View style={styles.container}>
        <Text style={styles.emoji}>🔍</Text>
        <Text style={styles.title}>Page not found</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Back to Dashboard</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: LightTheme.bg,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: LightTheme.textPrimary,
  },
  link: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: LightTheme.bgCard,
    borderRadius: 12,
  },
  linkText: {
    fontSize: 14,
    color: LightTheme.accent,
    fontWeight: "600",
  },
});
