"use client";

import { useState } from "react";
import { DEPARTMENTS } from "@/lib/roles";
import { Chip, inp, saveBtn, cancelBtn } from "./ui";
import type { AppUser, Role } from "@/lib/types";

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

  function toggleDept(d: string) {
    setDepartments((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <h2 style={{ marginTop: 0 }}>Team & access</h2>
      <p style={{ fontSize: 13, color: "#777" }}>
        Roles: Admin, Hiring Manager, Department Head. Assign one or more
        departments — the same person can cover multiple departments.
      </p>
      {users.map((u) => (
        <div
          key={u.email}
          style={{
            border: "1px solid #ebe6da",
            borderRadius: 11,
            padding: 12,
            marginBottom: 8,
            background: "#fff",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <div>
            <b>{u.name}</b> <Chip>{u.role}</Chip>
            <div style={{ fontSize: 12, color: "#777" }}>
              {u.email}
              {(u.departments || []).length > 0 &&
                ` · ${(u.departments || []).join(", ")}`}
            </div>
          </div>
          <button
            style={{ ...cancelBtn, color: "#9a3b3b" }}
            onClick={async () => {
              await apiFetch(`/api/team?email=${encodeURIComponent(u.email)}`, {
                method: "DELETE",
              });
              onRefresh();
            }}
          >
            remove
          </button>
        </div>
      ))}
      <h4>Add member</h4>
      <input style={inp} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <input style={{ ...inp, marginTop: 8 }} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <select style={{ ...inp, marginTop: 8 }} value={role} onChange={(e) => setRole(e.target.value as Role)}>
        <option value="Admin">Admin</option>
        <option value="HiringManager">Hiring Manager</option>
        <option value="DepartmentHead">Department Head</option>
      </select>
      {role !== "Admin" && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
            Departments *
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {DEPARTMENTS.map((d) => (
              <label
                key={d}
                style={{
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: departments.includes(d) ? "#eef3f8" : "#faf9f6",
                  border: "1px solid #e2ddd0",
                  borderRadius: 8,
                  padding: "6px 10px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={departments.includes(d)}
                  onChange={() => toggleDept(d)}
                />
                {d}
              </label>
            ))}
          </div>
        </div>
      )}
      <button
        style={{ ...saveBtn, marginTop: 10 }}
        onClick={async () => {
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
        }}
      >
        Add
      </button>
    </div>
  );
}

