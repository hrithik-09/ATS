import { requireAdminDb } from "../firebaseAdmin";
import type { ApprovalStatus, Requisition } from "../types";
import { newId, now } from "./ids";

export async function listRequisitions(filter?: {
  raisedByEmail?: string;
  department?: string;
  departments?: string[];
  status?: ApprovalStatus;
}): Promise<Requisition[]> {
  const db = requireAdminDb();
  let snap;
  if (filter?.raisedByEmail && !filter.status && !filter.department && !filter.departments) {
    snap = await db
      .collection("requisitions")
      .where("raisedByEmail", "==", filter.raisedByEmail.toLowerCase())
      .get();
  } else if (filter?.status && !filter.raisedByEmail && !filter.department && !filter.departments) {
    snap = await db
      .collection("requisitions")
      .where("status", "==", filter.status)
      .get();
  } else {
    snap = await db.collection("requisitions").get();
  }

  let list = snap.docs.map((d) => d.data() as Requisition);
  if (filter?.raisedByEmail)
    list = list.filter(
      (r) => r.raisedByEmail === filter.raisedByEmail!.toLowerCase()
    );
  if (filter?.department)
    list = list.filter(
      (r) => r.department.toLowerCase() === filter.department!.toLowerCase()
    );
  if (filter?.departments?.length) {
    const set = new Set(filter.departments.map((d) => d.toLowerCase()));
    list = list.filter((r) => set.has(r.department.toLowerCase()));
  }
  if (filter?.status) list = list.filter((r) => r.status === filter.status);
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getRequisition(id: string): Promise<Requisition | null> {
  const snap = await requireAdminDb().collection("requisitions").doc(id).get();
  return snap.exists ? (snap.data() as Requisition) : null;
}

export async function createRequisition(
  input: Omit<Requisition, "id" | "createdAt" | "updatedAt" | "status"> & {
    status?: ApprovalStatus;
  }
): Promise<Requisition> {
  const id = newId("REQ");
  const req: Requisition = {
    ...input,
    id,
    status: input.status || "PendingApproval",
    raisedByEmail: input.raisedByEmail.toLowerCase(),
    createdAt: now(),
    updatedAt: now(),
  };
  await requireAdminDb().collection("requisitions").doc(id).set(req);
  return req;
}

export async function updateRequisition(
  id: string,
  patch: Partial<Requisition>
): Promise<Requisition | null> {
  const ref = requireAdminDb().collection("requisitions").doc(id);
  await ref.set({ ...patch, updatedAt: now() }, { merge: true });
  const snap = await ref.get();
  return snap.data() as Requisition;
}
