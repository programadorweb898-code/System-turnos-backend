export interface BusinessHourInterval {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

function getLocalParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone, weekday: "short", year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)])
  );
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6
  };

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    weekday: weekdayMap[parts.find((part) => part.type === "weekday")?.value ?? ""],
    hour: values.hour,
    minute: values.minute
  };
}

function toMinutes(value: string): number {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

export function isWithinBusinessHours(
  startAt: Date,
  endAt: Date,
  businessHours: BusinessHourInterval[],
  timezone: string
): boolean {
  const start = getLocalParts(startAt, timezone);
  const end = getLocalParts(endAt, timezone);

  if (start.year !== end.year || start.month !== end.month ||
      start.day !== end.day || start.weekday !== end.weekday) {
    return false;
  }

  const startMinutes = start.hour * 60 + start.minute;
  const endMinutes = end.hour * 60 + end.minute;
  return businessHours
    .filter((hour) => hour.dayOfWeek === start.weekday)
    .some((hour) =>
      startMinutes >= toMinutes(hour.startTime) &&
      endMinutes <= toMinutes(hour.endTime)
    );
}
