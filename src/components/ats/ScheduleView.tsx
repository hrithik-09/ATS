"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { cancelBtn, inp, lab, saveBtn, prettyStatus } from "./ui";
import type {
  Candidate,
  Interview,
  InterviewPlan,
  Requisition,
} from "@/lib/types";

const SCHEDULABLE = new Set([
  "HMApproved",
  "Screened",
  "Shortlist",
  "Interview",
  "Interview Scheduled",
  "Selected",
  "Debrief",
  "On Hold",
]);

export function ScheduleView({
  reqs,
  apiFetch,
  onDone,
  initialReqId,
  initialCandidateId,
  initialRoundIndex,
}: {
  reqs: Requisition[];
  apiFetch: (p: string, i?: RequestInit) => Promise<Response>;
  onDone: () => void;
  initialReqId?: string;
  initialCandidateId?: string;
  initialRoundIndex?: number;
}) {
  const [reqId, setReqId] = useState(initialReqId || "");
  const [cands, setCands] = useState<Candidate[]>([]);
  const [candidateId, setCandidateId] = useState(initialCandidateId || "");
  const [datetime, setDatetime] = useState("");
  const [interviewers, setInterviewers] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [slots, setSlots] = useState<{ start: string }[]>([]);
  const [calendarEnabled, setCalendarEnabled] = useState(false);
  const [plan, setPlan] = useState<InterviewPlan | null>(null);
  const [roundIndex, setRoundIndex] = useState(initialRoundIndex || 1);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch("/api/schedule")
      .then((r) => r.json())
      .then((d) => setCalendarEnabled(!!d.calendarEnabled))
      .catch(() => setCalendarEnabled(false));
  }, [apiFetch]);

  useEffect(() => {
    if (!reqId) {
      setCands([]);
      setPlan(null);
      return;
    }
    Promise.all([
      apiFetch(`/api/candidates?reqId=${reqId}`).then((r) => r.json()),
      apiFetch(`/api/requisitions/${reqId}/plan`).then((r) => r.json()),
    ]).then(([cd, pd]) => {
      setCands(
        (cd.candidates || []).filter((c: Candidate) =>
          SCHEDULABLE.has(c.stage)
        )
      );
      setPlan(pd.plan || null);
    });
  }, [reqId, apiFetch]);

  useEffect(() => {
    if (!candidateId) {
      setInterviews([]);
      return;
    }
    apiFetch(`/api/schedule?candidateId=${encodeURIComponent(candidateId)}`)
      .then((r) => r.json())
      .then((d) => setInterviews(d.interviews || []))
      .catch(() => setInterviews([]));
  }, [candidateId, apiFetch]);

  const rounds = plan?.rounds || [];

  const bookedRounds = useMemo(() => {
    const set = new Set<number>();
    for (const iv of interviews) {
      if (iv.status === "Cancelled") continue;
      set.add(iv.roundIndex || 1);
    }
    return set;
  }, [interviews]);

  const maxBooked = useMemo(
    () => (bookedRounds.size ? Math.max(...bookedRounds) : 0),
    [bookedRounds]
  );

  const availableRounds = useMemo(() => {
    return rounds
      .map((r, i) => ({
        order: r.order || i + 1,
        name: r.name,
      }))
      .filter((r) => !bookedRounds.has(r.order) && r.order <= maxBooked + 1);
  }, [rounds, bookedRounds, maxBooked]);

  useEffect(() => {
    if (!availableRounds.length) return;
    const preferred =
      initialRoundIndex &&
      availableRounds.some((r) => r.order === initialRoundIndex)
        ? initialRoundIndex
        : availableRounds[0].order;
    setRoundIndex(preferred);
  }, [availableRounds, initialRoundIndex, candidateId]);

  const selectedCand = cands.find((c) => c.id === candidateId);
  const canSubmit =
    !!reqId &&
    !!candidateId &&
    !!datetime &&
    availableRounds.length > 0 &&
    availableRounds.some((r) => r.order === roundIndex);

  async function schedule() {
    if (!rounds.length) {
      alert("Configure interview rounds on the requisition first.");
      return;
    }
    if (!canSubmit) {
      alert("Fill requisition, candidate, round, and date/time.");
      return;
    }
    setBusy(true);
    try {
      const r = await apiFetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reqId,
          candidateId,
          datetime: new Date(datetime).toISOString(),
          durationMinutes,
          interviewers,
          roundIndex,
        }),
      });
      const d = await r.json();
      if (!r.ok) alert(d.error);
      else {
        if (d.inviteSent) {
          alert("Interview scheduled — calendar invites sent.");
        }
        onDone();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 26, letterSpacing: "-0.02em" }}>
            Schedule interview
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "#6e6e66" }}>
            Book the next open round for an HM-approved candidate. Duplicate
            rounds stay locked.
          </p>
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: "8px 12px",
            borderRadius: 999,
            background: calendarEnabled ? "#eef7f0" : "#f3f2ed",
            color: calendarEnabled ? "#2f5d3a" : "#777",
            border: `1px solid ${calendarEnabled ? "#cfe3d4" : "#e6e2d6"}`,
          }}
        >
          {calendarEnabled ? "Calendar invites on" : "Calendar invites off"}
        </div>
      </div>

      <section style={panel}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
          }}
          className="ats-sched-grid"
        >
          <div style={col}>
            <h3 style={colTitle}>Who</h3>
            <label style={{ ...lab, marginTop: 0 }}>
              Requisition (approved only)
            </label>
            <select
              style={inp}
              value={reqId}
              onChange={(e) => {
                setReqId(e.target.value);
                setCandidateId("");
                setInterviews([]);
              }}
            >
              <option value="">—</option>
              {reqs.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.id} — {r.title}
                </option>
              ))}
            </select>

            <label style={lab}>Candidate (HM approved+)</label>
            <select
              style={inp}
              value={candidateId}
              onChange={(e) => setCandidateId(e.target.value)}
            >
              <option value="">—</option>
              {cands.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.email ? ` (${c.email})` : ""} — {prettyStatus(c.stage)}
                </option>
              ))}
            </select>

            {reqId && rounds.length === 0 && (
              <div style={warnBox}>
                No interview rounds configured. Open this requisition and save
                rounds under <b>Interview rounds</b>.
              </div>
            )}

            {rounds.length > 0 && (
              <>
                <label style={lab}>Round</label>
                {!candidateId ? (
                  <p style={{ fontSize: 13, color: "#888", margin: "6px 0 0" }}>
                    Select a candidate to see available rounds.
                  </p>
                ) : availableRounds.length === 0 ? (
                  <div style={mutedBox}>
                    {selectedCand
                      ? `All configured rounds are already scheduled for ${selectedCand.name}.`
                      : "No rounds left to schedule for this candidate."}
                  </div>
                ) : (
                  <select
                    style={inp}
                    value={roundIndex}
                    onChange={(e) => setRoundIndex(Number(e.target.value))}
                  >
                    {availableRounds.map((r) => (
                      <option key={r.order} value={r.order}>
                        {r.order}. {r.name}
                      </option>
                    ))}
                  </select>
                )}
                {candidateId && bookedRounds.size > 0 && (
                  <p style={{ fontSize: 12, color: "#888", marginTop: 10 }}>
                    Already scheduled:{" "}
                    {[...bookedRounds]
                      .sort((a, b) => a - b)
                      .map((n) => `R${n}`)
                      .join(", ")}
                  </p>
                )}
              </>
            )}
          </div>

          <div style={col}>
            <h3 style={colTitle}>When</h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 0.6fr",
                gap: 12,
              }}
              className="ats-sched-when"
            >
              <div>
                <label style={{ ...lab, marginTop: 0 }}>Date & time</label>
                <input
                  type="datetime-local"
                  style={inp}
                  value={datetime}
                  onChange={(e) => setDatetime(e.target.value)}
                />
              </div>
              <div>
                <label style={{ ...lab, marginTop: 0 }}>Duration (min)</label>
                <input
                  type="number"
                  min={15}
                  step={15}
                  style={inp}
                  value={durationMinutes}
                  onChange={(e) =>
                    setDurationMinutes(Number(e.target.value) || 60)
                  }
                />
              </div>
            </div>

            <label style={lab}>Interviewer emails</label>
            <input
              style={inp}
              placeholder="panel1@company.com, panel2@company.com"
              value={interviewers}
              onChange={(e) => setInterviewers(e.target.value)}
            />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 14,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                style={cancelBtn}
                onClick={async () => {
                  const r = await apiFetch("/api/availability", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      date:
                        datetime.slice(0, 10) ||
                        new Date().toISOString().slice(0, 10),
                    }),
                  });
                  const d = await r.json();
                  setSlots(d.slots || []);
                }}
              >
                Suggest slots
              </button>
              {slots.length > 0 && (
                <span style={{ fontSize: 12, color: "#888" }}>
                  Pick a suggested time
                </span>
              )}
            </div>
            {slots.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginTop: 10,
                }}
              >
                {slots.map((s) => (
                  <button
                    key={s.start}
                    type="button"
                    style={slotChip}
                    onClick={() => setDatetime(s.start.slice(0, 16))}
                  >
                    {s.start.replace("T", " ").slice(0, 16)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: "1px solid #f0ece3",
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            type="button"
            style={{
              ...saveBtn,
              minWidth: 140,
              opacity: canSubmit && !busy ? 1 : 0.55,
              cursor: canSubmit && !busy ? "pointer" : "not-allowed",
            }}
            disabled={!canSubmit || busy}
            onClick={schedule}
          >
            {busy ? "Scheduling…" : "Schedule"}
          </button>
        </div>
      </section>

      <style>{`
        @media (max-width: 800px) {
          .ats-sched-grid, .ats-sched-when {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

const panel: CSSProperties = {
  background: "#fff",
  border: "1px solid #ebe6da",
  borderRadius: 14,
  padding: 20,
  boxShadow: "0 1px 0 rgba(40,35,20,.03)",
  width: "100%",
  boxSizing: "border-box",
};

const col: CSSProperties = {
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
};

const colTitle: CSSProperties = {
  margin: "0 0 12px",
  fontSize: 13,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: 0.4,
  color: "#8a8a82",
};

const warnBox: CSSProperties = {
  background: "#fff7ec",
  border: "1px solid #f0d9b0",
  borderRadius: 8,
  padding: 10,
  fontSize: 13,
  color: "#8a5a00",
  marginTop: 12,
};

const mutedBox: CSSProperties = {
  background: "#f3f2ed",
  border: "1px solid #e6e2d6",
  borderRadius: 8,
  padding: 10,
  fontSize: 13,
  color: "#666",
  marginTop: 6,
};

const slotChip: CSSProperties = {
  background: "#faf9f6",
  color: "#333",
  border: "1px solid #e2ddd0",
  borderRadius: 8,
  padding: "8px 12px",
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
};
