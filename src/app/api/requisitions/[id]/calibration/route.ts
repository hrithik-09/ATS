import { NextRequest } from "next/server";
import { ApiError, errResponse, json, requireUser } from "@/lib/auth";
import {
  getCalibration,
  getRequisition,
  saveCalibration,
} from "@/lib/db";
import { canRecruit } from "@/lib/roles";
import { adminStorage } from "@/lib/firebaseAdmin";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  try {
    await requireUser(req);
    const { id } = await ctx.params;
    return json({
      calibration: (await getCalibration(id)) || {
        reqId: id,
        notes: "",
        filePaths: [],
        updatedAt: "",
        updatedBy: "",
      },
    });
  } catch (e) {
    return errResponse(e);
  }
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const user = await requireUser(req);
    if (!canRecruit(user.role) && user.role !== "HiringManager") {
      throw new ApiError(403, "Not allowed.");
    }
    const { id } = await ctx.params;
    const r = await getRequisition(id);
    if (!r) throw new ApiError(404, "Not found.");
    const body = await req.json();
    const existing = (await getCalibration(id)) || {
      reqId: id,
      notes: "",
      filePaths: [] as { name: string; path: string }[],
      updatedAt: "",
      updatedBy: "",
    };
    let filePaths = existing.filePaths || [];
    if (body.fileBase64 && body.fileName) {
      const path = `calibration/${id}/${Date.now()}_${body.fileName}`;
      const bucket = adminStorage()?.bucket();
      if (bucket) {
        const buf = Buffer.from(String(body.fileBase64), "base64");
        await bucket.file(path).save(buf, {
          metadata: { contentType: body.fileMime || "application/octet-stream" },
        });
      }
      filePaths = [...filePaths, { name: String(body.fileName), path }];
    }
    const cal = await saveCalibration({
      reqId: id,
      notes: body.notes !== undefined ? String(body.notes) : existing.notes,
      filePaths,
      updatedAt: new Date().toISOString(),
      updatedBy: user.email,
    });
    return json({ calibration: cal });
  } catch (e) {
    return errResponse(e);
  }
}
