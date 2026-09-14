"use client";

import type { CSSProperties, ReactNode } from "react";
import { Chip, statusColor, prettyStatus } from "./ui";

type Section = {
  key: string;
  title: string;
  hint: string;
  items: unknown[];
  kind: "cand" | "req";
};

export function TodayView({
  data,
  onReq,
  onCand,
}: {
  data: Record<string, unknown> | null;
  onReq: (id: string) => void;
  onCand: (id: string) => void;
}) {
  if (!data) {
    return (
      <div style={{ color: "#888", padding: "24px 0" }}>Loading your day…</div>
    );
  }

  const sections: Section[] = [
    {
      key: "approvals",
      title: "Pending approvals",
      hint: "Requisitions waiting on department head",
      items: (data.pendingApprovals as unknown[]) || [],
      kind: "req",
    },
    {
      key: "new",
      title: "New applicants",
      hint: "Added in the last 7 days",
      items: (data.newApps as unknown[]) || [],
      kind: "cand",
    },
    {
      key: "feedback",
      title: "Awaiting feedback",
      hint: "Interviews without notes yet",
      items: (data.awaitingFb as unknown[]) || [],
      kind: "cand",
    },
    {
      key: "debriefs",
      title: "Debriefs",
      hint: "Ready for Advance / Hold / Reject",
      items: (data.debriefs as unknown[]) || [],
      kind: "cand",
    },
    {
      key: "offers",
      title: "Offers",
      hint: "Candidates in offer stage",
      items: (data.offers as unknown[]) || [],
      kind: "cand",
    },
    {
      key: "stuck",
      title: "Stuck (SLA)",
      hint: "Past your org SLA with no stage move",
      items: (data.stuck as unknown[]) || [],
      kind: "cand",
    },
    {
      key: "need",
      title: "Reqs needing candidates",
      hint: "Approved reqs with an empty pipeline",
      items: (data.reqsNeed as unknown[]) || [],
      kind: "req",
    },
  ];

  const totalOpen = sections.reduce((n, s) => n + s.items.length, 0);

  const candRow = (c: Record<string, unknown>) => (
    <button
      key={String(c.id)}
      type="button"
      onClick={() => onCand(String(c.id))}
      style={itemBtn}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{String(c.name)}</div>
        <div style={{ fontSize: 12, color: "#7a7a72", marginTop: 2 }}>
          {String(c.reqId || "")}
          {c.days != null ? ` · ${String(c.days)}d in stage` : ""}
        </div>
      </div>
      <Chip color={statusColor(String(c.stage))}>
        {prettyStatus(String(c.stage))}
      </Chip>
    </button>
  );

  const reqRow = (r: Record<string, unknown>) => (
    <button
      key={String(r.id)}
      type="button"
      onClick={() => onReq(String(r.id))}
      style={itemBtn}
    >
      <div style={{ minWidth: 0, textAlign: "left" }}>
        <div style={{ fontWeight: 600, fontSize: 13.5 }}>
          {String(r.title || r.id)}
        </div>
        <div style={{ fontSize: 12, color: "#7a7a72", marginTop: 2 }}>
          {String(r.id)}
          {r.department ? ` · ${String(r.department)}` : ""}
        </div>
      </div>
    </button>
  );

  const renderItem = (s: Section, x: Record<string, unknown>): ReactNode =>
    s.kind === "cand" ? candRow(x) : reqRow(x);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: 26, letterSpacing: "-0.02em" }}>
            Today
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "#6e6e66" }}>
            What needs attention across hiring right now.
          </p>
        </div>
        <div
          style={{
            background: totalOpen ? "#f3f0ff" : "#f3f2ed",
            border: `1px solid ${totalOpen ? "#ddd5ff" : "#e6e2d6"}`,
            borderRadius: 12,
            padding: "10px 14px",
            minWidth: 120,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>
            {totalOpen}
          </div>
          <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
            open items
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 10,
          marginBottom: 18,
        }}
      >
        {sections.map((s) => (
          <a
            key={s.key}
            href={`#today-${s.key}`}
            style={{
              textDecoration: "none",
              color: "inherit",
              background: "#fff",
              border: "1px solid #ebe6da",
              borderRadius: 12,
              padding: "12px 14px",
              boxShadow: "0 1px 0 rgba(40,35,20,.03)",
            }}
          >
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                color: s.items.length ? "#2c2c28" : "#b0aaa0",
              }}
            >
              {s.items.length}
            </div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: "#555",
                marginTop: 4,
                lineHeight: 1.3,
              }}
            >
              {s.title}
            </div>
          </a>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 14,
        }}
      >
        {sections.map((s) => (
          <section
            key={s.key}
            id={`today-${s.key}`}
            style={{
              background: "#fff",
              border: "1px solid #ebe6da",
              borderRadius: 14,
              padding: 14,
              minHeight: 160,
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 1px 0 rgba(40,35,20,.03)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: "#8a8a82", marginTop: 2 }}>
                  {s.hint}
                </div>
              </div>
              <Chip color={s.items.length ? "#6b5ce7" : undefined}>
                {s.items.length}
              </Chip>
            </div>
            <div style={{ flex: 1 }}>
              {s.items.length === 0 ? (
                <div
                  style={{
                    height: "100%",
                    minHeight: 72,
                    borderRadius: 10,
                    background: "#faf9f5",
                    border: "1px dashed #e5e0d4",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#a8a398",
                    fontSize: 13,
                  }}
                >
                  All clear
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  {(s.items as Record<string, unknown>[]).map((x) =>
                    renderItem(s, x)
                  )}
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

const itemBtn: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  width: "100%",
  textAlign: "left",
  border: "1px solid #f0ece3",
  background: "#faf9f6",
  borderRadius: 10,
  padding: "10px 12px",
  cursor: "pointer",
};
