import { NextRequest } from "next/server";
import { errResponse, json, requireUser } from "@/lib/auth";
import { getOrg } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const org = await getOrg();
    return json({ user, org });
  } catch (e) {
    return errResponse(e);
  }
}
