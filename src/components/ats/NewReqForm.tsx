"use client";

import { useState } from "react";
import { DEPARTMENTS, LOCATIONS } from "@/lib/roles";
import { DualRange } from "./DualRange";
import { cancelBtn, inp, lab, saveBtn, stepBtn } from "./ui";

export function NewReqForm({
  raisedBy,
  allowedDepartments,
  onClose,
  onSave,
}: {
  raisedBy: string;
  allowedDepartments: string[];
  onClose: () => void;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const depts = allowedDepartments.length ? allowedDepartments : [...DEPARTMENTS];
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState<string>(depts[0]);
  const [locations, setLocations] = useState<string[]>([]);
  const [employment, setEmployment] = useState("Full-time");
  const [expLo, setExpLo] = useState(2);
  const [expHi, setExpHi] = useState(5);
  const [salLo, setSalLo] = useState(10);
  const [salHi, setSalHi] = useState(20);
  const [joinLo, setJoinLo] = useState(15);
  const [joinHi, setJoinHi] = useState(30);
  const [openings, setOpenings] = useState(1);
  const [notes, setNotes] = useState("");
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  function toggleLocation(city: string) {
    setLocations((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    );
  }

  async function fileToBase64(file: File): Promise<string> {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
    return btoa(binary);
  }

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>New requisition</h3>
      <div style={{ fontSize: 12, color: "#777", marginBottom: 12 }}>
        Goes automatically to the Department Head(s) for the selected
        department — no email to enter. Recruiting unlocks after they approve.
      </div>
      <label style={lab}>Title *</label>
      <input style={inp} value={title} onChange={(e) => setTitle(e.target.value)} />
      <label style={lab}>Department *</label>
      <select
        style={inp}
        value={department}
        onChange={(e) => setDepartment(e.target.value)}
      >
        {depts.map((d) => (
          <option key={d}>{d}</option>
        ))}
      </select>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={lab}>Location *</label>
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: "8px 10px",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {LOCATIONS.map((city) => (
              <label
                key={city}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={locations.includes(city)}
                  onChange={() => toggleLocation(city)}
                />
                {city}
              </label>
            ))}
          </div>
          {locations.length > 0 && (
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
              Selected: {locations.join(", ")}
            </div>
          )}
        </div>
        <div>
          <label style={lab}>Employment</label>
          <select style={inp} value={employment} onChange={(e) => setEmployment(e.target.value)}>
            <option>Full-time</option>
            <option>Contract</option>
            <option>Intern</option>
          </select>
        </div>
      </div>
      <label style={lab}>
        Experience (years): {expLo}–{expHi}
      </label>
      <DualRange
        min={0}
        max={30}
        lo={expLo}
        hi={expHi}
        onChange={(a, b) => {
          setExpLo(a);
          setExpHi(b);
        }}
      />
      <label style={lab}>
        Salary (LPA): {salLo}–{salHi}
      </label>
      <DualRange
        min={0}
        max={100}
        lo={salLo}
        hi={salHi}
        onChange={(a, b) => {
          setSalLo(a);
          setSalHi(b);
        }}
      />
      <label style={lab}>
        Joining timeline (days): {joinLo}–{joinHi}
      </label>
      <DualRange
        min={0}
        max={90}
        lo={joinLo}
        hi={joinHi}
        onChange={(a, b) => {
          setJoinLo(a);
          setJoinHi(b);
        }}
      />
      <label style={lab}>Openings</label>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button type="button" onClick={() => setOpenings((n) => Math.max(1, n - 1))} style={stepBtn}>
          −
        </button>
        <b>{openings}</b>
        <button type="button" onClick={() => setOpenings((n) => n + 1)} style={stepBtn}>
          +
        </button>
      </div>
      <label style={lab}>Raised by</label>
      <div
        style={{
          background: "#f6f5f1",
          border: "1px solid #e2ddd0",
          borderRadius: 8,
          padding: "10px 12px",
          fontSize: 14,
        }}
      >
        {raisedBy}
      </div>
      <label style={lab}>Notes</label>
      <textarea
        style={{ ...inp, minHeight: 80 }}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional notes for approvers / recruiters"
      />
      <label style={lab}>JD (PDF)</label>
      <input
        type="file"
        accept="application/pdf,.pdf"
        style={{ ...inp, padding: 8 }}
        onChange={(e) => {
          const f = e.target.files?.[0] || null;
          if (f && f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
            alert("Please upload a PDF file.");
            e.target.value = "";
            setJdFile(null);
            return;
          }
          setJdFile(f);
        }}
      />
      {jdFile && (
        <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
          Attached: {jdFile.name} ({Math.round(jdFile.size / 1024)} KB)
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
        <button onClick={onClose} style={cancelBtn}>
          Cancel
        </button>
        <button
          disabled={busy}
          onClick={async () => {
            if (!locations.length) {
              alert("Select at least one location.");
              return;
            }
            setBusy(true);
            try {
              let jdBase64: string | undefined;
              let jdFileName: string | undefined;
              if (jdFile) {
                jdBase64 = await fileToBase64(jdFile);
                jdFileName = jdFile.name;
              }
              await onSave({
                title,
                department,
                locations,
                location: locations.join(", "),
                employment,
                level: `${expLo}-${expHi} years`,
                salaryMin: salLo,
                salaryMax: salHi,
                priority: `${joinLo}-${joinHi} days`,
                openings,
                notes,
                jdText: notes,
                jdBase64,
                jdFileName,
              });
            } finally {
              setBusy(false);
            }
          }}
          style={saveBtn}
        >
          Submit for approval
        </button>
      </div>
    </div>
  );
}
