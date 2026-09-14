export function isCalendarEnabled() {
  return process.env.GOOGLE_CALENDAR_ENABLED === "1";
}
