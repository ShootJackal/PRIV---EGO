import React, { useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Animated,
  Platform,
  TextInput,
} from "react-native";
import { ChevronDown, Check, Search } from "lucide-react-native";
import { useTheme } from "../providers/ThemeProvider";

interface Option {
  value: string;
  label: string;
}

interface SelectPickerProps {
  label: string;
  options: Option[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  testID?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
}

export default React.memo(function SelectPicker({
  label,
  options,
  selectedValue,
  onValueChange,
  placeholder = "Select...",
  testID,
  searchable = false,
  searchPlaceholder = "Search...",
}: SelectPickerProps) {
  const { colors, isDark } = useTheme();
  const [visible, setVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const selectedOption = options.find((o) => o.value === selectedValue);

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, searchQuery, searchable]);

  const open = useCallback(() => {
    setVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const close = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      setSearchQuery("");
    });
  }, [fadeAnim]);

  const handleSelect = useCallback(
    (value: string) => {
      onValueChange(value);
      close();
    },
    [onValueChange, close]
  );

  const sheetBg = isDark ? '#1C1C20' : '#FFFFFF';

  const renderItem = useCallback(
    ({ item }: { item: Option }) => {
      const isSelected = item.value === selectedValue;
      return (
        <TouchableOpacity
          style={[
            styles.option,
            { backgroundColor: isSelected ? colors.bgElevated : "transparent" },
          ]}
          onPress={() => handleSelect(item.value)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.optionText,
              { color: isSelected ? colors.accent : colors.textPrimary, fontFamily: isSelected ? "Lexend_600SemiBold" : "Lexend_400Regular" },
            ]}
          >
            {item.label}
          </Text>
          {isSelected && <Check size={18} color={colors.accent} />}
        </TouchableOpacity>
      );
    },
    [selectedValue, handleSelect, colors]
  );

  const keyExtractor = useCallback((item: Option) => item.value, []);

  return (
    <View style={styles.container} testID={testID}>
      {label ? <Text style={[styles.label, { color: colors.textSecondary, fontFamily: "Lexend_600SemiBold" }]}>{label}</Text> : null}
      <TouchableOpacity
        style={[styles.trigger, { backgroundColor: colors.bgInput, borderColor: colors.border }]}
        onPress={open}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.triggerText,
            { color: selectedOption ? colors.textPrimary : colors.textMuted, fontFamily: "Lexend_500Medium" },
          ]}
          numberOfLines={1}
        >
          {selectedOption?.label ?? placeholder}
        </Text>
        <ChevronDown size={18} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={close}
        statusBarTranslucent
      >
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <TouchableOpacity
            style={styles.overlayTouch}
            activeOpacity={1}
            onPress={close}
          />
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: sheetBg,
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [300, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.textPrimary, fontFamily: "Lexend_600SemiBold" }]}>
              {label || "Select Option"}
            </Text>
            {searchable && (
              <View style={[styles.searchRow, { backgroundColor: colors.bgInput, borderColor: colors.border }]}>
                <Search size={15} color={colors.textMuted} />
                <TextInput
                  style={[styles.searchInput, { color: colors.textPrimary, fontFamily: "Lexend_400Regular" }]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={searchPlaceholder}
                  placeholderTextColor={colors.textMuted}
                  autoFocus
                  autoCorrect={false}
                  testID={testID ? `${testID}-search` : undefined}
                />
              </View>
            )}
            <FlatList
              data={filteredOptions}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              style={styles.list}
              showsVerticalScrollIndicator={false}
            />
          </Animated.View>
        </Animated.View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  trigger: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  triggerText: {
    flex: 1,
    fontSize: 15,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end" as const,
  },
  overlayTouch: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "web" ? 20 : 40,
    maxHeight: "60%" as const,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center" as const,
    marginTop: 12,
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  list: {
    flexGrow: 0,
  },
  option: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 2,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
  },
  searchRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
});
