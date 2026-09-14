import { NextRequest } from "next/server";
import { ApiError, errResponse, requireUser } from "@/lib/auth";
import { getCandidate, getRequisition } from "@/lib/db";
import { userCoversDepartment } from "@/lib/roles";
import { adminStorage } from "@/lib/firebaseAdmin";

type Ctx = { params: Promise<{ id: string }> };

function contentTypeForName(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".doc")) return "application/msword";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return "application/octet-stream";
}

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser(req);
    const { id } = await ctx.params;
    const c = await getCandidate(id);
    if (!c) throw new ApiError(404, "Candidate not found.");

    const r = await getRequisition(c.reqId);
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

    if (!c.cvPath) {
      throw new ApiError(404, "No CV attached to this candidate.");
    }

    const bucket = adminStorage()?.bucket();
    if (!bucket) {
      throw new ApiError(503, "File storage is not configured.");
    }

    const file = bucket.file(c.cvPath);
    const [exists] = await file.exists();
    if (!exists) {
      throw new ApiError(
        404,
        "CV file is missing in storage. Re-upload the candidate CV."
      );
    }

    const [buf] = await file.download();
    const name = (c.cvFileName || "cv.pdf").replace(/[^\w.\- ()]+/g, "_");

    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": contentTypeForName(name),
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (e) {
    return errResponse(e);
  }
}
