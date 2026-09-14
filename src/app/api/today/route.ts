import { NextRequest } from "next/server";
import { errResponse, json, requireUser } from "@/lib/auth";
import {
  getOrg,
  listCandidates,
  listInterviews,
  listRequisitions,
  listAllFeedback,
  listStageEvents,
} from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const org = await getOrg();
    const sla = org.slaDaysDefault || 10;

    let reqs = await listRequisitions();
    if (user.role === "HiringManager") {
      reqs = reqs.filter((r) => r.raisedByEmail === user.email);
    } else if (user.role === "DepartmentHead") {
      const set = new Set((user.departments || []).map((d) => d.toLowerCase()));
      reqs = reqs.filter((r) => set.has(r.department.toLowerCase()));
    }

    const reqIds = new Set(reqs.map((r) => r.id));
    let cands = await listCandidates();
    cands = cands.filter(
      (c) => reqIds.has(c.reqId) || user.role === "Admin"
    );
    if (user.role === "HiringManager" || user.role === "DepartmentHead") {
      cands = cands.filter((c) => reqIds.has(c.reqId));
    }

    const now = Date.now();
    const events = await listStageEvents();
    const lastChange = new Map<string, number>();
    for (const e of events) {
      const t = new Date(e.at).getTime();
      if (!lastChange.has(e.candidateId) || t > lastChange.get(e.candidateId)!) {
        lastChange.set(e.candidateId, t);
      }
    }

    const interviews = await listInterviews();
    const allFb = await listAllFeedback();
    const fbByCand = new Set(allFb.map((f) => f.candidateId));
    const ivByCand = new Set(interviews.map((i) => i.candidateId));

    const newApps = cands
      .filter((c) => {
        const age = now - new Date(c.createdAt).getTime();
        return c.stage === "New" && age < 7 * 86400000;
      })
      .slice(0, 15);

    const awaitingFb = cands
      .filter(
        (c) =>
          ivByCand.has(c.id) &&
          !fbByCand.has(c.id) &&
          !/reject|hire|onboard/i.test(c.stage)
      )
      .slice(0, 15);

    const debriefs = cands
      .filter((c) => /debrief/i.test(c.stage) && !/reject/i.test(c.stage))
      .slice(0, 15);

    const offers = cands
      .filter((c) => /offer/i.test(c.stage) && !/declin|onboard/i.test(c.stage))
      .slice(0, 15);

    const stuck = cands
      .filter((c) => {
        if (/reject|hire|onboard|talent pool|declin/i.test(c.stage)) return false;
        const since = lastChange.get(c.id) || new Date(c.createdAt).getTime();
        const days = Math.floor((now - since) / 86400000);
        return days >= sla;
      })
      .map((c) => {
        const since = lastChange.get(c.id) || new Date(c.createdAt).getTime();
        return {
          ...c,
          days: Math.floor((now - since) / 86400000),
          sla,
        };
      })
      .sort((a, b) => b.days - a.days)
      .slice(0, 15);

    const pendingApprovals = reqs.filter((r) => r.status === "PendingApproval");
    const reqsNeed = reqs
      .filter((r) => r.status === "Approved")
      .filter((r) => !cands.some((c) => c.reqId === r.id))
      .slice(0, 15);

    return json({
      newApps,
      awaitingFb,
      debriefs,
      offers,
      stuck,
      pendingApprovals,
      reqsNeed,
      sla,
    });
  } catch (e) {
    return errResponse(e);
  }
}
