import { useEffect, useMemo, useRef } from "react";
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { addDays, startOfDay, toDateKey } from "../lib/dates";

const DAY_RANGE_DAYS = 365 * 25;
const DAY_ITEM_WIDTH = 50;
const DAY_ITEM_GAP = 8;
const DAY_ITEM_SPAN = DAY_ITEM_WIDTH + DAY_ITEM_GAP;

type DayWheelProps = {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onVisibleDateChange?: (date: Date) => void;
};

export default function DayWheel({ selectedDate, onSelectDate, onVisibleDateChange }: DayWheelProps) {
  const listRef = useRef<FlatList<Date>>(null);
  const lastVisibleIndex = useRef<number | null>(null);
  const { width } = useWindowDimensions();
  const anchorDate = useMemo(() => startOfDay(new Date()), []);
  const startDate = useMemo(() => addDays(anchorDate, -DAY_RANGE_DAYS), [anchorDate]);
  const days = useMemo(
    () => Array.from({ length: DAY_RANGE_DAYS * 2 + 1 }, (_, index) => addDays(startDate, index)),
    [startDate]
  );
  const todayKey = useMemo(() => toDateKey(startOfDay(new Date())), []);

  const indexForDate = (date: Date) => {
    const diff = Math.round((startOfDay(date).getTime() - startDate.getTime()) / 86400000);
    return Math.min(Math.max(diff, 0), days.length - 1);
  };

  useEffect(() => {
    const index = indexForDate(selectedDate);
    lastVisibleIndex.current = index;
    listRef.current?.scrollToIndex({ index, animated: true });
  }, [selectedDate, startDate]);

  const padding = Math.max(0, (width - DAY_ITEM_WIDTH) / 2);
  const handleScrollEnd = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / DAY_ITEM_SPAN);
    const clampedIndex = Math.min(Math.max(index, 0), days.length - 1);
    if (clampedIndex === lastVisibleIndex.current) return;
    lastVisibleIndex.current = clampedIndex;
    const nextDate = days[clampedIndex];
    if (nextDate) {
      onVisibleDateChange?.(startOfDay(nextDate));
    }
  };

  return (
    <FlatList
      ref={listRef}
      data={days}
      horizontal
      keyExtractor={(item) => toDateKey(item)}
      showsHorizontalScrollIndicator={false}
      snapToInterval={DAY_ITEM_SPAN}
      snapToAlignment="center"
      decelerationRate="fast"
      contentContainerStyle={[styles.dayWheel, { paddingHorizontal: padding }]}
      getItemLayout={(_, index) => ({
        length: DAY_ITEM_SPAN,
        offset: DAY_ITEM_SPAN * index,
        index,
      })}
      initialScrollIndex={indexForDate(selectedDate)}
      onScrollToIndexFailed={({ index }) => {
        const clampedIndex = Math.min(Math.max(index, 0), days.length - 1);
        listRef.current?.scrollToIndex({ index: clampedIndex, animated: false });
      }}
      onScrollEndDrag={handleScrollEnd}
      onMomentumScrollEnd={handleScrollEnd}
      ItemSeparatorComponent={() => <View style={{ width: DAY_ITEM_GAP }} />}
      renderItem={({ item }) => {
        const key = toDateKey(item);
        const isSelected = key === toDateKey(selectedDate);
        const isToday = key === todayKey;
        return (
          <Pressable
            onPress={() => onSelectDate(startOfDay(item))}
            style={[
              styles.dayWheelItem,
              isSelected && styles.dayWheelItemSelected,
              isToday && styles.dayWheelItemToday,
            ]}
          >
            <Text style={[styles.dayWheelWeekday, isSelected && styles.dayWheelTextSelected]}>
              {item.toLocaleDateString("en-US", { weekday: "short" })}
            </Text>
            <Text style={[styles.dayWheelDay, isSelected && styles.dayWheelTextSelected]}>
              {item.getDate()}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  dayWheel: {
    paddingVertical: 6,
  },
  dayWheelItem: {
    width: DAY_ITEM_WIDTH,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#f6f4f1",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  dayWheelItemSelected: {
    backgroundColor: "#1c6b4f",
    borderColor: "#1c6b4f",
  },
  dayWheelItemToday: {
    borderColor: "#1c6b4f",
  },
  dayWheelWeekday: {
    fontSize: 10,
    color: "#6a645d",
    fontWeight: "600",
  },
  dayWheelDay: {
    fontSize: 16,
    color: "#2b2724",
    fontWeight: "700",
  },
  dayWheelTextSelected: {
    color: "#f5f3ee",
  },
});
