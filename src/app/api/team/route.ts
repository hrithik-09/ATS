import { NextRequest } from "next/server";
import { ApiError, errResponse, json, requireUser } from "@/lib/auth";
import { deactivateUser, listUsers, upsertUser } from "@/lib/db";
import { canManageTeam, DEPARTMENTS, ROLE_LABELS } from "@/lib/roles";
import type { Role } from "@/lib/types";

const ALLOWED_ROLES: Role[] = ["Admin", "HiringManager", "DepartmentHead"];

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!canManageTeam(user.role)) {
      return json({ users: [user], departments: DEPARTMENTS, roleLabels: ROLE_LABELS });
    }
    return json({
      users: await listUsers(),
      departments: DEPARTMENTS,
      roleLabels: ROLE_LABELS,
    });
  } catch (e) {
    return errResponse(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!canManageTeam(user.role)) throw new ApiError(403, "Admin only.");
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    if (!email) throw new ApiError(400, "Email required.");
    const role = (body.role || "HiringManager") as Role;
    if (!ALLOWED_ROLES.includes(role)) {
      throw new ApiError(400, "Invalid role.");
    }
    const departments = Array.isArray(body.departments)
      ? body.departments.map(String)
      : [];
    if (role !== "Admin" && departments.length === 0) {
      throw new ApiError(
        400,
        "Assign at least one department for Hiring Manager or Department Head."
      );
    }
    const saved = await upsertUser({
      email,
      name: String(body.name || email),
      role,
      title: String(body.title || ROLE_LABELS[role]),
      departments: role === "Admin" ? [...DEPARTMENTS] : departments,
      active: true,
    });
    return json({ user: saved, users: await listUsers() }, 201);
  } catch (e) {
    return errResponse(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser(req);
    if (!canManageTeam(user.role)) throw new ApiError(403, "Admin only.");
    const email = new URL(req.url).searchParams.get("email");
    if (!email) throw new ApiError(400, "email required.");
    await deactivateUser(email);
    return json({ users: await listUsers() });
  } catch (e) {
    return errResponse(e);
  }
}
