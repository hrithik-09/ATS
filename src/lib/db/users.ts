import { adminAuth, requireAdminDb } from "../firebaseAdmin";
import type { AppUser, OrgSettings } from "../types";
import { SEED_USERS } from "../roles";
import { now } from "./ids";

let seedPromise: Promise<void> | null = null;

export async function ensureSeedUsers() {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    const db = requireAdminDb();
    for (const u of SEED_USERS) {
      const ref = db.collection("users").doc(u.email.toLowerCase());
      const snap = await ref.get();
      const payload: AppUser = {
        id: u.email.toLowerCase(),
        email: u.email.toLowerCase(),
        name: u.name,
        role: u.role,
        title: u.title,
        departments: u.departments || [],
        active: true,
        createdAt: now(),
      };
      if (!snap.exists) {
        await ref.set(payload);
      } else {
        const cur = snap.data() as AppUser;
        if (!cur.departments) {
          await ref.set({ departments: u.departments || [] }, { merge: true });
        }
      }
    }
    const orgRef = db.collection("org").doc("org");
    if (!(await orgRef.get()).exists) {
      await orgRef.set({
        id: "org",
        company: "Talent Acquisition",
        slaDaysDefault: 10,
      } satisfies OrgSettings);
    }
  })().catch((e) => {
    seedPromise = null;
    throw e;
  });
  return seedPromise;
}

function normalizeUser(u: AppUser | null): AppUser | null {
  if (!u) return null;
  let role = u.role as string;
  if (role === "Approver") role = "DepartmentHead";
  if (role === "Recruiter" || role === "Interviewer") role = "Admin";
  return {
    ...u,
    role: role as AppUser["role"],
    departments: u.departments || [],
  };
}

export async function getUserByEmail(email: string): Promise<AppUser | null> {
  const e = email.toLowerCase();
  const snap = await requireAdminDb().collection("users").doc(e).get();
  return snap.exists ? normalizeUser(snap.data() as AppUser) : null;
}

export async function listUsers(): Promise<AppUser[]> {
  const snap = await requireAdminDb().collection("users").get();
  return snap.docs
    .map((d) => normalizeUser(d.data() as AppUser)!)
    .filter((u) => u && u.active !== false);
}

export async function upsertUser(
  data: Omit<AppUser, "id" | "createdAt"> & { createdAt?: string }
): Promise<AppUser> {
  const email = data.email.toLowerCase();
  const user: AppUser = {
    id: email,
    email,
    name: data.name,
    role: data.role,
    title: data.title || data.role,
    departments: data.departments || [],
    active: data.active !== false,
    createdAt: data.createdAt || now(),
  };
  await requireAdminDb()
    .collection("users")
    .doc(email)
    .set(user, { merge: true });
  return user;
}

export async function deactivateUser(email: string) {
  const e = email.toLowerCase();
  await requireAdminDb().collection("users").doc(e).update({ active: false });
}

export async function getOrg(): Promise<OrgSettings> {
  const snap = await requireAdminDb().collection("org").doc("org").get();
  return snap.data() as OrgSettings;
}

export async function saveOrg(patch: Partial<OrgSettings>) {
  await requireAdminDb().collection("org").doc("org").set(patch, { merge: true });
  return getOrg();
}

export async function verifyIdToken(
  token: string
): Promise<{ email: string; name: string; uid: string } | null> {
  const auth = adminAuth();
  if (!auth) return null;
  try {
    const decoded = await auth.verifyIdToken(token);
    return {
      email: (decoded.email || "").toLowerCase(),
      name: decoded.name || decoded.email || "",
      uid: decoded.uid,
    };
  } catch {
    return null;
  }
}
