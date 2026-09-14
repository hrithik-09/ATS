"use client";

import { useEffect, useState } from "react";
import { cancelBtn, inp, lab, saveBtn, prettyStatus } from "./ui";
import type { Candidate, InterviewPlan, Requisition } from "@/lib/types";

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
      if (pd.plan?.rounds?.length && !initialRoundIndex) {
        setRoundIndex(pd.plan.rounds[0].order || 1);
      }
    });
  }, [reqId, apiFetch, initialRoundIndex]);

  const rounds = plan?.rounds || [];

  return (
    <div style={{ maxWidth: 560 }}>
      <h2 style={{ marginTop: 0 }}>Schedule interview</h2>
      {calendarEnabled ? (
        <p style={{ fontSize: 13, color: "#2f5d3a", marginTop: 0 }}>
          Google Calendar is on — panelists (and the candidate, if they have an
          email) get a real invite with Meet.
        </p>
      ) : (
        <p style={{ fontSize: 13, color: "#888", marginTop: 0 }}>
          Calendar invites are off. Set{" "}
          <code>GOOGLE_CALENDAR_ENABLED=1</code> after Workspace setup to email
          invites.
        </p>
      )}
      <p style={{ fontSize: 13, color: "#666" }}>
        Only HM-approved candidates appear here. Configure interview rounds on
        the requisition first.
      </p>
      <label style={lab}>Requisition (approved only)</label>
      <select
        style={inp}
        value={reqId}
        onChange={(e) => {
          setReqId(e.target.value);
          setCandidateId("");
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
        <div
          style={{
            background: "#fff7ec",
            border: "1px solid #f0d9b0",
            borderRadius: 8,
            padding: 10,
            fontSize: 13,
            color: "#8a5a00",
            marginTop: 8,
          }}
        >
          No interview rounds configured. Open this requisition and save rounds
          under <b>Interview rounds</b>.
        </div>
      )}
      {rounds.length > 0 && (
        <>
          <label style={lab}>Round</label>
          <select
            style={inp}
            value={roundIndex}
            onChange={(e) => setRoundIndex(Number(e.target.value))}
          >
            {rounds.map((r, i) => (
              <option key={i} value={r.order || i + 1}>
                {r.order || i + 1}. {r.name}
              </option>
            ))}
          </select>
        </>
      )}
      <label style={lab}>Date & time</label>
      <input
        type="datetime-local"
        style={inp}
        value={datetime}
        onChange={(e) => setDatetime(e.target.value)}
      />
      <label style={lab}>Duration (minutes)</label>
      <input
        type="number"
        min={15}
        step={15}
        style={inp}
        value={durationMinutes}
        onChange={(e) => setDurationMinutes(Number(e.target.value) || 60)}
      />
      <label style={lab}>Interviewer emails (comma-separated)</label>
      <input
        style={inp}
        placeholder="panel1@company.com, panel2@company.com"
        value={interviewers}
        onChange={(e) => setInterviewers(e.target.value)}
      />
      <button
        style={{ ...cancelBtn, marginTop: 10 }}
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
        <div style={{ fontSize: 13, marginTop: 8 }}>
          {slots.map((s) => (
            <button
              key={s.start}
              style={{ ...cancelBtn, marginRight: 6, marginBottom: 6 }}
              onClick={() => setDatetime(s.start.slice(0, 16))}
            >
              {s.start.replace("T", " ").slice(0, 16)}
            </button>
          ))}
        </div>
      )}
      <button
        style={{ ...saveBtn, marginTop: 14 }}
        onClick={async () => {
          if (!rounds.length) {
            alert("Configure interview rounds on the requisition first.");
            return;
          }
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
        }}
      >
        Schedule
      </button>
    </div>
  );
}
