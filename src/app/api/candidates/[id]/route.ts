import { NextRequest } from "next/server";
import { ApiError, errResponse, json, requireUser } from "@/lib/auth";
import {
  addAudit,
  createFeedback,
  getCandidate,
  getRequisition,
  listFeedback,
  listInterviews,
  listStageEvents,
  updateCandidate,
} from "@/lib/db";
import { canRecruit } from "@/lib/roles";
import type { CandidateStage } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

const POST_HM_STAGES: CandidateStage[] = [
  "HMApproved",
  "Screened",
  "Shortlist",
  "Interview",
  "Interview Scheduled",
  "Selected",
  "Offered",
  "Onboarded",
  "On Hold",
  "Debrief",
];

function isHmOwner(
  role: string,
  raisedByEmail: string,
  userEmail: string
) {
  return role === "HiringManager" && raisedByEmail === userEmail;
}

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    await requireUser(req);
    const { id } = await ctx.params;
    const c = await getCandidate(id);
    if (!c) throw new ApiError(404, "Candidate not found.");
    const [events, feedback, interviews] = await Promise.all([
      listStageEvents(id),
      listFeedback(id),
      listInterviews({ candidateId: id }),
    ]);
    return json({ candidate: c, events, feedback, interviews });
  } catch (e) {
    return errResponse(e);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser(req);
    const { id } = await ctx.params;
    const c = await getCandidate(id);
    if (!c) throw new ApiError(404, "Candidate not found.");
    const r = await getRequisition(c.reqId);
    if (!r) throw new ApiError(404, "Requisition missing.");
    if (r.status !== "Approved" && user.role !== "Admin") {
      throw new ApiError(403, "Requisition not approved.");
    }
    if (!canRecruit(user.role) && user.role !== "HiringManager") {
      throw new ApiError(403, "Not allowed.");
    }

    const body = await req.json();
    const hmOwner = isHmOwner(user.role, r.raisedByEmail, user.email);
    const canHmDecide = canRecruit(user.role) || hmOwner;

    if (body.action === "hmApprove" || body.action === "hmReject") {
      if (!canHmDecide) {
        throw new ApiError(403, "Only the hiring manager (or Admin) can decide.");
      }
      if (c.stage !== "PendingHMApproval") {
        throw new ApiError(400, "Candidate is not pending HM approval.");
      }
      const to: CandidateStage =
        body.action === "hmApprove" ? "HMApproved" : "Rejected";
      const reason =
        body.action === "hmReject"
          ? String(body.reason || "").trim() || "Rejected by hiring manager"
          : undefined;
      const updated = await updateCandidate(
        id,
        {
          stage: to,
          hmDecisionBy: user.email,
          hmDecisionAt: new Date().toISOString(),
          hmRejectReason: reason,
        },
        { byEmail: user.email, from: c.stage, to }
      );
      await addAudit({
        action:
          body.action === "hmApprove"
            ? "candidate.hm_approve"
            : "candidate.hm_reject",
        actorEmail: user.email,
        entityType: "candidate",
        entityId: id,
        detail: reason,
      });
      return json({ candidate: updated });
    }

    if (body.action === "stage") {
      if (!canRecruit(user.role) && !hmOwner) {
        throw new ApiError(403, "Not allowed to change stage.");
      }
      const to = body.stage as CandidateStage;
      if (!to) throw new ApiError(400, "stage required.");
      // HM cannot freely move pending candidates — use hmApprove/hmReject
      if (
        user.role === "HiringManager" &&
        (c.stage === "PendingHMApproval" || to === "PendingHMApproval")
      ) {
        throw new ApiError(
          400,
          "Use Approve / Reject for candidates pending your approval."
        );
      }
      // Interview pipeline stages require HM approval first
      if (
        canRecruit(user.role) &&
        c.stage === "PendingHMApproval" &&
        POST_HM_STAGES.includes(to)
      ) {
        throw new ApiError(
          403,
          "Wait for hiring-manager approval before advancing this candidate."
        );
      }
      const updated = await updateCandidate(
        id,
        { stage: to },
        { byEmail: user.email, from: c.stage, to }
      );
      await addAudit({
        action: "candidate.stage",
        actorEmail: user.email,
        entityType: "candidate",
        entityId: id,
        detail: `${c.stage} → ${to}`,
      });
      return json({ candidate: updated });
    }

    if (body.action === "archive") {
      if (!canRecruit(user.role)) throw new ApiError(403, "Not allowed.");
      const updated = await updateCandidate(id, { archived: true });
      return json({ candidate: updated });
    }

    if (body.action === "feedback") {
      const fb = await createFeedback({
        candidateId: id,
        reqId: c.reqId,
        interviewId: body.interviewId,
        interviewer: String(body.interviewer || user.name),
        stage: String(body.stage || c.stage),
        rating: Number(body.rating) || 0,
        recommendation: String(body.recommendation || ""),
        feedback: String(body.feedback || ""),
        createdBy: user.email,
      });
      return json({ feedback: fb }, 201);
    }

    if (body.action === "debrief") {
      if (!canRecruit(user.role) && !hmOwner) {
        throw new ApiError(403, "Not allowed.");
      }
      if (c.stage === "PendingHMApproval") {
        throw new ApiError(403, "Candidate still pending HM approval.");
      }
      const decision = String(body.decision || "");
      let stage: CandidateStage = c.stage;
      if (decision === "Advance") stage = "Selected";
      else if (decision === "Reject") stage = "Rejected";
      else if (decision === "Hold") stage = "On Hold";
      const updated = await updateCandidate(
        id,
        { stage },
        { byEmail: user.email, from: c.stage, to: stage }
      );
      return json({ candidate: updated, decision });
    }

    if (!canRecruit(user.role)) throw new ApiError(403, "Not allowed.");
    const patch: Record<string, unknown> = {};
    for (const k of [
      "name",
      "email",
      "phone",
      "location",
      "currentCtc",
      "expectedCtc",
      "notice",
      "remarks",
    ]) {
      if (body[k] !== undefined) patch[k] = body[k];
    }
    const updated = await updateCandidate(id, patch);
    return json({ candidate: updated });
  } catch (e) {
    return errResponse(e);
  }
}
