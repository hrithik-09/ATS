import { NextRequest } from "next/server";
import { ApiError, errResponse, json, requireUser } from "@/lib/auth";
import { listRequisitions } from "@/lib/db";
import { canApprove } from "@/lib/roles";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!canApprove(user.role)) {
      throw new ApiError(403, "Department Head role required.");
    }
    if (user.role === "Admin") {
      return json({
        requisitions: await listRequisitions({ status: "PendingApproval" }),
      });
    }
    return json({
      requisitions: await listRequisitions({
        departments: user.departments || [],
        status: "PendingApproval",
      }),
    });
  } catch (e) {
    return errResponse(e);
  }
}
