"use client";

import type { Candidate, Requisition } from "@/lib/types";
import { Chip, statusColor, cancelBtn } from "./ui";

export function SearchPanel({
  data,
  onClose,
  onReq,
  onCand,
  bias,
}: {
  data: { reqs: Requisition[]; candidates: Candidate[] };
  onClose: () => void;
  onReq: (id: string) => void;
  onCand: (id: string) => void;
  bias: boolean;
}) {
  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Search</h3>
      <h4>Requisitions</h4>
      {(data.reqs || []).map((r) => (
        <div
          key={r.id}
          onClick={() => onReq(r.id)}
          style={{
            cursor: "pointer",
            padding: 8,
            borderBottom: "1px solid #eee",
          }}
        >
          <b>{r.id}</b> {r.title}{" "}
          <Chip color={statusColor(r.status)}>{r.status}</Chip>
        </div>
      ))}
      <h4>Candidates</h4>
      {(data.candidates || []).map((c) => (
        <div
          key={c.id}
          onClick={() => onCand(c.id)}
          style={{
            cursor: "pointer",
            padding: 8,
            borderBottom: "1px solid #eee",
          }}
        >
          <b>{bias ? c.id : c.name}</b> {c.stage} · {c.reqId}
        </div>
      ))}
      <button style={{ ...cancelBtn, marginTop: 12 }} onClick={onClose}>
        Close
      </button>
    </div>
  );
}
