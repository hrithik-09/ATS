"use client";

import { Fragment, useState } from "react";
import { Chip, prettyStatus, statusColor } from "./ui";
import type { Requisition } from "@/lib/types";

export function ApprovalsView({
  list,
  apiFetch,
  onOpen,
  onDone,
}: {
  list: Requisition[];
  apiFetch: (p: string, i?: RequestInit) => Promise<Response>;
  onOpen: (id: string) => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function downloadJd(r: Requisition) {
    const res = await apiFetch(`/api/requisitions/${r.id}/jd`);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Could not download JD.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = r.jdFileName || "job-description.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function act(id: string, action: "approve" | "reject") {
    if (action === "reject" && !(reason[id] || "").trim()) {
      alert("Enter a rejection reason.");
      setExpanded(id);
      return;
    }
    setBusyId(id);
    try {
      const r = await apiFetch(`/api/requisitions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: reason[id] }),
      });
      const d = await r.json();
      if (!r.ok) alert(d.error);
      else onDone();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="ats-req-board">
      <div className="ats-req-board-head">
        <h2>Approvals</h2>
        <span className="ats-req-count">{list.length} pending</span>
      </div>
      <p className="ats-hint" style={{ marginTop: 0, marginBottom: 12 }}>
        Requisitions waiting for your department(s). Open a row for full
        details, or approve / reject here.
      </p>

      {list.length === 0 ? (
        <p className="ats-muted">Nothing pending.</p>
      ) : (
        <div className="ats-table-wrap">
          <table className="ats-table ats-approvals-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Status</th>
                <th>Department</th>
                <th>Location</th>
                <th>HM</th>
                <th>Exp</th>
                <th>Salary</th>
                <th className="num">Openings</th>
                <th>JD</th>
                <th className="actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => {
                const open = expanded === r.id;
                return (
                  <Fragment key={r.id}>
                    <tr
                      onClick={() =>
                        setExpanded((cur) => (cur === r.id ? null : r.id))
                      }
                    >
                      <td className="mono" title={r.id}>
                        {r.id.replace(/^REQ_/, "")}
                      </td>
                      <td className="title">{r.title}</td>
                      <td>
                        <Chip color={statusColor(r.status)}>
                          {prettyStatus(r.status)}
                        </Chip>
                      </td>
                      <td>{r.department}</td>
                      <td className="loc" title={r.location || undefined}>
                        {r.location || "—"}
                      </td>
                      <td>
                        <div>{r.raisedByName}</div>
                        <div className="ats-sub">{r.raisedByEmail}</div>
                      </td>
                      <td className="nowrap">{r.level || "—"}</td>
                      <td className="nowrap">
                        ₹{r.salaryMin}–{r.salaryMax} LPA
                      </td>
                      <td className="num">{r.openings}</td>
                      <td
                        className="nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {r.jdPath && r.jdFileName ? (
                          <button
                            type="button"
                            className="ats-link-btn"
                            onClick={() => downloadJd(r)}
                          >
                            Download
                          </button>
                        ) : r.jdFileName ? (
                          <span className="ats-muted" title={r.jdFileName}>
                            File
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td
                        className="actions"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="ats-action-row">
                          <button
                            type="button"
                            className="ats-btn-approve"
                            disabled={busyId === r.id}
                            onClick={() => act(r.id, "approve")}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="ats-btn-reject"
                            disabled={busyId === r.id}
                            onClick={() => {
                              setExpanded(r.id);
                              if ((reason[r.id] || "").trim()) {
                                act(r.id, "reject");
                              }
                            }}
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            className="ats-link-btn"
                            onClick={() => onOpen(r.id)}
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                    {open && (
                      <tr className="ats-expand-row">
                        <td colSpan={11}>
                          <div className="ats-expand-panel">
                            <div className="ats-expand-meta">
                              <span>
                                Join: <b>{r.priority || "—"}</b>
                              </span>
                              <span>
                                Raised:{" "}
                                <b>
                                  {r.createdAt
                                    ? new Date(r.createdAt).toLocaleString()
                                    : "—"}
                                </b>
                              </span>
                            </div>
                            {r.notes && (
                              <div className="ats-expand-notes">
                                <div className="ats-expand-label">Notes</div>
                                {r.notes}
                              </div>
                            )}
                            <label
                              className="ats-expand-label"
                              htmlFor={`rej-${r.id}`}
                            >
                              Rejection reason (required to reject)
                            </label>
                            <input
                              id={`rej-${r.id}`}
                              className="ats-expand-input"
                              placeholder="e.g. Budget freeze / role not needed"
                              value={reason[r.id] || ""}
                              onChange={(e) =>
                                setReason((s) => ({
                                  ...s,
                                  [r.id]: e.target.value,
                                }))
                              }
                            />
                            <div
                              className="ats-action-row"
                              style={{ marginTop: 10 }}
                            >
                              <button
                                type="button"
                                className="ats-btn-approve"
                                disabled={busyId === r.id}
                                onClick={() => act(r.id, "approve")}
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                className="ats-btn-reject"
                                disabled={busyId === r.id}
                                onClick={() => act(r.id, "reject")}
                              >
                                Confirm reject
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

