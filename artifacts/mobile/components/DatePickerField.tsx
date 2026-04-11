import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { useColorScheme } from "@/hooks/useColorScheme";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function parseValue(val: string): Date | null {
  if (!val || val.length < 10) return null;
  const d = new Date(val + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Props = {
  label?: string;
  value: string;
  onChange: (date: string) => void;
};

export function DatePickerField({ label, value, onChange }: Props) {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];
  const s = makeStyles(C);

  const [open, setOpen] = useState(false);

  const selected = parseValue(value);
  const today = new Date();

  const initDate = selected ?? today;
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();

  const cells: (number | null)[] = Array(firstDow).fill(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleOpen = () => {
    const d = parseValue(value) ?? new Date();
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setShowMonthPicker(false);
    setShowYearPicker(false);
    setOpen(true);
  };

  const handleDayPress = (day: number) => {
    const picked = new Date(viewYear, viewMonth, day);
    onChange(toYMD(picked));
    setOpen(false);
  };

  const displayLabel = selected
    ? `${SHORT_MONTHS[selected.getMonth()]} ${selected.getDate()}, ${selected.getFullYear()}`
    : "Pick a date";

  const yearRange = Array.from({ length: 10 }, (_, i) => today.getFullYear() - 5 + i);

  return (
    <View style={s.container}>
      {label ? <Text style={[s.label, { color: C.textSecondary }]}>{label}</Text> : null}

      <TouchableOpacity
        style={[s.trigger, { backgroundColor: C.inputBackground, borderColor: C.cardBorder ?? C.separator }]}
        onPress={handleOpen}
        activeOpacity={0.75}
      >
        <Ionicons name="calendar-outline" size={16} color={C.primary} />
        <Text style={[s.triggerText, { color: selected ? C.text : C.textMuted }]}>
          {displayLabel}
        </Text>
        <Ionicons name="chevron-down" size={14} color={C.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={[s.sheet, { backgroundColor: C.card }]}>
              <View style={[s.handle, { backgroundColor: C.separator }]} />

              {/* Month / Year nav */}
              <View style={s.monthNav}>
                <TouchableOpacity onPress={prevMonth} style={s.navBtn}>
                  <Ionicons name="chevron-back" size={20} color={C.text} />
                </TouchableOpacity>

                <View style={s.monthYearGroup}>
                  <TouchableOpacity
                    style={[s.dropBtn, { borderColor: C.separator }]}
                    onPress={() => { setShowMonthPicker(!showMonthPicker); setShowYearPicker(false); }}
                  >
                    <Text style={[s.dropBtnText, { color: C.text }]}>{MONTHS[viewMonth]}</Text>
                    <Ionicons name="chevron-down" size={13} color={C.textSecondary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.dropBtn, { borderColor: C.separator }]}
                    onPress={() => { setShowYearPicker(!showYearPicker); setShowMonthPicker(false); }}
                  >
                    <Text style={[s.dropBtnText, { color: C.text }]}>{viewYear}</Text>
                    <Ionicons name="chevron-down" size={13} color={C.textSecondary} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={nextMonth} style={s.navBtn}>
                  <Ionicons name="chevron-forward" size={20} color={C.text} />
                </TouchableOpacity>
              </View>

              {/* Month dropdown */}
              {showMonthPicker && (
                <View style={[s.dropdown, { backgroundColor: C.card, borderColor: C.separator }]}>
                  {MONTHS.map((m, i) => (
                    <TouchableOpacity
                      key={m}
                      style={[s.dropItem, i === viewMonth && { backgroundColor: C.primary + "20" }]}
                      onPress={() => { setViewMonth(i); setShowMonthPicker(false); }}
                    >
                      <Text style={[s.dropItemText, { color: i === viewMonth ? C.primary : C.text }]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Year dropdown */}
              {showYearPicker && (
                <View style={[s.dropdown, { backgroundColor: C.card, borderColor: C.separator }]}>
                  {yearRange.map(y => (
                    <TouchableOpacity
                      key={y}
                      style={[s.dropItem, y === viewYear && { backgroundColor: C.primary + "20" }]}
                      onPress={() => { setViewYear(y); setShowYearPicker(false); }}
                    >
                      <Text style={[s.dropItemText, { color: y === viewYear ? C.primary : C.text }]}>{y}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Weekday headers */}
              <View style={s.weekRow}>
                {WEEKDAYS.map(d => (
                  <Text key={d} style={[s.weekday, { color: C.textSecondary }]}>{d}</Text>
                ))}
              </View>

              {/* Day grid */}
              <View style={s.grid}>
                {cells.map((day, idx) => {
                  if (day === null) return <View key={`e-${idx}`} style={s.cell} />;

                  const thisDate = new Date(viewYear, viewMonth, day);
                  const isSelected = selected ? sameDay(thisDate, selected) : false;
                  const isToday = sameDay(thisDate, today);

                  return (
                    <TouchableOpacity
                      key={day}
                      style={s.cell}
                      onPress={() => handleDayPress(day)}
                      activeOpacity={0.7}
                    >
                      <View style={[s.dayCircle, isSelected && { backgroundColor: C.primary }]}>
                        <Text style={[
                          s.dayText,
                          { color: isSelected ? "#fff" : isToday ? C.primary : C.text },
                          isToday && !isSelected && { fontWeight: "700" },
                        ]}>
                          {day}
                        </Text>
                      </View>
                      {isToday && !isSelected && (
                        <View style={[s.todayDot, { backgroundColor: C.primary }]} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[s.cancelBtn, { borderColor: C.separator }]}
                onPress={() => setOpen(false)}
              >
                <Text style={[s.cancelText, { color: C.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
    container: { gap: 4 },
    label: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 2 },
    trigger: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    triggerText: { flex: 1, fontSize: 15, fontWeight: "500" },

    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    sheet: {
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: 18,
      paddingBottom: 34,
      gap: 10,
    },
    handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },

    monthNav: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 2,
    },
    navBtn: { padding: 6 },
    monthYearGroup: { flexDirection: "row", gap: 8, alignItems: "center" },
    dropBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    dropBtnText: { fontSize: 15, fontWeight: "700" },

    dropdown: {
      borderWidth: 1,
      borderRadius: 12,
      maxHeight: 180,
      overflow: "hidden",
    },
    dropItem: { paddingHorizontal: 16, paddingVertical: 9 },
    dropItemText: { fontSize: 14, fontWeight: "500" },

    weekRow: { flexDirection: "row", marginTop: 4 },
    weekday: { flex: 1, textAlign: "center", fontSize: 12, fontWeight: "600", paddingVertical: 4 },

    grid: { flexDirection: "row", flexWrap: "wrap" },
    cell: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    dayCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    dayText: { fontSize: 15, fontWeight: "500" },
    todayDot: { width: 4, height: 4, borderRadius: 2, position: "absolute", bottom: 3 },

    cancelBtn: {
      marginTop: 4,
      paddingVertical: 13,
      borderRadius: 12,
      alignItems: "center",
      borderWidth: 1.5,
    },
    cancelText: { fontSize: 15, fontWeight: "700" },
  });
}
