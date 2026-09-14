import { NextRequest } from "next/server";
import { ApiError, errResponse, json, requireUser } from "@/lib/auth";
import {
  addAudit,
  createCandidate,
  getRequisition,
  listCandidates,
} from "@/lib/db";
import { canRecruit } from "@/lib/roles";
import { adminStorage } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const reqId = new URL(req.url).searchParams.get("reqId") || undefined;
    if (reqId) {
      const r = await getRequisition(reqId);
      if (!r) throw new ApiError(404, "Requisition not found.");
      if (
        user.role === "HiringManager" &&
        r.raisedByEmail !== user.email
      ) {
        throw new ApiError(403, "Not your requisition.");
      }
    }
    return json({ candidates: await listCandidates(reqId) });
  } catch (e) {
    return errResponse(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!canRecruit(user.role)) {
      throw new ApiError(403, "Only Admin can add candidates.");
    }
    const body = await req.json();
    const reqId = String(body.reqId || "");
    if (!reqId) throw new ApiError(400, "reqId required.");
    const r = await getRequisition(reqId);
    if (!r) throw new ApiError(404, "Requisition not found.");
    if (r.status !== "Approved") {
      throw new ApiError(403, "Wait until the requisition is approved.");
    }

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    if (!name || !email) {
      throw new ApiError(400, "Name and email are required.");
    }

    let cvPath: string | undefined;
    let cvFileName: string | undefined;
    if (body.cvBase64 && body.cvFileName) {
      cvFileName = String(body.cvFileName);
      cvPath = `cvs/${reqId}/${Date.now()}_${cvFileName}`;
      const bucket = adminStorage()?.bucket();
      if (bucket) {
        const buf = Buffer.from(String(body.cvBase64), "base64");
        await bucket.file(cvPath).save(buf, {
          metadata: { contentType: body.cvMime || "application/pdf" },
        });
      }
    }

    const cand = await createCandidate({
      reqId,
      name,
      email,
      phone: String(body.phone || ""),
      location: String(body.location || ""),
      stage: "PendingHMApproval",
      currentCtc: body.currentCtc ? String(body.currentCtc) : undefined,
      expectedCtc: body.expectedCtc ? String(body.expectedCtc) : undefined,
      notice: body.notice ? String(body.notice) : undefined,
      remarks: body.remarks ? String(body.remarks) : undefined,
      cvPath,
      cvFileName,
    });
    await addAudit({
      action: "candidate.create",
      actorEmail: user.email,
      entityType: "candidate",
      entityId: cand.id,
      detail: reqId,
    });
    return json({ candidate: cand }, 201);
  } catch (e) {
    return errResponse(e);
  }
}
