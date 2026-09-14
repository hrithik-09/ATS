import { NextRequest } from "next/server";
import {
  ensureSeedUsers,
  getUserByEmail,
  verifyIdToken,
} from "./db";
import type { AppUser, Role } from "./types";
import { hasMinRole } from "./roles";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireUser(
  req: NextRequest,
  minRole?: Role
): Promise<AppUser> {
  await ensureSeedUsers();
  const hdr = req.headers.get("authorization") || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : "";
  if (!token) throw new ApiError(401, "Sign in required.");
  const identity = await verifyIdToken(token);
  if (!identity?.email) throw new ApiError(401, "Invalid session.");
  const user = await getUserByEmail(identity.email);
  if (!user || !user.active) {
    throw new ApiError(
      403,
      `Signed in as ${identity.email} but that email is not on the team. Ask an Admin to add you.`
    );
  }
  if (minRole && !hasMinRole(user.role, minRole)) {
    throw new ApiError(
      403,
      `Your role (${user.role}) cannot do that.`
    );
  }
  return user;
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status });
}

export function errResponse(e: unknown) {
  if (e instanceof ApiError) return json({ error: e.message }, e.status);
  console.error(e);
  return json({ error: e instanceof Error ? e.message : "Server error" }, 500);
}
