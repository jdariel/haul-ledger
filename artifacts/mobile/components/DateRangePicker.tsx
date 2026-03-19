import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

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
        setPickStart(d);
        setPickEnd(pickStart);
      } else {
        setPickEnd(d);
      }
      setStep("start");
    }
  };

  const handleApply = () => {
    if (!pickStart) return;
    const s = startOfDay(pickStart);
    const e = pickEnd ? endOfDay(pickEnd) : endOfDay(pickStart);
    onApply(s, e);
  };

  const s = makeStyles(C);

  const cells: (number | null)[] = Array(firstDow).fill(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);
  while (cells.length % 7 !== 0) cells.push(null);

  const fmt = (d: Date | null) =>
    d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onCancel}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={[s.sheet, { backgroundColor: C.card }]}>
            {/* Handle */}
            <View style={[s.handle, { backgroundColor: C.separator }]} />

            {/* Title + step hint */}
            <Text style={[s.title, { color: C.text }]}>Select Date Range</Text>
            <Text style={[s.hint, { color: C.primary }]}>
              {step === "start" ? "Tap a start date" : "Tap an end date"}
            </Text>

            {/* Selected range display */}
            <View style={[s.rangeRow, { backgroundColor: C.background, borderColor: C.separator }]}>
              <View style={s.rangeItem}>
                <Text style={[s.rangeLabel, { color: C.textSecondary }]}>FROM</Text>
                <Text style={[s.rangeVal, { color: pickStart ? C.primary : C.textMuted }]}>{fmt(pickStart)}</Text>
              </View>
              <Ionicons name="arrow-forward" size={14} color={C.textMuted} />
              <View style={s.rangeItem}>
                <Text style={[s.rangeLabel, { color: C.textSecondary }]}>TO</Text>
                <Text style={[s.rangeVal, { color: pickEnd ? C.primary : C.textMuted }]}>{fmt(pickEnd)}</Text>
              </View>
            </View>

            {/* Month nav */}
            <View style={s.monthNav}>
              <TouchableOpacity onPress={prevMonth} style={s.navBtn}>
                <Ionicons name="chevron-back" size={20} color={C.text} />
              </TouchableOpacity>
              <Text style={[s.monthLabel, { color: C.text }]}>{MONTHS[viewMonth]} {viewYear}</Text>
              <TouchableOpacity onPress={nextMonth} style={s.navBtn}>
                <Ionicons name="chevron-forward" size={20} color={C.text} />
              </TouchableOpacity>
            </View>

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

                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      s.cell,
                      inRange && { backgroundColor: C.primary + "22" },
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
      padding: 20,
      paddingBottom: 36,
      gap: 12,
    },
    handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
    title: { fontSize: 18, fontWeight: "800", textAlign: "center" },
    hint: { fontSize: 13, fontWeight: "600", textAlign: "center", marginTop: -4 },
    rangeRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    rangeItem: { flex: 1, alignItems: "center", gap: 2 },
    rangeLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
    rangeVal: { fontSize: 13, fontWeight: "600" },
    monthNav: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 4,
    },
    navBtn: { padding: 8 },
    monthLabel: { fontSize: 16, fontWeight: "700" },
    weekRow: { flexDirection: "row" },
    weekday: { flex: 1, textAlign: "center", fontSize: 12, fontWeight: "600" },
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
    todayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },
    btnRow: { flexDirection: "row", gap: 12, marginTop: 4 },
    btn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
    },
    cancelBtn: { borderWidth: 1.5 },
    applyBtn: {},
    btnText: { fontSize: 15, fontWeight: "700" },
  });
}
