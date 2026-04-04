export type OpenNowResult = {
  isOpenNow: boolean;
  /** Unknown when hours missing or unparseable */
  hoursKnown: boolean;
  /** Today's closing time HH:mm 24h in shop-local interpretation (user TZ for MVP) */
  closesAtToday?: string;
};

type DayHours = { open: string; close: string };

const WEEKDAY_TO_KEY: Record<string, string> = {
  sun: "sunday",
  mon: "monday",
  tue: "tuesday",
  wed: "wednesday",
  thu: "thursday",
  fri: "friday",
  sat: "saturday",
};

function parseMinutes(hm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function weekdayKeyInTimeZone(date: Date, timeZone: string): string | null {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).formatToParts(date);
  const w = parts.find((p) => p.type === "weekday")?.value?.toLowerCase().slice(0, 3);
  if (!w) return null;
  return WEEKDAY_TO_KEY[w] ?? null;
}

function minutesSinceMidnightInTimeZone(date: Date, timeZone: string): number | null {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value);
  const minute = Number(parts.find((p) => p.type === "minute")?.value);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

/** Weekly hours: keys monday..sunday, values { open, close } "HH:mm" */
export function getOpenNowFromHoursJson(
  hours: unknown,
  at: Date,
  timeZone: string,
): OpenNowResult {
  if (!isRecord(hours)) {
    return { isOpenNow: false, hoursKnown: false };
  }

  const dayKey = weekdayKeyInTimeZone(at, timeZone);
  if (!dayKey) {
    return { isOpenNow: false, hoursKnown: false };
  }

  const raw = hours[dayKey];
  if (!isRecord(raw)) {
    return { isOpenNow: false, hoursKnown: false };
  }

  const openStr = raw.open;
  const closeStr = raw.close;
  if (typeof openStr !== "string" || typeof closeStr !== "string") {
    return { isOpenNow: false, hoursKnown: false };
  }

  const openM = parseMinutes(openStr);
  const closeM = parseMinutes(closeStr);
  if (openM === null || closeM === null) {
    return { isOpenNow: false, hoursKnown: false };
  }

  const nowM = minutesSinceMidnightInTimeZone(at, timeZone);
  if (nowM === null) {
    return { isOpenNow: false, hoursKnown: true, closesAtToday: closeStr };
  }

  let isOpen: boolean;
  if (closeM > openM) {
    isOpen = nowM >= openM && nowM < closeM;
  } else {
    // overnight window (e.g. 07:00–01:00)
    isOpen = nowM >= openM || nowM < closeM;
  }

  return {
    isOpenNow: isOpen,
    hoursKnown: true,
    closesAtToday: closeStr,
  };
}
