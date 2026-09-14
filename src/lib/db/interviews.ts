import { requireAdminDb } from "../firebaseAdmin";
import type {
  AuditLog,
  Calibration,
  Interview,
  InterviewFeedback,
  InterviewPlan,
} from "../types";
import { newId, now } from "./ids";

export async function createInterview(
  input: Omit<Interview, "id" | "createdAt">
): Promise<Interview> {
  const iv: Interview = { ...input, id: newId("INT"), createdAt: now() };
  await requireAdminDb().collection("interviews").doc(iv.id).set(iv);
  return iv;
}

export async function getInterview(id: string): Promise<Interview | null> {
  const snap = await requireAdminDb().collection("interviews").doc(id).get();
  return snap.exists ? (snap.data() as Interview) : null;
}

export async function listInterviews(filter?: {
  candidateId?: string;
  reqId?: string;
}) {
  const db = requireAdminDb();
  let snap;
  if (filter?.candidateId) {
    snap = await db
      .collection("interviews")
      .where("candidateId", "==", filter.candidateId)
      .get();
  } else if (filter?.reqId) {
    snap = await db
      .collection("interviews")
      .where("reqId", "==", filter.reqId)
      .get();
  } else {
    snap = await db.collection("interviews").get();
  }
  let list = snap.docs.map((d) => d.data() as Interview);
  if (filter?.candidateId && filter?.reqId) {
    list = list.filter((i) => i.reqId === filter.reqId);
  }
  return list;
}

export async function updateInterview(id: string, patch: Partial<Interview>) {
  await requireAdminDb()
    .collection("interviews")
    .doc(id)
    .set(patch, { merge: true });
}

export async function createFeedback(
  input: Omit<InterviewFeedback, "id" | "createdAt">
): Promise<InterviewFeedback> {
  const fb: InterviewFeedback = {
    ...input,
    id: newId("FB"),
    createdAt: now(),
  };
  await requireAdminDb().collection("interview_feedback").doc(fb.id).set(fb);
  return fb;
}

export async function listFeedback(candidateId: string) {
  const snap = await requireAdminDb()
    .collection("interview_feedback")
    .where("candidateId", "==", candidateId)
    .get();
  return snap.docs.map((d) => d.data() as InterviewFeedback);
}

export async function listAllFeedback(): Promise<InterviewFeedback[]> {
  const snap = await requireAdminDb().collection("interview_feedback").get();
  return snap.docs.map((d) => d.data() as InterviewFeedback);
}

export async function getPlan(reqId: string): Promise<InterviewPlan | null> {
  const snap = await requireAdminDb()
    .collection("interview_plans")
    .doc(reqId)
    .get();
  return snap.exists ? (snap.data() as InterviewPlan) : null;
}

export async function savePlan(plan: InterviewPlan) {
  await requireAdminDb().collection("interview_plans").doc(plan.reqId).set(plan);
  return plan;
}

export async function getCalibration(
  reqId: string
): Promise<Calibration | null> {
  const snap = await requireAdminDb().collection("calibration").doc(reqId).get();
  return snap.exists ? (snap.data() as Calibration) : null;
}

export async function saveCalibration(cal: Calibration) {
  await requireAdminDb().collection("calibration").doc(cal.reqId).set(cal);
  return cal;
}

export async function addAudit(entry: Omit<AuditLog, "id" | "at">) {
  const row: AuditLog = { ...entry, id: newId("AUD"), at: now() };
  await requireAdminDb().collection("audit_log").doc(row.id).set(row);
  return row;
}

