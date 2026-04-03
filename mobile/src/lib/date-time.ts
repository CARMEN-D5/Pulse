export function getDeviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "Australia/Sydney";
}

export function getLocalDateInTimeZone(timeZone: string, date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric"
  });

  const parts = formatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error(`Unable to format a local date for timezone ${timeZone}.`);
  }

  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateString: string) {
  return new Date(`${dateString}T00:00:00.000Z`);
}

export function addDaysToLocalDate(dateString: string, days: number) {
  const nextDate = parseLocalDate(dateString);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate.toISOString().slice(0, 10);
}

export function formatLocalDateLong(dateString: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric"
  }).format(parseLocalDate(dateString));
}

export function formatWeekRange(weekStartLocalDate: string) {
  const weekEndLocalDate = addDaysToLocalDate(weekStartLocalDate, 6);
  return `${formatLocalDateLong(weekStartLocalDate)} - ${formatLocalDateLong(weekEndLocalDate)}`;
}
