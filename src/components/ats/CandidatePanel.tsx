"use client";

import { useState } from "react";
import {
  Chip,
  statusColor,
  prettyStatus,
  inp,
  lab,
  saveBtn,
  cancelBtn,
  DetailItem,
} from "./ui";
import type { Candidate, Interview, Role } from "@/lib/types";

export function CandidatePanel({
  data,
  role,
  bias,
  isHmOwner,
  onClose,
  apiFetch,
  onRefresh,
  onScheduleRound1,
}: {
  data: {
    candidate: Candidate;
    feedback: {
      rating: number;
      recommendation: string;
      interviewer: string;
      feedback: string;
    }[];
    interviews: Interview[];
  };
  role: Role;
  bias: boolean;
  isHmOwner?: boolean;
  onClose: () => void;
  apiFetch: (p: string, i?: RequestInit) => Promise<Response>;
  onRefresh: () => void;
  onScheduleRound1?: () => void;
}) {
  const c = data.candidate;
  const [stage, setStage] = useState(c.stage);
  const [fb, setFb] = useState("");
  const [rating, setRating] = useState(3);
  const [rec, setRec] = useState("Yes");
  const [busy, setBusy] = useState(false);

  const canHmDecide =
    (role === "Admin" || isHmOwner) && c.stage === "PendingHMApproval";
  const showStageEditor =
    role === "Admin" && c.stage !== "PendingHMApproval";

  async function hmDecide(action: "hmApprove" | "hmReject") {
    let reason: string | undefined;
    if (action === "hmReject") {
      reason =
        window.prompt("Rejection reason (optional):") ||
        "Rejected by hiring manager";
    }
    setBusy(true);
    try {
      const r = await apiFetch(`/api/candidates/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      const d = await r.json();
      if (!r.ok) alert(d.error);
      else onRefresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <a onClick={onClose} style={{ cursor: "pointer", color: "#3a6ea5" }}>
        ← Close
      </a>
      <h3 style={{ marginTop: 8 }}>
        {bias ? `Candidate ${c.id}` : c.name}
      </h3>
      <Chip color={statusColor(c.stage)}>{prettyStatus(c.stage)}</Chip>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 10,
          margin: "12px 0",
          padding: 12,
          background: "#f7f5ef",
          borderRadius: 12,
          border: "1px solid #ebe6da",
        }}
      >
        <DetailItem label="Email" value={c.email || "—"} />
        <DetailItem label="Phone" value={c.phone || "—"} />
        <DetailItem label="Location" value={c.location || "—"} />
        <DetailItem label="Present CTC" value={c.currentCtc || "—"} />
        <DetailItem label="Expected CTC" value={c.expectedCtc || "—"} />
        <DetailItem label="Notice" value={c.notice || "—"} />
        <DetailItem label="Req" value={c.reqId} />
        {c.cvFileName && <DetailItem label="CV" value={c.cvFileName} />}
        {c.hmDecisionBy && (
          <DetailItem label="HM decision by" value={c.hmDecisionBy} />
        )}
      </div>
      {c.hmRejectReason && (
        <div style={{ fontSize: 13, color: "#9a3b3b", marginBottom: 10 }}>
          Rejected: {c.hmRejectReason}
        </div>
      )}
      {c.remarks && (
        <div style={{ fontSize: 13, marginBottom: 12, whiteSpace: "pre-wrap" }}>
          <b>Remarks:</b> {c.remarks}
        </div>
      )}

      {canHmDecide && (
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 14,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className="ats-btn-approve"
            disabled={busy}
            onClick={() => hmDecide("hmApprove")}
          >
            Approve candidate
          </button>
          <button
            type="button"
            className="ats-btn-reject"
            disabled={busy}
            onClick={() => hmDecide("hmReject")}
          >
            Reject candidate
          </button>
        </div>
      )}

      {role === "Admin" && c.stage === "HMApproved" && onScheduleRound1 && (
        <button
          type="button"
          style={{ ...saveBtn, marginBottom: 14 }}
          onClick={onScheduleRound1}
        >
          Schedule Round 1
        </button>
      )}

      {c.stage === "PendingHMApproval" && role === "Admin" && (
        <div
          style={{
            background: "#fff7ec",
            border: "1px solid #f0d9b0",
            borderRadius: 8,
            padding: 10,
            fontSize: 13,
            color: "#8a5a00",
            marginBottom: 12,
          }}
        >
          Waiting for hiring-manager approval before interviews can be
          scheduled.
        </div>
      )}

      {showStageEditor && (
        <div style={{ marginTop: 14 }}>
          <label style={lab}>Update stage</label>
          <select
            style={inp}
            value={stage}
            onChange={(e) => setStage(e.target.value as Candidate["stage"])}
          >
            {[
              "HMApproved",
              "Screened",
              "Shortlist",
              "Interview",
              "Interview Scheduled",
              "Debrief",
              "Selected",
              "Offered",
              "Onboarded",
              "Rejected",
              "On Hold",
            ].map((s) => (
              <option key={s} value={s}>
                {prettyStatus(s)}
              </option>
            ))}
          </select>
          <button
            style={{ ...saveBtn, marginTop: 8 }}
            onClick={async () => {
              const r = await apiFetch(`/api/candidates/${c.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "stage", stage }),
              });
              const d = await r.json();
              if (!r.ok) alert(d.error);
              else onRefresh();
            }}
          >
            Save stage
          </button>
        </div>
      )}

      <h4>Feedback</h4>
      <p style={{ fontSize: 13, color: "#666", marginTop: 0 }}>
        Interviewer notes after a round — rating and hire recommendation.
      </p>
      {(data.feedback || []).map((f, i) => (
        <div
          key={i}
          style={{
            border: "1px solid #ebe6da",
            borderRadius: 10,
            padding: 10,
            marginBottom: 8,
            fontSize: 13,
          }}
        >
          <b>{f.interviewer}</b> — {f.recommendation} ·{" "}
          <span aria-label={`${f.rating} of 5`}>
            {"★".repeat(Math.max(0, Math.min(5, f.rating || 0)))}
            {"☆".repeat(Math.max(0, 5 - Math.min(5, f.rating || 0)))}
          </span>
          <div style={{ whiteSpace: "pre-wrap", marginTop: 4 }}>{f.feedback}</div>
        </div>
      ))}
      <label style={lab}>Interview notes</label>
      <textarea
        style={{ ...inp, minHeight: 70 }}
        placeholder="What went well, gaps, follow-ups…"
        value={fb}
        onChange={(e) => setFb(e.target.value)}
      />
      <label style={lab}>Rating</label>
      <div
        style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}
        role="radiogroup"
        aria-label="Rating out of 5"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            aria-checked={rating === n}
            role="radio"
            style={{
              border: 0,
              background: "transparent",
              cursor: "pointer",
              fontSize: 28,
              lineHeight: 1,
              padding: "2px 4px",
              color: n <= rating ? "#d4a017" : "#d0cdc4",
            }}
          >
            ★
          </button>
        ))}
        <span style={{ fontSize: 13, color: "#666", marginLeft: 6 }}>
          {rating}/5
        </span>
      </div>
      <label style={lab}>Recommendation</label>
      <select style={inp} value={rec} onChange={(e) => setRec(e.target.value)}>
        {["Strong Yes", "Yes", "Lean Yes", "Lean No", "No", "Strong No"].map(
          (x) => (
            <option key={x}>{x}</option>
          )
        )}
      </select>
      <button
        style={{ ...saveBtn, marginTop: 10 }}
        onClick={async () => {
          const r = await apiFetch(`/api/candidates/${c.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "feedback",
              feedback: fb,
              rating,
              recommendation: rec,
            }),
          });
          const d = await r.json();
          if (!r.ok) alert(d.error);
          else {
            setFb("");
            onRefresh();
          }
        }}
      >
        Save feedback
      </button>
      {(role === "Admin" || isHmOwner) &&
        c.stage !== "PendingHMApproval" && (
          <div style={{ marginTop: 16 }}>
            <h4>Debrief decision</h4>
            <div style={{ display: "flex", gap: 8 }}>
              {["Advance", "Hold", "Reject"].map((dec) => (
                <button
                  key={dec}
                  style={
                    dec === "Reject"
                      ? { ...cancelBtn, background: "#f3d4d4" }
                      : saveBtn
                  }
                  onClick={async () => {
                    const r = await apiFetch(`/api/candidates/${c.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "debrief",
                        decision: dec,
                      }),
                    });
                    const d = await r.json();
                    if (!r.ok) alert(d.error);
                    else onRefresh();
                  }}
                >
                  {dec}
                </button>
              ))}
            </div>
          </div>
        )}
      <h4>Interviews</h4>
      {(data.interviews || []).length === 0 && (
        <div style={{ color: "#aaa", fontSize: 13 }}>None scheduled</div>
      )}
      {(data.interviews || []).map((iv) => (
        <div key={iv.id} style={{ fontSize: 13, marginBottom: 6 }}>
          {iv.datetime}
          {iv.roundName
            ? ` · Round ${iv.roundIndex}: ${iv.roundName}`
            : ` · ${iv.stage}`}{" "}
          · {iv.status}
          {iv.meetLink && (
            <>
              {" "}
              ·{" "}
              <a href={iv.meetLink} target="_blank" rel="noreferrer">
                Meet
              </a>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
