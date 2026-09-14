"use client";

import { Stat } from "./ui";

export function AnalyticsView({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return <p style={{ color: "#888" }}>Loading…</p>;
  const stages = (data.stages || {}) as Record<string, number>;
  const funnel = (data.approvalFunnel || {}) as Record<string, number>;
  const max = Math.max(1, ...Object.values(stages));
  return (
    <div style={{ maxWidth: 720 }}>
      <h2 style={{ marginTop: 0 }}>Dashboard & analytics</h2>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <Stat label="candidates" value={Number(data.totalCandidates) || 0} />
        <Stat label="open reqs" value={Number(data.openReqs) || 0} bg="#eef7f0" />
      </div>
      <h4>Approval funnel</h4>
      <div style={{ fontSize: 13, marginBottom: 16 }}>
        Pending {funnel.pending || 0} · Approved {funnel.approved || 0} · Rejected{" "}
        {funnel.rejected || 0}
      </div>
      <h4>Pipeline by stage</h4>
      {Object.entries(stages).map(([s, n]) => (
        <div
          key={s}
          style={{
            display: "grid",
            gridTemplateColumns: "140px 1fr 40px",
            gap: 8,
            alignItems: "center",
            marginBottom: 6,
            fontSize: 12,
          }}
        >
          <span>{s}</span>
          <div style={{ background: "#eee", borderRadius: 6, height: 10 }}>
            <div
              style={{
                width: `${(n / max) * 100}%`,
                background: "#3a6ea5",
                height: 10,
                borderRadius: 6,
              }}
            />
          </div>
          <b>{n}</b>
        </div>
      ))}
    </div>
  );
}

