"use client";

import type { CSSProperties, ReactNode } from "react";

export function ini(s: string) {
  const p = (s || "").trim().split(/\s+/);
  if (!p[0]) return "?";
  return (
    (p[0][0] || "") + (p[1] ? p[1][0] : p[0][1] || "")
  ).toUpperCase();
}

export function statusColor(s: string) {
  const x = (s || "").toLowerCase();
  if (x.includes("reject") || x === "rejected") return "#9a3b3b";
  if (x.includes("pending")) return "#b06a00";
  if (x.includes("hmapproved") || x === "hmapproved") return "#1f7a4d";
  if (x.includes("approv") || x.includes("open")) return "#1f7a4d";
  return "#3a6ea5";
}

export function prettyStatus(s: string) {
  if (s === "PendingApproval") return "Pending approval";
  if (s === "PendingHMApproval") return "Pending HM approval";
  if (s === "HMApproved") return "HM approved";
  return s;
}

export function Chip({ children, color }: { children: ReactNode; color?: string }) {
  const ink = color || "#3a6ea5";
  return (
    <span
      className="ats-chip"
      style={{
        background: color ? `${ink}18` : "#eef3f8",
        color: ink,
        border: `1px solid ${color ? `${ink}33` : "#d6e2ee"}`,
      }}
    >
      {children}
    </span>
  );
}

export function DetailItem({ label, value }: { label: string; value: string }) {
  return (
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
        {label}
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 600, marginTop: 2 }}>{value}</div>
    </div>
  );
}

export function Stat({
  label,
  value,
  bg,
}: {
  label: string;
  value: number;
  bg?: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        background: bg || "#eef3f8",
        borderRadius: 12,
        padding: 14,
        minWidth: 120,
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
    </div>
  );
}

export const tdCell: CSSProperties = {
  padding: "12px",
  borderBottom: "1px solid #f0ece3",
  verticalAlign: "middle",
};

export const lab: CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#444",
  margin: "10px 0 3px",
};
export const inp: CSSProperties = {
  width: "100%",
  padding: 9,
  border: "1px solid #ddd",
  borderRadius: 8,
  fontSize: 14,
  boxSizing: "border-box",
};
export const stepBtn: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 9,
  border: "1px solid #d6e2ee",
  background: "#eef3f8",
  color: "#3a6ea5",
  fontSize: 18,
  fontWeight: 700,
  cursor: "pointer",
};
export const cancelBtn: CSSProperties = {
  background: "#eee",
  color: "#333",
  border: "1px solid #ddd",
  borderRadius: 8,
  padding: "9px 16px",
  fontWeight: 600,
  cursor: "pointer",
};
export const saveBtn: CSSProperties = {
  background: "#2f6f4f",
  color: "#fff",
  border: 0,
  borderRadius: 8,
  padding: "9px 16px",
  fontWeight: 600,
  cursor: "pointer",
};
