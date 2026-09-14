"use client";

import { useState, type CSSProperties } from "react";
import { DEPARTMENTS } from "@/lib/roles";
import { Chip, inp, lab, saveBtn } from "./ui";
import type { AppUser, Role } from "@/lib/types";

function roleLabel(role: Role) {
  if (role === "HiringManager") return "Hiring Manager";
  if (role === "DepartmentHead") return "Department Head";
  return role;
}

export function TeamView({
  users,
  apiFetch,
  onRefresh,
}: {
  users: AppUser[];
  apiFetch: (p: string, i?: RequestInit) => Promise<Response>;
  onRefresh: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("DepartmentHead");
  const [departments, setDepartments] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  function toggleDept(d: string) {
    setDepartments((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  }

  async function addMember() {
    setBusy(true);
    try {
      const r = await apiFetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role, departments }),
      });
      const d = await r.json();
      if (!r.ok) alert(d.error);
      else {
        setName("");
        setEmail("");
        setDepartments([]);
        onRefresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ width: "100%" }}>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 26, letterSpacing: "-0.02em" }}>
          Team & access
        </h2>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "#6e6e66" }}>
          Admins, hiring managers, and department heads. Assign departments so
          approvals and requisitions route correctly.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 12,
          marginBottom: 22,
        }}
        className="ats-team-grid"
      >
        {users.map((u) => (
          <div key={u.email} style={memberCard}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{u.name}</span>
                  <Chip>{roleLabel(u.role)}</Chip>
                </div>
                <div style={{ fontSize: 13, color: "#666", wordBreak: "break-all" }}>
                  {u.email}
                </div>
                {(u.departments || []).length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      marginTop: 10,
                    }}
                  >
                    {(u.departments || []).map((d) => (
                      <span key={d} style={deptPill}>
                        {d}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                style={removeBtn}
                onClick={async () => {
                  await apiFetch(
                    `/api/team?email=${encodeURIComponent(u.email)}`,
                    { method: "DELETE" }
                  );
                  onRefresh();
                }}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <section style={panel}>
        <h3 style={{ margin: "0 0 14px", fontSize: 16 }}>Add member</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
            gap: 14,
          }}
          className="ats-team-form"
        >
          <div>
            <label style={{ ...lab, marginTop: 0 }}>Name</label>
            <input
              style={inp}
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label style={{ ...lab, marginTop: 0 }}>Email</label>
            <input
              style={inp}
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label style={{ ...lab, marginTop: 0 }}>Role</label>
            <select
              style={inp}
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="Admin">Admin</option>
              <option value="HiringManager">Hiring Manager</option>
              <option value="DepartmentHead">Department Head</option>
            </select>
          </div>
        </div>

        {role !== "Admin" && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
              Departments *
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 8,
              }}
            >
              {DEPARTMENTS.map((d) => {
                const on = departments.includes(d);
                return (
                  <label
                    key={d}
                    style={{
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: on ? "#eef3f8" : "#faf9f6",
                      border: `1px solid ${on ? "#c5d6e8" : "#e2ddd0"}`,
                      borderRadius: 10,
                      padding: "10px 12px",
                      cursor: "pointer",
                      fontWeight: on ? 600 : 500,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleDept(d)}
                    />
                    {d}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: 18,
            paddingTop: 16,
            borderTop: "1px solid #f0ece3",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            style={{ ...saveBtn, minWidth: 120 }}
            disabled={busy}
            onClick={addMember}
          >
            {busy ? "Adding…" : "Add member"}
          </button>
        </div>
      </section>

      <style>{`
        @media (max-width: 900px) {
          .ats-team-grid, .ats-team-form {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

const panel: CSSProperties = {
  background: "#fff",
  border: "1px solid #ebe6da",
  borderRadius: 14,
  padding: 20,
  boxShadow: "0 1px 0 rgba(40,35,20,.03)",
};

const memberCard: CSSProperties = {
  ...panel,
  padding: 16,
  minHeight: 112,
};

const deptPill: CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: "#3a6ea5",
  background: "#eef3f8",
  border: "1px solid #d6e2ee",
  borderRadius: 999,
  padding: "3px 8px",
};

const removeBtn: CSSProperties = {
  background: "#faf5f5",
  color: "#9a3b3b",
  border: "1px solid #ecd5d5",
  borderRadius: 8,
  padding: "8px 12px",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
  lineHeight: 1.2,
  alignSelf: "center",
  flexShrink: 0,
};
