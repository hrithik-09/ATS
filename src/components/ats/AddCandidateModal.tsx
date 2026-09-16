"use client";

import { useState, type CSSProperties } from "react";
import { cancelBtn, inp, lab, saveBtn } from "./ui";

const SOURCES = ["Job Board", "Employee Referral", "Consultant"] as const;
type Source = (typeof SOURCES)[number] | "";

const JOB_BOARDS = [
  "Naukri",
  "Apna",
  "LinkedIn",
  "InstaHyre",
  "Internshala",
  "Others",
] as const;

const CONSULTANTS = [
  "ABC Recruiters",
  "TalentBridge Partners",
  "HireCraft Solutions",
  "PeopleFirst Consulting",
  "NextGen Staffing",
  "Others",
] as const;

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
  const [source, setSource] = useState<Source>("");
  const [jobBoard, setJobBoard] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [consultant, setConsultant] = useState("");
  const [remarks, setRemarks] = useState("");
  const [cvBase64, setCvBase64] = useState<string | undefined>();
  const [cvFileName, setCvFileName] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  function sourceDetailValue(): string | undefined {
    if (source === "Job Board") return jobBoard || undefined;
    if (source === "Employee Referral") return employeeCode.trim() || undefined;
    if (source === "Consultant") return consultant || undefined;
    return undefined;
  }

  async function submit() {
    if (!name.trim()) {
      alert("Name is required.");
      return;
    }
    if (!email.trim()) {
      alert("Email is required.");
      return;
    }
    if (!source) {
      alert("Select a source.");
      return;
    }
    const detail = sourceDetailValue();
    if (source === "Job Board" && !detail) {
      alert("Select a job board.");
      return;
    }
    if (source === "Employee Referral" && !detail) {
      alert("Enter the employee code.");
      return;
    }
    if (source === "Consultant" && !detail) {
      alert("Select a consultant.");
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
          source,
          sourceDetail: detail,
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

      <div style={sourcePanel}>
        <div style={sourcePanelTitle}>Source *</div>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "#7a7a72" }}>
          Where this candidate came from — board, referral, or consultant.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          <div>
            <label style={{ ...lab, marginTop: 0 }}>Channel</label>
            <select
              style={inp}
              value={source}
              onChange={(e) => {
                const next = e.target.value as Source;
                setSource(next);
                setJobBoard("");
                setEmployeeCode("");
                setConsultant("");
              }}
            >
              <option value="">Select source…</option>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {source === "Job Board" && (
            <div>
              <label style={{ ...lab, marginTop: 0 }}>Job board</label>
              <select
                style={inp}
                value={jobBoard}
                onChange={(e) => setJobBoard(e.target.value)}
              >
                <option value="">Select board…</option>
                {JOB_BOARDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          )}

          {source === "Employee Referral" && (
            <div>
              <label style={{ ...lab, marginTop: 0 }}>Employee code</label>
              <input
                style={inp}
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                placeholder="e.g. LT-1042"
              />
            </div>
          )}

          {source === "Consultant" && (
            <div>
              <label style={{ ...lab, marginTop: 0 }}>Consultant</label>
              <select
                style={inp}
                value={consultant}
                onChange={(e) => setConsultant(e.target.value)}
              >
                <option value="">Select consultant…</option>
                {CONSULTANTS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <label style={lab}>Remarks / notes</label>
      <textarea
        style={{ ...inp, minHeight: 72 }}
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        placeholder="Strengths, constraints, interview notes…"
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

const sourcePanel: CSSProperties = {
  marginTop: 14,
  padding: 14,
  background: "#faf9f6",
  border: "1px solid #ebe6da",
  borderRadius: 12,
};

const sourcePanelTitle: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#2c2c28",
  marginBottom: 2,
};
