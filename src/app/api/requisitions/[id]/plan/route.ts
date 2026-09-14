import { NextRequest } from "next/server";
import { ApiError, errResponse, json, requireUser } from "@/lib/auth";
import { getPlan, getRequisition, savePlan } from "@/lib/db";
import { canRecruit } from "@/lib/roles";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    await requireUser(req);
    const { id } = await ctx.params;
    return json({ plan: await getPlan(id) });
  } catch (e) {
    return errResponse(e);
  }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser(req);
    if (!canRecruit(user.role)) throw new ApiError(403, "Not allowed.");
    const { id } = await ctx.params;
    const r = await getRequisition(id);
    if (!r || r.status !== "Approved") {
      throw new ApiError(403, "Requisition must be approved.");
    }
    const body = await req.json();
    const raw = Array.isArray(body.rounds) ? body.rounds : [];
    if (raw.length === 0) {
      throw new ApiError(400, "Add at least one interview round.");
    }
    const rounds = raw.map(
      (
        row: { name?: string; type?: string; order?: number; competencies?: string[] },
        i: number
      ) => ({
        name: String(row.name || `Round ${i + 1}`).trim() || `Round ${i + 1}`,
        type: row.type ? String(row.type) : "interview",
        order: Number(row.order) || i + 1,
        competencies: Array.isArray(row.competencies) ? row.competencies : [],
      })
    );
    const plan = await savePlan({
      reqId: id,
      rounds,
      updatedAt: new Date().toISOString(),
      updatedBy: user.email,
    });
    return json({ plan });
  } catch (e) {
    return errResponse(e);
  }
}
