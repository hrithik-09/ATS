"use client";

import type { CSSProperties } from "react";
import { Stat, prettyStatus } from "./ui";

export function AnalyticsView({
  data,
}: {
  data: Record<string, unknown> | null;
}) {
  if (!data) {
    return <p style={{ color: "#888" }}>Loading dashboard…</p>;
  }

  const stages = (data.stages || {}) as Record<string, number>;
  const funnel = (data.approvalFunnel || {}) as Record<string, number>;
  const max = Math.max(1, ...Object.values(stages), 1);
  const stageEntries = Object.entries(stages).sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 26, letterSpacing: "-0.02em" }}>
          Dashboard
        </h2>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "#6e6e66" }}>
          Hiring funnel and pipeline health at a glance.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Stat label="Candidates" value={Number(data.totalCandidates) || 0} />
        <Stat
          label="Open requisitions"
          value={Number(data.openReqs) || 0}
          bg="#eef7f0"
        />
        <Stat
          label="Pending approvals"
          value={Number(funnel.pending) || 0}
          bg="#fff7ec"
        />
        <Stat
          label="Approved reqs"
          value={Number(funnel.approved) || 0}
          bg="#eef3f8"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 14,
        }}
      >
        <section style={card}>
          <h3 style={cardTitle}>Approval funnel</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(
              [
                ["Pending", funnel.pending || 0, "#b06a00"],
                ["Approved", funnel.approved || 0, "#1f7a4d"],
                ["Rejected", funnel.rejected || 0, "#9a3b3b"],
              ] as const
            ).map(([label, n, color]) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "#faf9f6",
                  border: "1px solid #f0ece3",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color }}>
                  {label}
                </span>
                <span style={{ fontSize: 18, fontWeight: 800 }}>{n}</span>
              </div>
            ))}
          </div>
        </section>

        <section style={card}>
          <h3 style={cardTitle}>Pipeline by stage</h3>
          {stageEntries.length === 0 ? (
            <div style={{ color: "#aaa", fontSize: 13 }}>No candidates yet</div>
          ) : (
            stageEntries.map(([s, n]) => (
              <div
                key={s}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(100px, 1.1fr) 1fr 36px",
                  gap: 8,
                  alignItems: "center",
                  marginBottom: 8,
                  fontSize: 12,
                }}
              >
                <span style={{ color: "#444" }}>{prettyStatus(s)}</span>
                <div
                  style={{
                    background: "#eeeae2",
                    borderRadius: 6,
                    height: 10,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${(n / max) * 100}%`,
                      background: "#3a6ea5",
                      height: 10,
                      borderRadius: 6,
                    }}
                  />
                </div>
                <b style={{ textAlign: "right" }}>{n}</b>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}

const card: CSSProperties = {
  background: "#fff",
  border: "1px solid #ebe6da",
  borderRadius: 14,
  padding: 16,
  boxShadow: "0 1px 0 rgba(40,35,20,.03)",
};

const cardTitle: CSSProperties = {
  margin: "0 0 12px",
  fontSize: 14,
  fontWeight: 700,
};
