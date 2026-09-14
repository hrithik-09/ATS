import { NextRequest } from "next/server";
import { ApiError, errResponse, json, requireUser } from "@/lib/auth";
import {
  addAudit,
  createInterview,
  getCandidate,
  getInterview,
  getPlan,
  getRequisition,
  listInterviews,
  updateCandidate,
  updateInterview,
} from "@/lib/db";
import { canRecruit } from "@/lib/roles";
import {
  cancelInterviewCalendarEvent,
  createInterviewCalendarEvent,
  updateInterviewCalendarEvent,
} from "@/lib/googleCalendar";
import { isCalendarEnabled } from "@/lib/calendarConfig";

const BLOCKED_SCHEDULE_STAGES = new Set([
  "PendingHMApproval",
  "Rejected",
]);

export async function GET(req: NextRequest) {
  try {
    await requireUser(req);
    const sp = new URL(req.url).searchParams;
    return json({
      interviews: await listInterviews({
        candidateId: sp.get("candidateId") || undefined,
        reqId: sp.get("reqId") || undefined,
      }),
      calendarEnabled: isCalendarEnabled(),
    });
  } catch (e) {
    return errResponse(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!canRecruit(user.role)) {
      throw new ApiError(403, "Only Admin can schedule.");
    }
    const body = await req.json();
    const reqId = String(body.reqId || "");
    const candidateId = String(body.candidateId || "");
    const datetime = String(body.datetime || "");
    const durationMinutes = Number(body.durationMinutes) || 60;
    if (!reqId || !candidateId || !datetime) {
      throw new ApiError(400, "reqId, candidateId, and datetime required.");
    }
    const r = await getRequisition(reqId);
    if (!r || r.status !== "Approved") {
      throw new ApiError(403, "Requisition must be approved.");
    }
    const c = await getCandidate(candidateId);
    if (!c || c.reqId !== reqId) throw new ApiError(400, "Invalid candidate.");

    if (BLOCKED_SCHEDULE_STAGES.has(c.stage)) {
      throw new ApiError(
        403,
        c.stage === "PendingHMApproval"
          ? "Hiring manager must approve this candidate before scheduling."
          : "Cannot schedule a rejected candidate."
      );
    }

    const plan = await getPlan(reqId);
    if (!plan?.rounds?.length) {
      throw new ApiError(
        400,
        "Configure interview rounds on this requisition before scheduling."
      );
    }

    const roundIndex = Math.max(
      1,
      Number(body.roundIndex) || 1
    );
    const round =
      plan.rounds.find((x) => x.order === roundIndex) ||
      plan.rounds[roundIndex - 1];
    if (!round) {
      throw new ApiError(400, `Round ${roundIndex} is not configured.`);
    }
    const roundName = round.name;

    const existing = await listInterviews({ candidateId });
    const activeForRound = existing.filter(
      (iv) =>
        iv.status !== "Cancelled" &&
        (iv.roundIndex || 1) === roundIndex
    );
    if (activeForRound.length > 0) {
      throw new ApiError(
        400,
        `Round ${roundIndex} is already scheduled for this candidate.`
      );
    }
    const maxBooked = existing
      .filter((iv) => iv.status !== "Cancelled")
      .reduce((m, iv) => Math.max(m, iv.roundIndex || 1), 0);
    if (roundIndex > maxBooked + 1) {
      throw new ApiError(
        400,
        `Schedule Round ${maxBooked + 1} before Round ${roundIndex}.`
      );
    }

    const interviewers = String(body.interviewers || "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    if (isCalendarEnabled() && interviewers.length === 0) {
      throw new ApiError(
        400,
        "Add at least one interviewer email to send calendar invites."
      );
    }

    const stage = String(body.stage || roundName || "Interview");
    const attendees = [
      ...interviewers,
      ...(c.email ? [c.email.toLowerCase()] : []),
    ];

    let meetLink: string | undefined;
    let calendarEventId: string | undefined;

    if (isCalendarEnabled()) {
      try {
        const event = await createInterviewCalendarEvent({
          summary: `${roundName}: ${c.name} — ${r.title}`,
          description: [
            `Talent Acquisition ATS interview`,
            `Round: ${roundIndex}. ${roundName}`,
            `Candidate: ${c.name}${c.email ? ` (${c.email})` : ""}`,
            `Requisition: ${r.id} — ${r.title}`,
            `Department: ${r.department}`,
            `Scheduled by: ${user.email}`,
          ].join("\n"),
          startIso: datetime,
          durationMinutes,
          attendeeEmails: attendees,
        });
        calendarEventId = event.eventId;
        meetLink = event.meetLink;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Calendar create failed";
        throw new ApiError(
          502,
          `Could not create Google Calendar invite: ${msg}. Check Calendar API + domain-wide delegation.`
        );
      }
    }

    const iv = await createInterview({
      reqId,
      candidateId,
      stage,
      roundIndex,
      roundName,
      interviewerEmails: interviewers,
      datetime,
      meetLink,
      calendarEventId,
      status: "Scheduled",
      createdBy: user.email,
    });

    // Always move into the interview cycle when a round is booked
    // (including after debrief Advance → Selected).
    if (
      c.stage === "HMApproved" ||
      c.stage === "Interview" ||
      c.stage === "Selected" ||
      c.stage === "Debrief" ||
      c.stage === "On Hold" ||
      c.stage === "Screened" ||
      c.stage === "Shortlist"
    ) {
      await updateCandidate(
        candidateId,
        { stage: "Interview Scheduled" },
        {
          byEmail: user.email,
          from: c.stage,
          to: "Interview Scheduled",
        }
      );
    }

    await addAudit({
      action: "interview.schedule",
      actorEmail: user.email,
      entityType: "interview",
      entityId: iv.id,
      detail: calendarEventId
        ? `${datetime}; round=${roundIndex}; cal=${calendarEventId}`
        : `${datetime}; round=${roundIndex}`,
    });
    return json(
      {
        interview: iv,
        calendarEnabled: isCalendarEnabled(),
        inviteSent: !!calendarEventId,
      },
      201
    );
  } catch (e) {
    return errResponse(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!canRecruit(user.role)) throw new ApiError(403, "Not allowed.");
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) throw new ApiError(400, "id required.");

    const existing = await getInterview(id);
    if (!existing) throw new ApiError(404, "Interview not found.");

    const status = body.status as typeof existing.status | undefined;
    const datetime = body.datetime ? String(body.datetime) : undefined;
    const interviewerEmails = Array.isArray(body.interviewerEmails)
      ? (body.interviewerEmails as string[])
      : undefined;

    if (isCalendarEnabled() && existing.calendarEventId) {
      try {
        if (status === "Cancelled") {
          await cancelInterviewCalendarEvent(existing.calendarEventId);
        } else if (datetime || interviewerEmails) {
          await updateInterviewCalendarEvent(existing.calendarEventId, {
            startIso: datetime,
            attendeeEmails: interviewerEmails,
          });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Calendar update failed";
        throw new ApiError(502, `Calendar update failed: ${msg}`);
      }
    }

    await updateInterview(id, {
      status,
      datetime,
      interviewerEmails,
    });
    await addAudit({
      action: "interview.update",
      actorEmail: user.email,
      entityType: "interview",
      entityId: id,
      detail: status || "update",
    });
    return json({ ok: true });
  } catch (e) {
    return errResponse(e);
  }
}
