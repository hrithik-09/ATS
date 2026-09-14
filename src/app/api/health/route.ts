import { getAdminApp } from "@/lib/firebaseAdmin";
import { isCalendarEnabled } from "@/lib/calendarConfig";
import { json } from "@/lib/auth";

export async function GET() {
  return json({
    ok: true,
    firebase: !!getAdminApp(),
    calendarEnabled: isCalendarEnabled(),
    name: "Talent Acquisition ATS",
  });
}
