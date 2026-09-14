"use client";

import { useEffect, useState } from "react";
import {
  Chip,
  DetailItem,
  prettyStatus,
  statusColor,
  tdCell,
  saveBtn,
  inp,
  lab,
  stepBtn,
} from "./ui";
import type {
  Candidate,
  Interview,
  InterviewPlan,
  Requisition,
  Role,
} from "@/lib/types";

export function PipelinePanel({
  req,
  candidates,
  interviews,
  role,
  bias,
  profileEmail,
  onClose,
  apiFetch,
  onRefresh,
  onCand,
  onAddCandidate,
}: {
  req: Requisition;
  candidates: Candidate[];
  interviews: Interview[];
  role: Role;
  bias: boolean;
  profileEmail?: string;
  onClose: () => void;
  apiFetch: (p: string, i?: RequestInit) => Promise<Response>;
  onRefresh: () => void;
  onCand: (id: string) => void;
  onAddCandidate?: () => void;
}) {
  const canAdd = role === "Admin" && req.status === "Approved";
  const isHmOwner =
    role === "HiringManager" &&
    !!profileEmail &&
    req.raisedByEmail === profileEmail.toLowerCase();
  const canHmDecide = role === "Admin" || isHmOwner;

  const processSteps = [
    {
      key: "raised",
      label: "Raised",
      done: true,
      detail: req.createdAt
        ? new Date(req.createdAt).toLocaleString()
        : undefined,
    },
    {
      key: "approval",
      label: "Dept head approval",
      done:
        req.status === "Approved" ||
        req.status === "Rejected" ||
        req.status === "Closed",
      active: req.status === "PendingApproval",
      detail:
        req.status === "PendingApproval"
          ? "Waiting…"
          : req.approvedAt
            ? `${req.status === "Rejected" ? "Rejected" : "Approved"} ${new Date(req.approvedAt).toLocaleDateString()} by ${req.approvedBy || "—"}`
            : req.status,
    },
    {
      key: "recruit",
      label: "Recruiting",
      done: req.status === "Approved" || req.status === "Closed",
      active: req.status === "Approved" && candidates.length === 0,
      detail:
        req.status === "Approved"
          ? `${candidates.length} candidate(s)`
          : req.status === "PendingApproval"
            ? "Locked until approved"
            : undefined,
    },
    {
      key: "hm",
      label: "HM candidate approval",
      done: candidates.some((c) => c.stage === "HMApproved" || c.stage === "Interview Scheduled" || c.stage === "Interview"),
      active: candidates.some((c) => c.stage === "PendingHMApproval"),
      detail: `${candidates.filter((c) => c.stage === "PendingHMApproval").length} pending`,
    },
    {
      key: "interview",
      label: "Interviews",
      done: interviews.some((i) => i.status === "Completed"),
      active:
        req.status === "Approved" &&
        interviews.some((i) => i.status === "Scheduled"),
      detail: `${interviews.length} scheduled`,
    },
    {
      key: "close",
      label: "Closed / hired",
      done: req.status === "Closed",
      active: false,
      detail:
        candidates.filter((c) => c.stage === "Onboarded" || c.stage === "Offered")
          .length > 0
          ? `${candidates.filter((c) => c.stage === "Onboarded" || c.stage === "Offered").length} offered/onboarded`
          : undefined,
    },
  ];

  const stageOrder = [
    "PendingHMApproval",
    "HMApproved",
    "New",
    "Screened",
    "Shortlist",
    "Interview",
    "Interview Scheduled",
    "Debrief",
    "Selected",
    "Offered",
    "Onboarded",
    "On Hold",
    "Rejected",
  ];
  const byStage: Record<string, number> = {};
  for (const c of candidates) {
    byStage[c.stage] = (byStage[c.stage] || 0) + 1;
  }

  async function hmDecide(
    candidateId: string,
    action: "hmApprove" | "hmReject"
  ) {
    let reason: string | undefined;
    if (action === "hmReject") {
      reason =
        window.prompt("Rejection reason (optional):") ||
        "Rejected by hiring manager";
    }
    const r = await apiFetch(`/api/candidates/${candidateId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason }),
    });
    const d = await r.json();
    if (!r.ok) alert(d.error);
    else onRefresh();
  }

  return (
    <div>
      <div style={{ marginBottom: 8 }}>
        <a onClick={onClose} style={{ cursor: "pointer", color: "#3a6ea5" }}>
          ← Back to requisitions
        </a>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 12, color: "#888" }}>{req.id}</div>
          <h3 style={{ margin: "2px 0 8px", fontSize: 22 }}>{req.title}</h3>
          <Chip color={statusColor(req.status)}>{prettyStatus(req.status)}</Chip>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 10,
          margin: "16px 0",
          padding: 14,
          background: "#f7f5ef",
          borderRadius: 12,
          border: "1px solid #ebe6da",
        }}
      >
        <DetailItem label="Department" value={req.department} />
        <DetailItem label="Location" value={req.location || "—"} />
        <DetailItem label="Employment" value={req.employment || "—"} />
        <DetailItem label="Experience" value={req.level || "—"} />
        <DetailItem
          label="Salary"
          value={`₹${req.salaryMin}–${req.salaryMax} LPA`}
        />
        <DetailItem label="Joining" value={req.priority || "—"} />
        <DetailItem label="Openings" value={String(req.openings)} />
        <DetailItem label="Hiring manager" value={`${req.raisedByName}`} />
        {req.jdFileName && req.jdPath && (
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.4,
                color: "#8a8a82",
              }}
            >
              JD PDF
            </div>
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                const res = await apiFetch(`/api/requisitions/${req.id}/jd`);
                if (!res.ok) {
                  const d = await res.json().catch(() => ({}));
                  alert(d.error || "Could not download JD.");
                  return;
                }
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = req.jdFileName || "job-description.pdf";
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              }}
              style={{
                marginTop: 2,
                padding: 0,
                border: 0,
                background: "transparent",
                color: "#3a6ea5",
                fontWeight: 650,
                fontSize: 13.5,
                cursor: "pointer",
                textAlign: "left",
                textDecoration: "underline",
              }}
            >
              Download {req.jdFileName}
            </button>
          </div>
        )}
      </div>

      {req.notes && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 650, color: "#555" }}>Notes</div>
          <div
            style={{
              fontSize: 13,
              marginTop: 4,
              whiteSpace: "pre-wrap",
              color: "#333",
            }}
          >
            {req.notes}
          </div>
        </div>
      )}

      <h4 style={{ marginBottom: 8 }}>Process</h4>
      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 18,
          overflowX: "auto",
          paddingBottom: 4,
        }}
      >
        {processSteps.map((step, i) => (
          <div
            key={step.key}
            style={{
              flex: "1 1 100px",
              minWidth: 100,
              padding: "10px 12px",
              borderRadius: 10,
              marginRight: i < processSteps.length - 1 ? 6 : 0,
              background: step.done
                ? "#eef7f0"
                : step.active
                  ? "#fff7ec"
                  : "#f4f2ec",
              border: `1px solid ${
                step.done ? "#c5e0cc" : step.active ? "#f0d9b0" : "#e7e2d5"
              }`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: 0.3,
                color: step.done
                  ? "#2f6f4f"
                  : step.active
                    ? "#8a5a00"
                    : "#888",
              }}
            >
              {i + 1}. {step.label}
            </div>
            {step.detail && (
              <div style={{ fontSize: 12, marginTop: 4, color: "#555" }}>
                {step.detail}
              </div>
            )}
          </div>
        ))}
      </div>

      {req.status === "PendingApproval" && (
        <div
          style={{
            background: "#fff7ec",
            border: "1px solid #f0d9b0",
            borderRadius: 10,
            padding: 12,
            marginBottom: 12,
            color: "#8a5a00",
            fontSize: 13,
          }}
        >
          Waiting for department-head approval. Recruiting is locked until
          approved.
        </div>
      )}

      {role === "Admin" && req.status === "Approved" && (
        <InterviewRoundsEditor
          reqId={req.id}
          apiFetch={apiFetch}
        />
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 8,
          flexWrap: "wrap",
        }}
      >
        <h4 style={{ margin: 0 }}>
          Pipeline ({candidates.length} candidate
          {candidates.length === 1 ? "" : "s"})
        </h4>
        {canAdd && onAddCandidate && (
          <button type="button" onClick={onAddCandidate} style={saveBtn}>
            + Add candidate
          </button>
        )}
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 12,
        }}
      >
        {stageOrder
          .filter((s) => byStage[s])
          .map((s) => (
            <span
              key={s}
              style={{
                fontSize: 12,
                background: "#eef3f8",
                border: "1px solid #d6e2ee",
                borderRadius: 999,
                padding: "4px 10px",
                color: "#3a6ea5",
                fontWeight: 600,
              }}
            >
              {prettyStatus(s)}: {byStage[s]}
            </span>
          ))}
        {candidates.length === 0 && (
          <span style={{ fontSize: 13, color: "#aaa" }}>
            No candidates yet.
          </span>
        )}
      </div>

      {candidates.length > 0 && (
        <div
          style={{
            border: "1px solid #ebe6da",
            borderRadius: 12,
            overflowX: "auto",
            marginBottom: 12,
          }}
        >
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
          >
            <thead>
              <tr style={{ background: "#f7f5ef", textAlign: "left" }}>
                {[
                  "Name",
                  "Email",
                  "Phone",
                  "Present CTC",
                  "Expected",
                  "Notice",
                  "Stage",
                  "CV",
                  ...(canHmDecide ? ["HM decision"] : []),
                ].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: "9px 11px",
                      fontSize: 11,
                      textTransform: "uppercase",
                      color: "#6b6b63",
                      borderBottom: "1px solid #ebe6da",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.id}>
                  <td
                    style={{ ...tdCell, cursor: "pointer" }}
                    onClick={() => onCand(c.id)}
                  >
                    <b>{bias ? `Candidate ${c.id}` : c.name}</b>
                  </td>
                  <td style={tdCell}>{c.email || "—"}</td>
                  <td style={tdCell}>{c.phone || "—"}</td>
                  <td style={tdCell}>{c.currentCtc || "—"}</td>
                  <td style={tdCell}>{c.expectedCtc || "—"}</td>
                  <td style={tdCell}>{c.notice || "—"}</td>
                  <td style={tdCell}>
                    <Chip color={statusColor(c.stage)}>
                      {prettyStatus(c.stage)}
                    </Chip>
                  </td>
                  <td style={tdCell}>{c.cvFileName || "—"}</td>
                  {canHmDecide && (
                    <td style={tdCell} onClick={(e) => e.stopPropagation()}>
                      {c.stage === "PendingHMApproval" ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            type="button"
                            className="ats-btn-approve"
                            onClick={() => hmDecide(c.id, "hmApprove")}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="ats-btn-reject"
                            onClick={() => hmDecide(c.id, "hmReject")}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: "#888" }}>—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {interviews.length > 0 && (
        <>
          <h4 style={{ marginBottom: 8 }}>Interviews</h4>
          <div style={{ marginBottom: 12 }}>
            {interviews.map((iv) => (
              <div
                key={iv.id}
                style={{
                  fontSize: 13,
                  padding: "8px 0",
                  borderBottom: "1px solid #f0ece3",
                }}
              >
                {new Date(iv.datetime).toLocaleString()}
                {iv.roundName
                  ? ` · Round ${iv.roundIndex}: ${iv.roundName}`
                  : ` · ${iv.stage}`}{" "}
                · <Chip color={statusColor(iv.status)}>{iv.status}</Chip>
                {iv.interviewerEmails?.length
                  ? ` · ${iv.interviewerEmails.join(", ")}`
                  : ""}
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
        </>
      )}
    </div>
  );
}

function InterviewRoundsEditor({
  reqId,
  apiFetch,
}: {
  reqId: string;
  apiFetch: (p: string, i?: RequestInit) => Promise<Response>;
}) {
  const [rounds, setRounds] = useState<{ name: string; order: number }[]>([
    { name: "Round 1 — Technical", order: 1 },
  ]);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    apiFetch(`/api/requisitions/${reqId}/plan`)
      .then((r) => r.json())
      .then((d) => {
        const plan = d.plan as InterviewPlan | null;
        if (plan?.rounds?.length) {
          setRounds(
            plan.rounds.map((r, i) => ({
              name: r.name,
              order: r.order || i + 1,
            }))
          );
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [reqId, apiFetch]);

  async function save() {
    setBusy(true);
    try {
      const r = await apiFetch(`/api/requisitions/${reqId}/plan`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rounds: rounds.map((x, i) => ({
            name: x.name,
            order: i + 1,
            type: "interview",
          })),
        }),
      });
      const d = await r.json();
      if (!r.ok) alert(d.error);
      else alert("Interview rounds saved.");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return null;

  return (
    <div
      style={{
        border: "1px solid #ebe6da",
        borderRadius: 12,
        padding: 14,
        marginBottom: 16,
        background: "#faf9f6",
      }}
    >
      <h4 style={{ marginTop: 0, marginBottom: 6 }}>Interview rounds</h4>
      <p style={{ fontSize: 13, color: "#666", marginTop: 0 }}>
        Configure how many rounds after HM approves a candidate. Scheduling
        starts at Round 1.
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Count</span>
        <button
          type="button"
          style={stepBtn}
          onClick={() =>
            setRounds((rs) =>
              rs.length <= 1
                ? rs
                : rs.slice(0, -1).map((x, i) => ({ ...x, order: i + 1 }))
            )
          }
        >
          −
        </button>
        <b>{rounds.length}</b>
        <button
          type="button"
          style={stepBtn}
          onClick={() =>
            setRounds((rs) => [
              ...rs,
              {
                name: `Round ${rs.length + 1}`,
                order: rs.length + 1,
              },
            ])
          }
        >
          +
        </button>
      </div>
      {rounds.map((round, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          <label style={lab}>Round {i + 1} name</label>
          <input
            style={inp}
            value={round.name}
            onChange={(e) =>
              setRounds((rs) =>
                rs.map((x, j) =>
                  j === i ? { ...x, name: e.target.value } : x
                )
              )
            }
          />
        </div>
      ))}
      <button
        type="button"
        style={{ ...saveBtn, marginTop: 8 }}
        disabled={busy}
        onClick={save}
      >
        {busy ? "Saving…" : "Save rounds"}
      </button>
    </div>
  );
}
