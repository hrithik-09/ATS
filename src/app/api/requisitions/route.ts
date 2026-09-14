import { NextRequest } from "next/server";
import { ApiError, errResponse, json, requireUser } from "@/lib/auth";
import {
  addAudit,
  createRequisition,
  listCandidates,
  listRequisitions,
  listUsers,
} from "@/lib/db";
import {
  canRaiseReq,
  userCoversDepartment,
} from "@/lib/roles";
import { adminStorage } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const { searchParams } = new URL(req.url);
    const mine = searchParams.get("mine") === "1";

    let requisitions;
    if (user.role === "HiringManager" || mine) {
      requisitions = await listRequisitions({
        raisedByEmail: user.email,
      });
    } else if (user.role === "DepartmentHead") {
      requisitions = await listRequisitions({
        departments: user.departments || [],
      });
    } else {
      requisitions = await listRequisitions();
    }

    const cands = await listCandidates();
    const reqIds = new Set(requisitions.map((r) => r.id));
    const candidateCount: Record<string, number> = {};
    const stageBreakdown: Record<string, Record<string, number>> = {};
    for (const c of cands) {
      if (!reqIds.has(c.reqId)) continue;
      candidateCount[c.reqId] = (candidateCount[c.reqId] || 0) + 1;
      if (!stageBreakdown[c.reqId]) stageBreakdown[c.reqId] = {};
      stageBreakdown[c.reqId]![c.stage] =
        (stageBreakdown[c.reqId]![c.stage] || 0) + 1;
    }

    return json({
      requisitions: requisitions.map((r) => ({
        ...r,
        candidateCount: candidateCount[r.id] || 0,
        stageBreakdown: stageBreakdown[r.id] || {},
      })),
    });
  } catch (e) {
    return errResponse(e);
  }
}


export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!canRaiseReq(user.role)) {
      throw new ApiError(403, "Only Hiring Managers (or Admin) can raise requisitions.");
    }
    const body = await req.json();
    const title = String(body.title || "").trim();
    const department = String(body.department || "").trim();
    if (!title || !department) {
      throw new ApiError(400, "Title and department are required.");
    }
    if (
      user.role === "HiringManager" &&
      !userCoversDepartment(user.departments, department)
    ) {
      throw new ApiError(
        403,
        `You are not assigned to department “${department}”. Ask an Admin to add it on your profile.`
      );
    }

    const heads = (await listUsers()).filter(
      (u) =>
        u.role === "DepartmentHead" &&
        userCoversDepartment(u.departments, department)
    );
    if (heads.length === 0) {
      throw new ApiError(
        400,
        `No Department Head is assigned to “${department}”. Ask an Admin to add one before raising this req.`
      );
    }

    let jdPath: string | undefined;
    let jdFileName: string | undefined;
    if (body.jdBase64 && body.jdFileName) {
      jdFileName = String(body.jdFileName);
      if (!jdFileName.toLowerCase().endsWith(".pdf")) {
        throw new ApiError(400, "JD must be a PDF file.");
      }
      const bucket = adminStorage()?.bucket();
      if (!bucket) {
        throw new ApiError(
          503,
          "File storage is not configured. Enable Firebase Storage, then re-upload the JD."
        );
      }
      jdPath = `jds/${Date.now()}_${jdFileName.replace(/[^\w.\-]+/g, "_")}`;
      const buf = Buffer.from(String(body.jdBase64), "base64");
      await bucket.file(jdPath).save(buf, {
        metadata: { contentType: "application/pdf" },
      });
    }

    const locations = Array.isArray(body.locations)
      ? (body.locations as string[]).map((s) => String(s).trim()).filter(Boolean)
      : String(body.location || "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

    const reqn = await createRequisition({
      title,
      department,
      lob: String(body.lob || department || "GEN"),
      location: locations.join(", "),
      employment: String(body.employment || "Full-time"),
      level: String(body.level || ""),
      salaryMin: Number(body.salaryMin) || 0,
      salaryMax: Number(body.salaryMax) || 0,
      priority: String(body.priority || ""),
      openings: Math.max(1, Number(body.openings) || 1),
      notes: String(body.notes || ""),
      jdText: String(body.jdText || ""),
      jdPath,
      jdFileName,
      raisedByEmail: user.email,
      raisedByName: user.name,
      status: "PendingApproval",
    });
    await addAudit({
      action: "requisition.create",
      actorEmail: user.email,
      entityType: "requisition",
      entityId: reqn.id,
      detail: `Pending approval for ${department} (${heads.map((h) => h.email).join(", ")})`,
    });
    return json({ requisition: reqn, departmentHeads: heads.map((h) => h.email) }, 201);
  } catch (e) {
    return errResponse(e);
  }
}
