import { NextRequest } from "next/server";
import { errResponse, json, requireUser } from "@/lib/auth";
import { listCandidates, listRequisitions } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    let reqs = await listRequisitions();
    if (user.role === "HiringManager") {
      reqs = reqs.filter((r) => r.raisedByEmail === user.email);
    } else if (user.role === "DepartmentHead") {
      const set = new Set((user.departments || []).map((d) => d.toLowerCase()));
      reqs = reqs.filter((r) => set.has(r.department.toLowerCase()));
    }
    const cands = await listCandidates();
    const reqIds = new Set(reqs.map((r) => r.id));
    const scoped = cands.filter(
      (c) => user.role === "Admin" || reqIds.has(c.reqId)
    );

    const byStage: Record<string, number> = {};
    for (const c of scoped) {
      byStage[c.stage] = (byStage[c.stage] || 0) + 1;
    }

    const approvalFunnel = {
      pending: reqs.filter((r) => r.status === "PendingApproval").length,
      approved: reqs.filter((r) => r.status === "Approved").length,
      rejected: reqs.filter((r) => r.status === "Rejected").length,
      closed: reqs.filter((r) => r.status === "Closed").length,
    };

    return json({
      totalCandidates: scoped.length,
      openReqs: reqs.filter((r) => r.status === "Approved").length,
      stages: byStage,
      approvalFunnel,
      requisitions: reqs.length,
    });
  } catch (e) {
    return errResponse(e);
  }
}
