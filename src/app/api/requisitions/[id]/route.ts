import { NextRequest } from "next/server";
import { ApiError, errResponse, json, requireUser } from "@/lib/auth";
import { addAudit, getRequisition, updateRequisition } from "@/lib/db";
import { canApprove, canRecruit, userCoversDepartment } from "@/lib/roles";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser(req);
    const { id } = await ctx.params;
    const r = await getRequisition(id);
    if (!r) throw new ApiError(404, "Requisition not found.");
    if (
      user.role === "HiringManager" &&
      r.raisedByEmail !== user.email
    ) {
      throw new ApiError(403, "You can only view requisitions you raised.");
    }
    if (
      user.role === "DepartmentHead" &&
      !userCoversDepartment(user.departments, r.department)
    ) {
      throw new ApiError(403, "Not your department.");
    }
    return json({ requisition: r });
  } catch (e) {
    return errResponse(e);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser(req);
    const { id } = await ctx.params;
    const r = await getRequisition(id);
    if (!r) throw new ApiError(404, "Requisition not found.");
    const body = await req.json();

    if (body.action === "approve" || body.action === "reject") {
      if (!canApprove(user.role)) {
        throw new ApiError(403, "Not a department head.");
      }
      if (
        user.role === "DepartmentHead" &&
        !userCoversDepartment(user.departments, r.department)
      ) {
        throw new ApiError(403, "This requisition is not in your department.");
      }
      if (r.status !== "PendingApproval") {
        throw new ApiError(400, "Requisition is not pending approval.");
      }
      if (body.action === "approve") {
        const updated = await updateRequisition(id, {
          status: "Approved",
          approvedAt: new Date().toISOString(),
          approvedBy: user.email,
        });
        await addAudit({
          action: "requisition.approve",
          actorEmail: user.email,
          entityType: "requisition",
          entityId: id,
        });
        return json({ requisition: updated });
      }
      const reason = String(body.reason || "").trim() || "Rejected";
      const updated = await updateRequisition(id, {
        status: "Rejected",
        rejectionReason: reason,
        approvedBy: user.email,
        approvedAt: new Date().toISOString(),
      });
      await addAudit({
        action: "requisition.reject",
        actorEmail: user.email,
        entityType: "requisition",
        entityId: id,
        detail: reason,
      });
      return json({ requisition: updated });
    }

    const canEdit =
      canRecruit(user.role) ||
      (user.role === "HiringManager" &&
        r.raisedByEmail === user.email &&
        r.status === "PendingApproval");
    if (!canEdit) throw new ApiError(403, "Cannot edit this requisition.");

    const patch: Record<string, unknown> = {};
    for (const k of [
      "title",
      "department",
      "lob",
      "location",
      "employment",
      "level",
      "salaryMin",
      "salaryMax",
      "priority",
      "openings",
      "notes",
      "jdText",
    ]) {
      if (body[k] !== undefined) patch[k] = body[k];
    }
    const updated = await updateRequisition(id, patch);
    return json({ requisition: updated });
  } catch (e) {
    return errResponse(e);
  }
}
