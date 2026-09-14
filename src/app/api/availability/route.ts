import { NextRequest } from "next/server";
import { errResponse, json, requireUser } from "@/lib/auth";

/** Free-busy placeholder — returns suggested slots without live Calendar when not configured. */
export async function POST(req: NextRequest) {
  try {
    await requireUser(req);
    const body = await req.json();
    const date = String(body.date || new Date().toISOString().slice(0, 10));
    const slots = [10, 11, 14, 15, 16].map((h) => ({
      start: `${date}T${String(h).padStart(2, "0")}:00:00`,
      end: `${date}T${String(h + 1).padStart(2, "0")}:00:00`,
      available: true,
    }));
    return json({
      slots,
      note: "Live Google free-busy can be enabled later; showing suggested business hours.",
    });
  } catch (e) {
    return errResponse(e);
  }
}
