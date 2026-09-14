import { NextRequest } from "next/server";
import { ApiError, errResponse, requireUser } from "@/lib/auth";
import { getRequisition } from "@/lib/db";
import { userCoversDepartment } from "@/lib/roles";
import { adminStorage } from "@/lib/firebaseAdmin";

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
      throw new ApiError(403, "Not your requisition.");
    }
    if (
      user.role === "DepartmentHead" &&
      !userCoversDepartment(user.departments, r.department)
    ) {
      throw new ApiError(403, "Not your department.");
    }

    if (!r.jdPath) {
      throw new ApiError(404, "No JD PDF attached to this requisition.");
    }

    const bucket = adminStorage()?.bucket();
    if (!bucket) {
      throw new ApiError(503, "File storage is not configured.");
    }

    const file = bucket.file(r.jdPath);
    const [exists] = await file.exists();
    if (!exists) {
      throw new ApiError(
        404,
        "JD file is missing in storage. Re-upload when editing is available."
      );
    }

    const [buf] = await file.download();
    const name = (r.jdFileName || "job-description.pdf").replace(
      /[^\w.\- ()]+/g,
      "_"
    );

    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (e) {
    return errResponse(e);
  }
}
