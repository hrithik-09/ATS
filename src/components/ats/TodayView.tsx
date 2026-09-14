"use client";

import type { ReactNode } from "react";
import { Chip, statusColor } from "./ui";

export function TodayView({
  data,
  bias,
  onReq,
  onCand,
}: {
  data: Record<string, unknown> | null;
  bias: boolean;
  onReq: (id: string) => void;
  onCand: (id: string) => void;
}) {
  if (!data) return <p style={{ color: "#888" }}>Loading your day…</p>;
  const sec = (
    title: string,
    arr: unknown[],
    render: (x: Record<string, unknown>) => ReactNode
  ) => (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontWeight: 700,
          fontSize: 13,
          borderBottom: "1px solid #ece7da",
          paddingBottom: 6,
          marginBottom: 8,
        }}
      >
        <span>{title}</span>
        <Chip>{arr?.length || 0}</Chip>
      </div>
      {(arr || []).length === 0 ? (
        <div style={{ color: "#aaa", fontSize: 13 }}>Nothing here</div>
      ) : (
        (arr as Record<string, unknown>[]).map((x, i) => (
          <div key={i}>{render(x)}</div>
        ))
      )}
    </div>
  );
  const candRow = (c: Record<string, unknown>) => (
    <div
      key={String(c.id)}
      onClick={() => onCand(String(c.id))}
      style={{
        border: "1px solid #ebe6da",
        borderRadius: 11,
        padding: "11px 13px",
        margin: "7px 0",
        cursor: "pointer",
        background: "#fff",
      }}
    >
      <b>{bias ? `Candidate ${c.id}` : String(c.name)}</b>{" "}
      <Chip color={statusColor(String(c.stage))}>{String(c.stage)}</Chip>
      {c.days != null && (
        <span style={{ color: "#9a3b3b", fontSize: 12, marginLeft: 6 }}>
          {String(c.days)}d in stage
        </span>
      )}
    </div>
  );
  const reqRow = (r: Record<string, unknown>) => (
    <div
      key={String(r.id)}
      onClick={() => onReq(String(r.id))}
      style={{
        border: "1px solid #ebe6da",
        borderRadius: 11,
        padding: "11px 13px",
        margin: "7px 0",
        cursor: "pointer",
        background: "#fff",
      }}
    >
      <b>{String(r.id)}</b> {String(r.title || "")}
    </div>
  );

  return (
    <div style={{ maxWidth: 720 }}>
      <h2 style={{ marginTop: 0 }}>Today</h2>
      {sec("Pending approvals", (data.pendingApprovals as unknown[]) || [], reqRow)}
      {sec("New applicants (7d)", (data.newApps as unknown[]) || [], candRow)}
      {sec("Awaiting feedback", (data.awaitingFb as unknown[]) || [], candRow)}
      {sec("Debriefs", (data.debriefs as unknown[]) || [], candRow)}
      {sec("Offers", (data.offers as unknown[]) || [], candRow)}
      {sec("Stuck (SLA)", (data.stuck as unknown[]) || [], candRow)}
      {sec("Reqs needing candidates", (data.reqsNeed as unknown[]) || [], reqRow)}
    </div>
  );
}

