import type { ReactNode } from "react";

/** Auth is provided at the root layout; keep this segment layout as a pass-through. */
export default function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
