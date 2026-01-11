import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { FontAwesome6 } from "@expo/vector-icons";
import { addDays, formatShortDate, startOfDay, startOfWeek, toDateKey } from "../../lib/dates";
import { clamp, formatDrinkCount, formatVolume } from "../../lib/dashboard-utils";
import { getHeatmapColors, HEATMAP_OUT_OF_RANGE } from "../../lib/dashboard-theme";
import { useTheme } from "../../lib/theme-context";
import { VolumeUnit } from "../../lib/types";

type VolumeByDate = Record<string, { count: number; volume_l: number }>;

type Props = {
  countsByDate: Record<string, number>;
  volumeByDate: VolumeByDate;
  now: Date;
  unit: VolumeUnit;
};

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CELL_SIZE = 12;
const CELL_GAP = 4;
const COLUMN_WIDTH = CELL_SIZE + CELL_GAP;

export function YearlyHeatmap({ countsByDate, volumeByDate, now, unit }: Props) {
  const { colors, mode } = useTheme();
  const [year, setYear] = useState(now.getFullYear());
  const yearStart = useMemo(() => startOfDay(new Date(year, 0, 1)), [year]);
  const yearEnd = useMemo(() => new Date(year, 11, 31, 23, 59, 59, 999), [year]);

  const weeks = useMemo(() => {
    const gridStart = startOfWeek(yearStart);
    const gridEnd = addDays(startOfWeek(yearEnd), 6);
    const result: Date[] = [];
    let cursor = new Date(gridStart);
    while (cursor <= gridEnd) {
      result.push(new Date(cursor));
      cursor = addDays(cursor, 7);
    }
    return result;
  }, [yearStart, yearEnd]);

  const [selection, setSelection] = useState<{
    key: string;
    x: number;
    y: number;
    date: Date;
  } | null>(null);
  const [tooltipSize, setTooltipSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    setSelection(null);
    setTooltipSize(null);
  }, [year]);

  const handleTilePress = (date: Date, weekIndex: number, dayIndex: number) => {
    const key = toDateKey(date);
    if (selection?.key === key) {
      setSelection(null);
      return;
    }
    setSelection({
      key,
      x: weekIndex * COLUMN_WIDTH,
      y: dayIndex * (CELL_SIZE + CELL_GAP),
      date,
    });
    setTooltipSize(null);
  };

  const selectedInfo = selection
    ? volumeByDate[selection.key] ?? { count: 0, volume_l: 0 }
    : null;

  const gridWidth = weeks.length * COLUMN_WIDTH;
  const tooltipLayout = useMemo(() => {
    if (!selection || !tooltipSize) return null;
    const centerX = selection.x + CELL_SIZE / 2;
    const maxLeft = Math.max(0, gridWidth - tooltipSize.width);
    const left = clamp(centerX - tooltipSize.width / 2, 0, maxLeft);
    const aboveTop = selection.y - tooltipSize.height - 10;
    const showBelow = aboveTop < 0;
    const top = showBelow ? selection.y + CELL_SIZE + 10 : aboveTop;
    const arrowLeft = clamp(centerX - left - 6, 8, tooltipSize.width - 14);
    return { left, top, showBelow, arrowLeft };
  }, [selection, tooltipSize, gridWidth]);

  const monthLabels = useMemo(
    () =>
      weeks.map((weekStartDate, index) => {
        const prevMonth = index === 0 ? null : weeks[index - 1].getMonth();
        const month = weekStartDate.getMonth();
        const inYear = weekStartDate >= yearStart && weekStartDate <= yearEnd;
        const label =
          inYear && (index === 0 || month !== prevMonth)
            ? weekStartDate.toLocaleDateString("en-US", { month: "short" })
            : "";
        return { label, month };
      }),
    [weeks, yearStart, yearEnd]
  );

  const scrollRef = useRef<ScrollView>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [didScroll, setDidScroll] = useState(false);

  const currentMonthIndex = useMemo(() => {
    const target = year === now.getFullYear() ? now.getMonth() : 0;
    return Math.max(
      0,
      weeks.findIndex(
        (weekStartDate) =>
          weekStartDate.getMonth() === target &&
          weekStartDate >= yearStart &&
          weekStartDate <= yearEnd
      )
    );
  }, [weeks, year, now, yearStart, yearEnd]);

  useEffect(() => {
    if (didScroll || containerWidth === 0) return;
    const offset = Math.max(0, currentMonthIndex * COLUMN_WIDTH - containerWidth / 3);
    scrollRef.current?.scrollTo({ x: offset, animated: false });
    setDidScroll(true);
  }, [didScroll, containerWidth, currentMonthIndex]);

  useEffect(() => setDidScroll(false), [year]);

  const heatmapColors = useMemo(() => getHeatmapColors(mode, colors.accent), [mode, colors.accent]);
  const outOfRange = HEATMAP_OUT_OF_RANGE[mode];
  const maxCount = useMemo(() => {
    let max = 0;
    for (const weekStartDate of weeks) {
      for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
        const dayDate = addDays(weekStartDate, dayIndex);
        if (dayDate < yearStart || dayDate > yearEnd) continue;
        const count = countsByDate[toDateKey(dayDate)] ?? 0;
        if (count > max) max = count;
      }
    }
    return max;
  }, [weeks, yearStart, yearEnd, countsByDate]);

  const resolveHeatmapColor = (count: number, inRange: boolean) => {
    if (!inRange) return outOfRange;
    if (count <= 0) return heatmapColors[0];
    if (maxCount <= 0) return heatmapColors[0];
    const ratio = count / maxCount;
    if (ratio >= 0.67) return heatmapColors[3];
    if (ratio >= 0.34) return heatmapColors[2];
    return heatmapColors[1];
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surfaceAlt, borderColor: colors.border, shadowColor: colors.shadow },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderTitle}>
          <FontAwesome6 name="calendar-days" size={14} color={colors.text} />
          <Text style={[styles.cardTitle, { color: colors.text }]}>Yearly overview</Text>
        </View>
        <View style={styles.yearControls}>
          <Pressable
            style={[styles.yearButton, { backgroundColor: colors.surfaceMuted }]}
            onPress={() => setYear((prev) => prev - 1)}
          >
            <Text style={[styles.yearButtonText, { color: colors.textMuted }]}>{"<"}</Text>
          </Pressable>
          <Text style={[styles.yearLabel, { color: colors.text }]}>{year}</Text>
          <Pressable
            style={[styles.yearButton, { backgroundColor: colors.surfaceMuted }]}
            onPress={() => setYear((prev) => prev + 1)}
          >
            <Text style={[styles.yearButtonText, { color: colors.textMuted }]}>{">"}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.heatmapWrapper}>
        <View style={styles.weekdayColumn}>
          <View style={styles.monthSpacer} />
          {WEEKDAY_LABELS.map((label) => (
            <Text key={label} style={[styles.weekdayLabel, { color: colors.textMuted }]}>
              {label}
            </Text>
          ))}
        </View>

        <ScrollView
          horizontal
          ref={scrollRef}
          showsHorizontalScrollIndicator={false}
          onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
        >
          <View>
            <View style={styles.monthRow}>
              {monthLabels.map((item, index) => (
                <View key={index} style={styles.monthCell}>
                      <Text
                        style={[
                          styles.monthLabel,
                          { color: colors.textMuted },
                          index === currentMonthIndex && styles.monthLabelActive,
                          index === currentMonthIndex && { color: colors.accent },
                        ]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                </View>
              ))}
            </View>

            <View style={styles.weeksWrapper}>
              <View style={styles.weeksRow}>
                {weeks.map((weekStartDate, weekIndex) => (
                  <View key={weekStartDate.toISOString()} style={styles.weekColumn}>
                    {WEEKDAY_LABELS.map((_label, dayIndex) => {
                      const dayDate = addDays(weekStartDate, dayIndex);
                      const key = toDateKey(dayDate);
                      const inRange = dayDate >= yearStart && dayDate <= yearEnd;
                      const count = inRange ? countsByDate[key] ?? 0 : 0;
                      const color = resolveHeatmapColor(count, inRange);
                      const isSelected = selection?.key === key;
                      return (
                        <Pressable
                          key={key}
                          hitSlop={4}
                          style={[
                            styles.heatmapCell,
                            { backgroundColor: color },
                            isSelected && styles.heatmapSelected,
                            isSelected && { borderColor: colors.accent },
                            !inRange && styles.heatmapDisabled,
                          ]}
                          onPress={() => inRange && handleTilePress(dayDate, weekIndex, dayIndex)}
                        />
                      );
                    })}
                  </View>
                ))}
              </View>

              {selectedInfo && selection ? (
                <View
                  pointerEvents="none"
                  style={[
                    styles.tooltip,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      shadowColor: colors.shadow,
                    },
                    tooltipLayout
                      ? { left: tooltipLayout.left, top: tooltipLayout.top, opacity: 1 }
                      : { opacity: 0 },
                  ]}
                  onLayout={(event) => {
                    const { width, height } = event.nativeEvent.layout;
                    setTooltipSize({ width, height });
                  }}
                >
                  <Text style={[styles.tooltipDate, { color: colors.textMuted }]}>
                    {formatShortDate(selection.date)}
                  </Text>
                  <Text style={[styles.tooltipTitle, { color: colors.text }]}>
                    {formatDrinkCount(selectedInfo.count)}
                  </Text>
                  <Text style={[styles.tooltipSubtitle, { color: colors.textMuted }]}>
                    {formatVolume(selectedInfo.volume_l, unit)}
                  </Text>
                  <View
                    style={[
                      styles.tooltipArrow,
                      tooltipLayout?.showBelow && styles.tooltipArrowDown,
                      { borderColor: colors.border, backgroundColor: colors.surface },
                      { left: tooltipLayout?.arrowLeft ?? 14 },
                    ]}
                  />
                </View>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </View>

      <View style={styles.legendRow}>
        <Text style={[styles.legendLabel, { color: colors.textMuted }]}>Less</Text>
        {heatmapColors.map((color) => (
          <View key={color} style={[styles.legendSwatch, { backgroundColor: color }]} />
        ))}
        <Text style={[styles.legendLabel, { color: colors.textMuted }]}>More</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    gap: 12,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardHeaderTitle: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  yearControls: { flexDirection: "row", alignItems: "center", gap: 6 },
  yearButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  yearButtonText: { fontSize: 14 },
  yearLabel: { fontSize: 13, fontWeight: "600" },
  heatmapWrapper: { flexDirection: "row", gap: 8 },
  weekdayColumn: { alignItems: "flex-start" },
  monthSpacer: { height: 18 },
  weekdayLabel: { height: CELL_SIZE + CELL_GAP, fontSize: 10 },
  monthRow: { flexDirection: "row", marginBottom: 6 },
  monthCell: { width: COLUMN_WIDTH },
  monthLabel: { fontSize: 11, minWidth: COLUMN_WIDTH * 2 },
  monthLabelActive: { fontWeight: "700" },
  weeksWrapper: { position: "relative", alignSelf: "flex-start" },
  weeksRow: { flexDirection: "row" },
  weekColumn: { width: COLUMN_WIDTH, gap: CELL_GAP },
  heatmapCell: { width: CELL_SIZE, height: CELL_SIZE, borderRadius: 3 },
  heatmapSelected: { borderWidth: 1 },
  heatmapDisabled: { opacity: 0.45 },
  tooltip: {
    position: "absolute",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    zIndex: 5,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  tooltipTitle: { fontSize: 12, fontWeight: "800" },
  tooltipDate: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontWeight: "700",
  },
  tooltipSubtitle: { fontSize: 11, fontWeight: "600" },
  tooltipArrow: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    transform: [{ rotate: "45deg" }],
    bottom: -5,
  },
  tooltipArrowDown: {
    top: -5,
    bottom: undefined,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 1,
    borderTopWidth: 1,
  },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendLabel: { fontSize: 11 },
  legendSwatch: { width: 10, height: 10, borderRadius: 3 },
});
