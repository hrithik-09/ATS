import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { isCalendarEnabled } from "./calendarConfig";

export { isCalendarEnabled };

const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

function loadSaJson(): {
  client_email: string;
  private_key: string;
} | null {
  const pathEnv = process.env.FIREBASE_ADMIN_CREDENTIALS_PATH;
  if (pathEnv) {
    const full = resolve(process.cwd(), pathEnv);
    if (existsSync(full)) {
      return JSON.parse(readFileSync(full, "utf8"));
    }
  }
  if (
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
    process.env.FIREBASE_ADMIN_PRIVATE_KEY
  ) {
    return {
      client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      private_key: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(
        /\\n/g,
        "\n"
      ),
    };
  }
  return null;
}

async function getCalendarClient() {
  const { google } = await import("googleapis");
  const impersonate = (process.env.GOOGLE_CALENDAR_IMPERSONATE_EMAIL || "")
    .trim()
    .toLowerCase();
  if (!impersonate) {
    throw new Error(
      "GOOGLE_CALENDAR_IMPERSONATE_EMAIL is required (Workspace user whose calendar hosts invites)."
    );
  }
  const sa = loadSaJson();
  if (!sa?.client_email || !sa?.private_key) {
    throw new Error("Firebase Admin service account credentials are missing.");
  }

  const auth = new google.auth.JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: CALENDAR_SCOPES,
    subject: impersonate,
  });
  await auth.authorize();
  return google.calendar({ version: "v3", auth });
}

export type CreateInterviewEventInput = {
  summary: string;
  description: string;
  startIso: string;
  durationMinutes?: number;
  attendeeEmails: string[];
  timeZone?: string;
};

export type CreateInterviewEventResult = {
  eventId: string;
  htmlLink?: string;
  meetLink?: string;
};

export async function createInterviewCalendarEvent(
  input: CreateInterviewEventInput
): Promise<CreateInterviewEventResult> {
  const calendar = await getCalendarClient();
  const duration = input.durationMinutes || 60;
  const start = new Date(input.startIso);
  if (Number.isNaN(start.getTime())) {
    throw new Error("Invalid interview datetime.");
  }
  const end = new Date(start.getTime() + duration * 60_000);
  const timeZone =
    input.timeZone ||
    process.env.GOOGLE_CALENDAR_TIMEZONE ||
    "Asia/Kolkata";

  const attendees = [
    ...new Set(
      input.attendeeEmails
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    ),
  ].map((email) => ({ email }));

  const requestId = `ats-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const res = await calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    sendUpdates: "all",
    requestBody: {
      summary: input.summary,
      description: input.description,
      start: { dateTime: start.toISOString(), timeZone },
      end: { dateTime: end.toISOString(), timeZone },
      attendees,
      guestsCanModify: false,
      guestsCanInviteOthers: false,
      conferenceData: {
        createRequest: {
          requestId,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
    },
  });

  const event = res.data;
  const meetLink =
    event.hangoutLink ||
    event.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")
      ?.uri ||
    undefined;

  if (!event.id) throw new Error("Calendar event created without an id.");

  return {
    eventId: event.id,
    htmlLink: event.htmlLink || undefined,
    meetLink,
  };
}

export async function cancelInterviewCalendarEvent(eventId: string) {
  if (!isCalendarEnabled() || !eventId) return;
  const calendar = await getCalendarClient();
  await calendar.events.delete({
    calendarId: "primary",
    eventId,
    sendUpdates: "all",
  });
}

export async function updateInterviewCalendarEvent(
  eventId: string,
  patch: {
    startIso?: string;
    durationMinutes?: number;
    attendeeEmails?: string[];
    summary?: string;
    description?: string;
  }
) {
  const calendar = await getCalendarClient();
  const existing = await calendar.events.get({
    calendarId: "primary",
    eventId,
  });
  const timeZone = process.env.GOOGLE_CALENDAR_TIMEZONE || "Asia/Kolkata";
  const duration = patch.durationMinutes || 60;
  const startIso = patch.startIso || existing.data.start?.dateTime;
  if (!startIso) throw new Error("Event has no start time.");
  const start = new Date(startIso);
  const end = new Date(start.getTime() + duration * 60_000);

  const attendees = patch.attendeeEmails
    ? [
        ...new Set(
          patch.attendeeEmails
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean)
        ),
      ].map((email) => ({ email }))
    : existing.data.attendees;

  const res = await calendar.events.patch({
    calendarId: "primary",
    eventId,
    conferenceDataVersion: 1,
    sendUpdates: "all",
    requestBody: {
      summary: patch.summary ?? existing.data.summary,
      description: patch.description ?? existing.data.description,
      start: { dateTime: start.toISOString(), timeZone },
      end: { dateTime: end.toISOString(), timeZone },
      attendees,
    },
  });

  return {
    eventId,
    meetLink:
      res.data.hangoutLink ||
      res.data.conferenceData?.entryPoints?.find(
        (e) => e.entryPointType === "video"
      )?.uri,
  };
}
