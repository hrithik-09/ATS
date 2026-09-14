"use client";

import { Chip, prettyStatus, statusColor } from "./ui";
import type { Requisition, Role } from "@/lib/types";

export function ReqBoard({
  reqs,
  onOpen,
  role,
}: {
  reqs: (Requisition & {
    candidateCount?: number;
  })[];
  onOpen: (id: string) => void;
  role: Role;
}) {
  return (
    <div className="ats-req-board">
      <div className="ats-req-board-head">
        <h2>Requisitions</h2>
        <span className="ats-req-count">
          {reqs.length} total
        </span>
      </div>
      {reqs.length === 0 ? (
        <p className="ats-muted">
          No requisitions yet.
          {role === "HiringManager" && " Raise one with + New requisition."}
        </p>
      ) : (
        <div className="ats-table-wrap">
          <table className="ats-table">
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
                <th className="num">Candidates</th>
                <th>Raised</th>
              </tr>
            </thead>
            <tbody>
              {reqs.map((r) => (
                <tr key={r.id} onClick={() => onOpen(r.id)}>
                  <td className="mono">{r.id}</td>
                  <td className="title">{r.title}</td>
                  <td>
                    <Chip color={statusColor(r.status)}>
                      {prettyStatus(r.status)}
                    </Chip>
                  </td>
                  <td>{r.department}</td>
                  <td className="loc">{r.location || "—"}</td>
                  <td>{r.raisedByName}</td>
                  <td className="nowrap">{r.level || "—"}</td>
                  <td className="nowrap">
                    ₹{r.salaryMin}–{r.salaryMax} LPA
                  </td>
                  <td className="num">{r.openings}</td>
                  <td className="num candidates">{r.candidateCount ?? 0}</td>
                  <td className="nowrap">
                    {r.createdAt
                      ? new Date(r.createdAt).toLocaleDateString("en-GB")
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="ats-hint">
        Click a row to open requisition details and hiring process.
      </p>
    </div>
  );
}

