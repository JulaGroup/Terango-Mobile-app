import { OpeningHours, OpeningHoursDay, WeekdayKey } from "@/lib/api";

const WEEKDAYS_IN_ORDER: WeekdayKey[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const TIME_REGEX = /^([0-1]?\d|2[0-3]):([0-5]\d)$/;

type NormalizedHours = Partial<Record<WeekdayKey, OpeningHoursDay>>;

export interface OperatingStatusInput {
  openingHours?: OpeningHours | null;
  isActive?: boolean | null;
  acceptsOrders?: boolean | null;
}

export interface OperatingStatus {
  isOpen: boolean;
  reason?: "inactive" | "not_accepting_orders" | "outside_hours";
  currentWindow?: { day: WeekdayKey; open: string; close: string };
  closesAt?: { day: WeekdayKey; time: string };
  nextOpening?: { day: WeekdayKey; time: string };
}

const normalizeDayKey = (key: string): WeekdayKey | null => {
  const lower = key.toLowerCase();
  return WEEKDAYS_IN_ORDER.find((day) => day === lower) ?? null;
};

const normalizeOpeningHours = (
  openingHours?: OpeningHours | null
): NormalizedHours | null => {
  if (!openingHours) {
    return null;
  }

  const normalized: NormalizedHours = {};

  Object.entries(openingHours).forEach(([key, value]) => {
    const dayKey = normalizeDayKey(key);
    if (!dayKey || !value) {
      return;
    }

    normalized[dayKey] = {
      open: value.open ?? "",
      close: value.close ?? "",
      closed: value.closed === true,
    };
  });

  return normalized;
};

const parseTimeToMinutes = (time?: string | null): number | null => {
  if (!time || typeof time !== "string") {
    return null;
  }

  if (!TIME_REGEX.test(time)) {
    return null;
  }

  const [hours, minutes] = time.split(":").map((value) => parseInt(value, 10));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
};

const addDays = (baseIndex: number, offset: number): WeekdayKey => {
  return WEEKDAYS_IN_ORDER[(baseIndex + offset + 7) % 7];
};

export const formatDayLabel = (day: WeekdayKey): string =>
  day.charAt(0).toUpperCase() + day.slice(1);

export const formatTimeLabel = (time: string): string => {
  const totalMinutes = parseTimeToMinutes(time);
  if (totalMinutes === null) {
    return time;
  }

  let hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  hours = ((hours + 11) % 12) + 1; // Convert 0 -> 12, 13 -> 1, etc.

  return `${hours}:${minutes.toString().padStart(2, "0")} ${period}`;
};

export const getOperatingStatus = (
  input: OperatingStatusInput,
  referenceDate: Date = new Date()
): OperatingStatus => {
  const { openingHours, isActive, acceptsOrders } = input;
  const normalized = normalizeOpeningHours(openingHours);
  const status: OperatingStatus = {
    isOpen: false,
  };

  if (isActive === false) {
    status.reason = "inactive";
    return status;
  }

  if (acceptsOrders === false) {
    status.reason = "not_accepting_orders";
    return status;
  }

  if (!normalized || Object.keys(normalized).length === 0) {
    status.isOpen = true;
    return status;
  }

  const dayIndex = referenceDate.getDay();
  const currentDayKey = WEEKDAYS_IN_ORDER[dayIndex];
  const minutesNow = referenceDate.getHours() * 60 + referenceDate.getMinutes();

  const todayHours = normalized[currentDayKey];

  const evaluateWindow = (
    dayKey: WeekdayKey,
    dayHours?: OpeningHoursDay
  ): { isOpen: boolean; closesAt?: { day: WeekdayKey; time: string } } => {
    if (!dayHours || dayHours.closed) {
      return { isOpen: false };
    }

    const openMinutes = parseTimeToMinutes(dayHours.open);
    const closeMinutes = parseTimeToMinutes(dayHours.close);

    if (openMinutes === null || closeMinutes === null) {
      // Invalid or missing times -> assume open
      return { isOpen: true };
    }

    // 24-hour window (same open/close)
    if (openMinutes === closeMinutes) {
      return { isOpen: true };
    }

    if (closeMinutes > openMinutes) {
      const isWithin = minutesNow >= openMinutes && minutesNow < closeMinutes;
      return {
        isOpen: isWithin,
        closesAt: isWithin ? { day: dayKey, time: dayHours.close } : undefined,
      };
    }

    // Cross-midnight window (close <= open)
    const isWithin = minutesNow >= openMinutes || minutesNow < closeMinutes;

    if (!isWithin) {
      return { isOpen: false };
    }

    const closesNextDay = minutesNow >= openMinutes;
    const closingDay = closesNextDay ? addDays(dayIndex, 1) : dayKey;

    return {
      isOpen: true,
      closesAt: { day: closingDay, time: dayHours.close },
    };
  };

  // Check current day's window first
  const todayResult = evaluateWindow(currentDayKey, todayHours);
  if (todayResult.isOpen) {
    status.isOpen = true;
    status.currentWindow = todayHours
      ? { day: currentDayKey, open: todayHours.open, close: todayHours.close }
      : undefined;
    status.closesAt = todayResult.closesAt;
    return status;
  }

  // Check previous day's cross-midnight window
  const previousDayKey = addDays(dayIndex, -1);
  const previousDayHours = normalized[previousDayKey];
  const previousOpenMinutes = previousDayHours
    ? parseTimeToMinutes(previousDayHours.open)
    : null;
  const previousCloseMinutes = previousDayHours
    ? parseTimeToMinutes(previousDayHours.close)
    : null;

  if (
    previousDayHours &&
    previousDayHours.closed === false &&
    previousOpenMinutes !== null &&
    previousCloseMinutes !== null &&
    previousCloseMinutes <= previousOpenMinutes
  ) {
    const isWithinPreviousWindow = minutesNow < previousCloseMinutes;
    if (isWithinPreviousWindow) {
      status.isOpen = true;
      status.currentWindow = {
        day: previousDayKey,
        open: previousDayHours.open,
        close: previousDayHours.close,
      };
      status.closesAt = {
        day: currentDayKey,
        time: previousDayHours.close,
      };
      return status;
    }
  }

  status.reason = "outside_hours";

  // Determine next opening window
  for (let offset = 0; offset < 7; offset++) {
    const dayKey = addDays(dayIndex, offset);
    const dayHours = normalized[dayKey];

    if (!dayHours || dayHours.closed) {
      continue;
    }

    const openMinutes = parseTimeToMinutes(dayHours.open);
    const closeMinutes = parseTimeToMinutes(dayHours.close);

    if (openMinutes === null || closeMinutes === null) {
      // Cannot determine schedule precisely, skip
      continue;
    }

    if (offset === 0) {
      if (closeMinutes > openMinutes && minutesNow < openMinutes) {
        status.nextOpening = { day: dayKey, time: dayHours.open };
        break;
      }
      if (closeMinutes <= openMinutes && minutesNow < openMinutes) {
        status.nextOpening = { day: dayKey, time: dayHours.open };
        break;
      }
      continue;
    }

    status.nextOpening = { day: dayKey, time: dayHours.open };
    break;
  }

  return status;
};

export const isBusinessOpen = (
  input: OperatingStatusInput,
  referenceDate?: Date
): boolean => getOperatingStatus(input, referenceDate).isOpen;
