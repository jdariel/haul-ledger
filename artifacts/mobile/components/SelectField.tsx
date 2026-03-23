import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/useColorScheme";

interface SelectFieldProps {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  placeholder?: string;
  onChange: (value: string) => void;
}

export function SelectField({ label, value, options, placeholder = "Select", onChange }: SelectFieldProps) {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value);

  return (
    <View style={s.container}>
      <Text style={[s.label, { color: C.textSecondary }]}>{label}</Text>
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={[s.trigger, { backgroundColor: C.inputBackground, borderColor: C.cardBorder }]}
        activeOpacity={0.7}
      >
        <Text style={[s.triggerText, { color: selected ? C.text : C.textMuted }]} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={C.textSecondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={s.overlay} />
        </TouchableWithoutFeedback>
        <View style={s.sheetWrap} pointerEvents="box-none">
          <View style={[s.sheet, { backgroundColor: C.card }]}>
            <Text style={[s.sheetTitle, { color: C.text }]}>{label}</Text>
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    s.option,
                    { borderBottomColor: C.separator },
                    opt.value === value && { backgroundColor: C.primaryLight },
                  ]}
                  onPress={() => { onChange(opt.value); setOpen(false); }}
                >
                  <Text style={[s.optionText, { color: opt.value === value ? C.primary : C.text }]}>
                    {opt.label}
                  </Text>
                  {opt.value === value && (
                    <Ionicons name="checkmark" size={16} color={C.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "500", marginBottom: 6 },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  triggerText: { fontSize: 16, flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  sheetWrap: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  sheet: {
    borderRadius: 20,
    paddingTop: 20,
    paddingBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  sheetTitle: { fontSize: 16, fontWeight: "700", paddingHorizontal: 20, marginBottom: 8 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: { fontSize: 16 },
});
