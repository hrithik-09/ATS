import type { Role } from "./types";

export const ROLE_RANK: Record<Role, number> = {
  HiringManager: 1,
  DepartmentHead: 2,
  Admin: 3,
};

export const ROLE_LABELS: Record<Role, string> = {
  Admin: "Admin",
  HiringManager: "Hiring Manager",
  DepartmentHead: "Department Head",
};

export function hasMinRole(role: Role | undefined, min: Role): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

/** Admin runs recruiting after approval. */
export function canRecruit(role: Role): boolean {
  return role === "Admin";
}

export function canManageTeam(role: Role): boolean {
  return role === "Admin";
}

export function canRaiseReq(role: Role): boolean {
  return role === "HiringManager" || role === "Admin";
}

export function canApprove(role: Role): boolean {
  return role === "DepartmentHead" || role === "Admin";
}

export const DEPARTMENTS = [
  "Technology",
  "Data",
  "IT",
  "Finance",
  "Operations",
  "Sales",
  "Human Resource",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export const LOCATIONS = [
  "Bengaluru",
  "Gurgaon",
  "Hyderabad",
  "Chennai",
] as const;

export type LocationCity = (typeof LOCATIONS)[number];

export const SEED_USERS = [
  {
    email: "vigneshsuresh36@gmail.com",
    name: "Vignesh Suresh",
    role: "Admin" as Role,
    title: "Admin",
    departments: [...DEPARTMENTS] as string[],
  },
];

export function userCoversDepartment(
  departments: string[] | undefined,
  department: string
): boolean {
  const list = departments || [];
  return list.map((d) => d.toLowerCase()).includes(department.toLowerCase());
}
