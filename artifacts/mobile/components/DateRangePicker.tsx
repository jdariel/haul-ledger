import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
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
function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23,59,59,999); return x; }

type Props = {
  visible: boolean;
  initialStart?: Date | null;
  initialEnd?: Date | null;
  onApply: (start: Date, end: Date) => void;
  onCancel: () => void;
};

export function DateRangePicker({ visible, initialStart, initialEnd, onApply, onCancel }: Props) {
  const colorScheme = useColorScheme();
  const C = Colors[colorScheme === "dark" ? "dark" : "light"];

  const today = new Date();
  const [viewYear, setViewYear] = useState(initialStart?.getFullYear() ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialStart?.getMonth() ?? today.getMonth());
  const [pickStart, setPickStart] = useState<Date | null>(initialStart ?? null);
  const [pickEnd, setPickEnd] = useState<Date | null>(initialEnd ?? null);
  const [step, setStep] = useState<"start" | "end">("start");
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleDayPress = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    if (step === "start") {
      setPickStart(d);
      setPickEnd(null);
      setStep("end");
    } else {
      if (pickStart && d < pickStart) {
        setPickEnd(pickStart);
        setPickStart(d);
      } else {
        setPickEnd(d);
      }
      setStep("start");
    }
  };

  const handleApply = () => {
    if (!pickStart) return;
    onApply(startOfDay(pickStart), pickEnd ? endOfDay(pickEnd) : endOfDay(pickStart));
  };

  const s = makeStyles(C);

  const cells: (number | null)[] = Array(firstDow).fill(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);
  while (cells.length % 7 !== 0) cells.push(null);

  const fmtInput = (d: Date | null) =>
    d ? `${SHORT_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}` : "Select date";

  const yearRange = Array.from({ length: 10 }, (_, i) => today.getFullYear() - 5 + i);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onCancel}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={[s.sheet, { backgroundColor: C.card }]}>
            <View style={[s.handle, { backgroundColor: C.separator }]} />

            {/* Two Date Input Boxes */}
            <View style={s.inputRow}>
              <TouchableOpacity
                style={[
                  s.dateInput,
                  {
                    borderColor: step === "start" ? C.primary : C.separator,
                    backgroundColor: step === "start" ? C.primary + "0f" : C.background,
                  },
                ]}
                onPress={() => setStep("start")}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={14} color={C.primary} />
                <Text style={[s.dateInputText, { color: pickStart ? C.text : C.textMuted }]}>
                  {fmtInput(pickStart)}
                </Text>
              </TouchableOpacity>

              <Ionicons name="arrow-forward" size={16} color={C.textMuted} />

              <TouchableOpacity
                style={[
                  s.dateInput,
                  {
                    borderColor: step === "end" ? C.primary : C.separator,
                    backgroundColor: step === "end" ? C.primary + "0f" : C.background,
                  },
                ]}
                onPress={() => { if (pickStart) setStep("end"); }}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={14} color={C.primary} />
                <Text style={[s.dateInputText, { color: pickEnd ? C.text : C.textMuted }]}>
                  {fmtInput(pickEnd)}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Month / Year header */}
            <View style={s.monthNav}>
              <TouchableOpacity onPress={prevMonth} style={s.navBtn}>
                <Ionicons name="chevron-back" size={18} color={C.text} />
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
                <Ionicons name="chevron-forward" size={18} color={C.text} />
              </TouchableOpacity>
            </View>

            {/* Month Dropdown */}
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

            {/* Year Dropdown */}
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
                const isStart = pickStart ? sameDay(thisDate, pickStart) : false;
                const isEnd = pickEnd ? sameDay(thisDate, pickEnd) : false;
                const inRange = pickStart && pickEnd
                  ? thisDate > pickStart && thisDate < pickEnd
                  : false;
                const isToday = sameDay(thisDate, today);
                const isSelected = isStart || isEnd;

                const isStartEdge = isStart && !!pickEnd;
                const isEndEdge = isEnd && !!pickStart;

                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      s.cell,
                      inRange && { backgroundColor: C.primary + "18" },
                      isStartEdge && { borderTopLeftRadius: 20, borderBottomLeftRadius: 20, backgroundColor: C.primary + "18" },
                      isEndEdge && { borderTopRightRadius: 20, borderBottomRightRadius: 20, backgroundColor: C.primary + "18" },
                    ]}
                    onPress={() => handleDayPress(day)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      s.dayCircle,
                      isSelected && { backgroundColor: C.primary },
                    ]}>
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

            {/* Hint */}
            <Text style={[s.hint, { color: C.textMuted }]}>
              {step === "start" ? "Tap a start date on the calendar" : "Now tap an end date"}
            </Text>

            {/* Buttons */}
            <View style={s.btnRow}>
              <TouchableOpacity
                style={[s.btn, s.cancelBtn, { borderColor: C.separator }]}
                onPress={onCancel}
              >
                <Text style={[s.btnText, { color: C.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, s.applyBtn, { backgroundColor: pickStart ? C.primary : C.separator }]}
                onPress={handleApply}
                disabled={!pickStart}
              >
                <Text style={[s.btnText, { color: pickStart ? "#fff" : C.textMuted }]}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function makeStyles(C: typeof Colors.light) {
  return StyleSheet.create({
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
    handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 2 },

    inputRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    dateInput: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1.5,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 9,
    },
    dateInputText: { fontSize: 12, fontWeight: "600", flex: 1 },

    monthNav: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 2,
      marginTop: 2,
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
    dropItem: {
      paddingHorizontal: 16,
      paddingVertical: 9,
    },
    dropItemText: { fontSize: 14, fontWeight: "500" },

    weekRow: { flexDirection: "row", marginTop: 2 },
    weekday: { flex: 1, textAlign: "center", fontSize: 12, fontWeight: "600", paddingVertical: 4 },

    grid: { flexDirection: "row", flexWrap: "wrap" },
    cell: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    dayCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
    },
    dayText: { fontSize: 14, fontWeight: "500" },
    todayDot: { width: 4, height: 4, borderRadius: 2, position: "absolute", bottom: 4 },

    hint: { fontSize: 12, textAlign: "center" },

    btnRow: { flexDirection: "row", gap: 10, marginTop: 2 },
    btn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center" },
    cancelBtn: { borderWidth: 1.5 },
    applyBtn: {},
    btnText: { fontSize: 15, fontWeight: "700" },
  });
}
