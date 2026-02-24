import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "../providers/ThemeProvider";

export default function ModalScreen() {
  const { colors, isDark } = useTheme();

  return (
    <Pressable style={styles.overlay} onPress={() => router.back()}>
      <View style={[styles.modalContent, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Collection Nexus</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          A streamlined tool for data collectors to log tasks, track hours, and
          sync with Google Sheets in real-time.
        </Text>
        <TouchableOpacity
          style={[styles.closeButton, { backgroundColor: colors.accent }]}
          onPress={() => router.back()}
        >
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
      <StatusBar style={Platform.OS === "ios" ? (isDark ? "light" : "dark") : "auto"} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    margin: 24,
    alignItems: "center",
    minWidth: 300,
    borderWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "600" as const,
    marginBottom: 12,
  },
  description: {
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
    fontSize: 14,
  },
  closeButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
  },
  closeButtonText: {
    color: "#FFFFFF",
    fontWeight: "600" as const,
    textAlign: "center",
    fontSize: 14,
  },
});
