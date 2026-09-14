import { NextRequest } from "next/server";
import { errResponse, json, requireUser } from "@/lib/auth";
import { listCandidates, listRequisitions } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const q = (new URL(req.url).searchParams.get("q") || "")
      .trim()
      .toLowerCase();
    if (q.length < 2) return json({ reqs: [], candidates: [] });

    let reqs = await listRequisitions();
    let cands = await listCandidates();
    if (user.role === "HiringManager") {
      reqs = reqs.filter((r) => r.raisedByEmail === user.email);
      const ids = new Set(reqs.map((r) => r.id));
      cands = cands.filter((c) => ids.has(c.reqId));
    }

    const reqHits = reqs
      .filter((r) =>
        [r.id, r.title, r.department, r.location, r.raisedByName, r.status]
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
      .slice(0, 20);

    const candHits = cands
      .filter((c) =>
        [c.name, c.email, c.phone, c.location, c.stage, c.reqId]
          .join(" ")
          .toLowerCase()
          .includes(q)
      )
      .slice(0, 30);

    return json({ reqs: reqHits, candidates: candHits });
  } catch (e) {
    return errResponse(e);
  }
}
