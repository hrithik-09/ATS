import { NextRequest } from "next/server";
import { ApiError, errResponse, json, requireUser } from "@/lib/auth";
import { getOrg, saveOrg } from "@/lib/db";
import { canManageTeam, canRecruit } from "@/lib/roles";

export async function GET(req: NextRequest) {
  try {
    await requireUser(req);
    return json({ org: await getOrg() });
  } catch (e) {
    return errResponse(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!canManageTeam(user.role) && !canRecruit(user.role)) {
      throw new ApiError(403, "Not allowed.");
    }
    const body = await req.json();
    const org = await saveOrg({
      company: body.company,
      logoUrl: body.logoUrl,
      slaDaysDefault: body.slaDaysDefault,
    });
    return json({ org });
  } catch (e) {
    return errResponse(e);
  }
}
