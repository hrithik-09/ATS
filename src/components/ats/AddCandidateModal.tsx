"use client";

import { useState } from "react";
import { cancelBtn, inp, lab, saveBtn } from "./ui";

export function AddCandidateModal({
  reqId,
  reqTitle,
  onClose,
  onBack,
  apiFetch,
  onSaved,
}: {
  reqId: string;
  reqTitle: string;
  onClose: () => void;
  onBack: () => void;
  apiFetch: (p: string, i?: RequestInit) => Promise<Response>;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [currentCtc, setCurrentCtc] = useState("");
  const [expectedCtc, setExpectedCtc] = useState("");
  const [presentlyWorking, setPresentlyWorking] = useState(true);
  const [notice, setNotice] = useState("");
  const [remarks, setRemarks] = useState("");
  const [cvBase64, setCvBase64] = useState<string | undefined>();
  const [cvFileName, setCvFileName] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!name.trim()) {
      alert("Name is required.");
      return;
    }
    if (!email.trim()) {
      alert("Email is required.");
      return;
    }
    setBusy(true);
    try {
      const r = await apiFetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reqId,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          location: location.trim(),
          currentCtc: currentCtc.trim() || undefined,
          expectedCtc: expectedCtc.trim() || undefined,
          notice: presentlyWorking
            ? notice.trim() || undefined
            : "Immediate / not working",
          remarks: remarks.trim() || undefined,
          cvBase64,
          cvFileName,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        alert(d.error || "Failed to save candidate.");
        return;
      }
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <a onClick={onBack} style={{ cursor: "pointer", color: "#3a6ea5" }}>
        ← Back to requisition
      </a>
      <h3 style={{ marginTop: 8, marginBottom: 4 }}>Add candidate</h3>
      <div style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
        For {reqTitle} <code style={{ fontSize: 12 }}>{reqId}</code>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        <div>
          <label style={lab}>Name *</label>
          <input
            style={inp}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
          />
        </div>
        <div>
          <label style={lab}>Email *</label>
          <input
            style={inp}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="candidate@email.com"
          />
        </div>
        <div>
          <label style={lab}>Phone</label>
          <input
            style={inp}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 …"
          />
        </div>
        <div>
          <label style={lab}>Location</label>
          <input
            style={inp}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="City / preferred location"
          />
        </div>
        <div>
          <label style={lab}>Present CTC</label>
          <input
            style={inp}
            value={currentCtc}
            onChange={(e) => setCurrentCtc(e.target.value)}
            placeholder="e.g. 18 LPA"
          />
        </div>
        <div>
          <label style={lab}>Expected CTC</label>
          <input
            style={inp}
            value={expectedCtc}
            onChange={(e) => setExpectedCtc(e.target.value)}
            placeholder="e.g. 24 LPA"
          />
        </div>
      </div>

      <label
        style={{
          ...lab,
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginTop: 12,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={presentlyWorking}
          onChange={(e) => setPresentlyWorking(e.target.checked)}
        />
        Presently working
      </label>

      {presentlyWorking && (
        <>
          <label style={lab}>Notice period</label>
          <input
            style={inp}
            value={notice}
            onChange={(e) => setNotice(e.target.value)}
            placeholder="e.g. 30 days / 60 days / serving"
          />
        </>
      )}

      <label style={lab}>Remarks / notes</label>
      <textarea
        style={{ ...inp, minHeight: 72 }}
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        placeholder="Source, referral, strengths, constraints…"
      />

      <label style={lab}>CV (PDF / DOC)</label>
      <input
        type="file"
        accept=".pdf,.doc,.docx,application/pdf"
        style={{ ...inp, padding: 8 }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) {
            setCvBase64(undefined);
            setCvFileName(undefined);
            return;
          }
          const rd = new FileReader();
          rd.onload = () => {
            const raw = String(rd.result || "");
            setCvBase64(raw.includes(",") ? raw.split(",")[1] : raw);
            setCvFileName(f.name);
          };
          rd.readAsDataURL(f);
        }}
      />
      {cvFileName && (
        <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
          Attached: {cvFileName}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          marginTop: 16,
        }}
      >
        <button type="button" onClick={onClose} style={cancelBtn}>
          Cancel
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={submit}
          style={saveBtn}
        >
          {busy ? "Saving…" : "Save candidate"}
        </button>
      </div>
    </div>
  );
}
