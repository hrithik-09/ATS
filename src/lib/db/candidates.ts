import { requireAdminDb } from "../firebaseAdmin";
import type { Candidate, CandidateStage, StageEvent } from "../types";
import { newId, now } from "./ids";

function omitUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const k of Object.keys(out)) {
    if (out[k] === undefined) delete out[k];
  }
  return out;
}

export async function listCandidates(reqId?: string): Promise<Candidate[]> {
  const db = requireAdminDb();
  const snap = reqId
    ? await db.collection("candidates").where("reqId", "==", reqId).get()
    : await db.collection("candidates").get();
  return snap.docs
    .map((d) => d.data() as Candidate)
    .filter((c) => !c.archived);
}

export async function getCandidate(id: string): Promise<Candidate | null> {
  const snap = await requireAdminDb().collection("candidates").doc(id).get();
  return snap.exists ? (snap.data() as Candidate) : null;
}

export async function createCandidate(
  input: Omit<Candidate, "id" | "createdAt" | "updatedAt" | "archived">
): Promise<Candidate> {
  const c: Candidate = {
    ...input,
    id: newId("CAND"),
    archived: false,
    createdAt: now(),
    updatedAt: now(),
  };
  const db = requireAdminDb();
  await db
    .collection("candidates")
    .doc(c.id)
    .set(omitUndefined({ ...c } as Record<string, unknown>));
  const seId = newId("SE");
  await db.collection("stage_events").doc(seId).set({
    id: seId,
    candidateId: c.id,
    reqId: c.reqId,
    fromStage: "",
    toStage: c.stage,
    byEmail: "system",
    at: now(),
  });
  return c;
}

export async function updateCandidate(
  id: string,
  patch: Partial<Candidate>,
  stageChange?: { byEmail: string; from: string; to: CandidateStage }
): Promise<Candidate | null> {
  const db = requireAdminDb();
  const ref = db.collection("candidates").doc(id);
  await ref.set(
    omitUndefined({ ...patch, updatedAt: now() } as Record<string, unknown>),
    { merge: true }
  );
  if (stageChange) {
    const se: StageEvent = {
      id: newId("SE"),
      candidateId: id,
      reqId: (await ref.get()).data()!.reqId,
      fromStage: stageChange.from,
      toStage: stageChange.to,
      byEmail: stageChange.byEmail,
      at: now(),
    };
    await db.collection("stage_events").doc(se.id).set(se);
  }
  return (await ref.get()).data() as Candidate;
}

export async function listStageEvents(candidateId?: string) {
  const db = requireAdminDb();
  const snap = candidateId
    ? await db
        .collection("stage_events")
        .where("candidateId", "==", candidateId)
        .get()
    : await db.collection("stage_events").get();
  return snap.docs.map((d) => d.data() as StageEvent);
}
