import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Colors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/useColorScheme";

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  destructive = true,
  onConfirm,
  onCancel,
}: Props) {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={s.overlay}>
        <View style={[s.dialog, { backgroundColor: C.card, borderColor: C.separator }]}>
          <Text style={[s.title, { color: C.text }]}>{title}</Text>
          <Text style={[s.message, { color: C.textSecondary }]}>{message}</Text>
          <View style={[s.divider, { backgroundColor: C.separator }]} />
          <View style={s.buttons}>
            <TouchableOpacity
              style={[s.btn, s.cancelBtn, { borderColor: C.separator }]}
              onPress={onCancel}
            >
              <Text style={[s.btnText, { color: C.text }]}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.btn, s.confirmBtn, { backgroundColor: destructive ? "#ef4444" : C.primary }]}
              onPress={onConfirm}
            >
              <Text style={[s.btnText, { color: "#fff" }]}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  dialog: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    paddingTop: 22,
    paddingHorizontal: 20,
  },
  message: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    lineHeight: 20,
  },
  divider: { height: 1 },
  buttons: { flexDirection: "row" },
  btn: {
    flex: 1,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    borderRightWidth: 1,
  },
  confirmBtn: {},
  btnText: { fontSize: 15, fontWeight: "600" },
});
