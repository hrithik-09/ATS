"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { DEPARTMENTS } from "@/lib/roles";
import { ini } from "@/components/ats/ui";
import type { AppUser, Requisition, Role } from "@/lib/types";

const TodayView = dynamic(
  () => import("@/components/ats/TodayView").then((m) => m.TodayView),
  { ssr: false }
);
const ReqBoard = dynamic(
  () => import("@/components/ats/ReqBoard").then((m) => m.ReqBoard),
  { ssr: false }
);
const ApprovalsView = dynamic(
  () => import("@/components/ats/ApprovalsView").then((m) => m.ApprovalsView),
  { ssr: false }
);
const ScheduleView = dynamic(
  () => import("@/components/ats/ScheduleView").then((m) => m.ScheduleView),
  { ssr: false }
);
const AnalyticsView = dynamic(
  () => import("@/components/ats/AnalyticsView").then((m) => m.AnalyticsView),
  { ssr: false }
);
const TeamView = dynamic(
  () => import("@/components/ats/TeamView").then((m) => m.TeamView),
  { ssr: false }
);

type Tab =
  | "today"
  | "requisitions"
  | "approvals"
  | "schedule"
  | "dashboard"
  | "analytics"
  | "team";

export default function AppShell() {
  const { profile, loading, token, apiFetch, signOut, error } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("today");
  const [orgName, setOrgName] = useState("LetsTransport");
  const [bias, setBias] = useState(false);
  const [overlay, setOverlay] = useState(false);
  const [panel, setPanel] = useState<ReactNode>(null);
  const [today, setToday] = useState<Record<string, unknown> | null>(null);
  const [reqs, setReqs] = useState<Requisition[]>([]);
  const [approvals, setApprovals] = useState<Requisition[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(
    null
  );
  const [team, setTeam] = useState<AppUser[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [schedulePrefill, setSchedulePrefill] = useState<{
    reqId: string;
    candidateId: string;
    roundIndex: number;
  } | null>(null);

  const role = profile?.role as Role | undefined;

  useEffect(() => {
    if (!loading && (!token || !profile)) router.replace("/login");
  }, [loading, token, profile, router]);

  const loadToday = useCallback(async () => {
    const r = await apiFetch("/api/today");
    const d = await r.json();
    if (r.ok) setToday(d);
  }, [apiFetch]);

  const loadReqs = useCallback(async () => {
    const r = await apiFetch("/api/requisitions");
    const d = await r.json();
    if (r.ok) setReqs(d.requisitions || []);
  }, [apiFetch]);

  const loadApprovals = useCallback(async () => {
    const r = await apiFetch("/api/approvals");
    const d = await r.json();
    if (r.ok) setApprovals(d.requisitions || []);
  }, [apiFetch]);

  const loadAnalytics = useCallback(async () => {
    const r = await apiFetch("/api/analytics");
    const d = await r.json();
    if (r.ok) setAnalytics(d);
  }, [apiFetch]);

  const loadTeam = useCallback(async () => {
    const r = await apiFetch("/api/team");
    const d = await r.json();
    if (r.ok) setTeam(d.users || []);
  }, [apiFetch]);

  useEffect(() => {
    if (!profile) return;
    apiFetch("/api/org")
      .then((r) => r.json())
      .then((d) => {
        if (d.org?.company) setOrgName(d.org.company);
        if (d.org?.biasMaskDefault) setBias(!!d.org.biasMaskDefault);
      });
    if (role === "DepartmentHead") setTab("approvals");
    else if (role === "HiringManager") setTab("requisitions");
    else setTab("today");
  }, [profile, apiFetch, role]);

  useEffect(() => {
    if (!profile) return;
    if (tab === "today") loadToday();
    if (tab === "requisitions") loadReqs();
    if (tab === "approvals") loadApprovals();
    if (tab === "dashboard" || tab === "analytics") loadAnalytics();
    if (tab === "team") loadTeam();
    if (tab === "schedule") loadReqs();
  }, [
    tab,
    profile,
    loadToday,
    loadReqs,
    loadApprovals,
    loadAnalytics,
    loadTeam,
  ]);

  const tabs = useMemo(() => {
    const all: { id: Tab; label: string; show: boolean }[] = [
      { id: "today", label: "Today", show: role === "Admin" },
      { id: "requisitions", label: "Requisitions", show: true },
      {
        id: "approvals",
        label: "Approvals",
        show: role === "DepartmentHead" || role === "Admin",
      },
      { id: "schedule", label: "Schedule", show: role === "Admin" },
      { id: "dashboard", label: "Dashboard", show: role === "Admin" },
      { id: "analytics", label: "Analytics", show: role === "Admin" },
      { id: "team", label: "Team", show: role === "Admin" },
    ];
    return all.filter((t) => t.show);
  }, [role]);

  function openModal(node: ReactNode) {
    setPanel(node);
    setOverlay(true);
  }
  function closeModal() {
    setOverlay(false);
    setPanel(null);
  }

  async function openCandidate(id: string) {
    const [{ CandidatePanel }, r] = await Promise.all([
      import("@/components/ats/CandidatePanel"),
      apiFetch(`/api/candidates/${id}`),
    ]);
    const d = await r.json();
    if (!r.ok) {
      setMsg(d.error);
      return;
    }
    const cand = d.candidate as { reqId: string };
    const reqMeta = reqs.find((x) => x.id === cand.reqId);
    const isHmOwner =
      !!profile?.email &&
      !!reqMeta &&
      reqMeta.raisedByEmail === profile.email.toLowerCase();
    // If req not in list, fetch for ownership check
    let hmOwner = isHmOwner;
    if (!reqMeta && role === "HiringManager") {
      const rr = await apiFetch(`/api/requisitions/${cand.reqId}`);
      const rd = await rr.json();
      if (rr.ok) {
        hmOwner =
          rd.requisition.raisedByEmail === profile!.email.toLowerCase();
      }
    }
    openModal(
      <CandidatePanel
        data={d}
        role={role!}
        bias={bias}
        isHmOwner={hmOwner || role === "Admin"}
        onClose={closeModal}
        apiFetch={apiFetch}
        onRefresh={() => openCandidate(id)}
        onScheduleRound1={() => {
          closeModal();
          setSchedulePrefill({
            reqId: cand.reqId,
            candidateId: id,
            roundIndex: 1,
          });
          setTab("schedule");
        }}
      />
    );
  }

  async function openPipeline(reqId: string) {
    const [{ PipelinePanel }, rr, cr, ir] = await Promise.all([
      import("@/components/ats/PipelinePanel"),
      apiFetch(`/api/requisitions/${reqId}`),
      apiFetch(`/api/candidates?reqId=${reqId}`),
      apiFetch(`/api/schedule?reqId=${reqId}`),
    ]);
    const rd = await rr.json();
    const cd = await cr.json();
    const idata = await ir.json();
    if (!rr.ok) {
      setMsg(rd.error || "Failed to load requisition.");
      return;
    }
    openModal(
      <PipelinePanel
        req={rd.requisition}
        candidates={cd.candidates || []}
        interviews={idata.interviews || []}
        role={role!}
        bias={bias}
        profileEmail={profile?.email}
        onClose={closeModal}
        apiFetch={apiFetch}
        onRefresh={() => openPipeline(reqId)}
        onCand={openCandidate}
        onAddCandidate={() => openAddCandidate(reqId, rd.requisition.title)}
      />
    );
  }

  async function openAddCandidate(reqId: string, reqTitle: string) {
    const { AddCandidateModal } = await import(
      "@/components/ats/AddCandidateModal"
    );
    openModal(
      <AddCandidateModal
        reqId={reqId}
        reqTitle={reqTitle}
        apiFetch={apiFetch}
        onClose={closeModal}
        onBack={() => openPipeline(reqId)}
        onSaved={() => {
          setMsg("Candidate added.");
          openPipeline(reqId);
        }}
      />
    );
  }

  async function doSearch() {
    if (searchQ.trim().length < 2) return;
    const [{ SearchPanel }, r] = await Promise.all([
      import("@/components/ats/SearchPanel"),
      apiFetch(`/api/search?q=${encodeURIComponent(searchQ)}`),
    ]);
    const d = await r.json();
    if (r.ok) {
      openModal(
        <SearchPanel
          data={d}
          onClose={closeModal}
          onReq={(id) => {
            closeModal();
            openPipeline(id);
          }}
          onCand={(id) => {
            closeModal();
            openCandidate(id);
          }}
          bias={bias}
        />
      );
    }
  }

  async function openNewReq() {
    const { NewReqForm } = await import("@/components/ats/NewReqForm");
    openModal(
      <NewReqForm
        raisedBy={`${profile?.name} · ${profile?.email}`}
        allowedDepartments={
          role === "Admin"
            ? [...DEPARTMENTS]
            : profile?.departments?.length
              ? profile.departments
              : [...DEPARTMENTS]
        }
        onClose={closeModal}
        onSave={async (body) => {
          const r = await apiFetch("/api/requisitions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const d = await r.json();
          if (!r.ok) {
            setMsg(d.error || "Failed");
            return;
          }
          setMsg(
            `Requisition ${d.requisition.id} sent to ${d.requisition.department} department head(s) for approval.`
          );
          closeModal();
          setTab("requisitions");
          loadReqs();
        }}
      />
    );
  }

  if (loading || !profile) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#777" }}>
        Loading…
      </div>
    );
  }

  const dateStr = new Date()
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .replace(/\//g, " ");

  return (
    <div
      style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
    >
      <header
        style={{
          background: "#fff",
          borderBottom: "1px solid #e7e2d5",
          padding: "12px 18px",
          boxShadow: "0 1px 3px rgba(20,30,40,.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 11,
                background: "linear-gradient(135deg,#2f6f4f,#3a6ea5)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
              }}
            >
              LT
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-space), sans-serif",
                  fontWeight: 700,
                  fontSize: 17,
                }}
              >
                {orgName}{" "}
                <span
                  style={{
                    fontSize: 10,
                    background: "#6b5ce7",
                    color: "#fff",
                    borderRadius: 9,
                    padding: "1px 6px",
                  }}
                >
                  ATS
                </span>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#9a9a92",
                  textTransform: "uppercase",
                  letterSpacing: 0.4,
                }}
              >
                Talent Acquisition Suite
              </div>
            </div>
          </div>
          <div style={{ flex: 1 }} />
          <div
            style={{
              fontSize: 12.5,
              background: "#f4f2ec",
              border: "1px solid #e7e2d5",
              borderRadius: 21,
              padding: "6px 13px",
              fontWeight: 600,
            }}
          >
            {dateStr}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "linear-gradient(135deg,#3a6ea5,#6aa0d8)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {ini(profile.name)}
            </div>
            <div>
              <div style={{ fontWeight: 650, fontSize: 13.5 }}>
                {profile.name}
              </div>
              <div style={{ fontSize: 11, color: "#9a9a92" }}>
                {profile.title} · {profile.role}
              </div>
              <div style={{ fontSize: 11, color: "#9a9a92" }}>
                {profile.email}
              </div>
            </div>
            <button
              onClick={() => signOut().then(() => router.push("/login"))}
              style={{
                marginLeft: 8,
                border: "1px solid #e2ddd0",
                background: "#faf9f6",
                borderRadius: 8,
                padding: "6px 10px",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Sign out
            </button>
          </div>
        </div>

        {role === "Admin" && (
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              placeholder="Search anything — a name, email, phone, location, hiring manager, skill, department, or status…"
              style={{
                flex: 1,
                padding: "10px 13px",
                border: "1px solid #e2ddd0",
                borderRadius: 10,
                background: "#faf9f6",
              }}
            />
            <button
              onClick={doSearch}
              style={{
                background: "#6b5ce7",
                color: "#fff",
                border: 0,
                borderRadius: 8,
                padding: "8px 16px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Search
            </button>
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginTop: 12,
            flexWrap: "wrap",
          }}
        >
          <nav style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  border: 0,
                  background: tab === t.id ? "#f0edff" : "transparent",
                  borderBottom:
                    tab === t.id
                      ? "2px solid #6b5ce7"
                      : "2px solid transparent",
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 13.5,
                  color: tab === t.id ? "#6b5ce7" : "#444",
                }}
              >
                {t.label}
              </button>
            ))}
          </nav>
          <div style={{ flex: 1 }} />
          {role === "Admin" && (
            <button
              onClick={() => setBias((b) => !b)}
              style={{
                border: "1px solid #e2ddd0",
                background: bias ? "#eef3f8" : "#fff",
                borderRadius: 20,
                padding: "6px 12px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Bias guard {bias ? "On" : "Off"}
            </button>
          )}
          {(role === "HiringManager" || role === "Admin") && (
            <button
              onClick={openNewReq}
              style={{
                background: "#6b5ce7",
                color: "#fff",
                border: 0,
                borderRadius: 9,
                padding: "8px 14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              + New requisition
            </button>
          )}
        </div>
        {(msg || error) && (
          <div
            style={{
              marginTop: 8,
              background: "#fff7ec",
              border: "1px solid #f0d9b0",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 13,
              color: "#8a5a00",
            }}
          >
            {msg || error}{" "}
            <button
              onClick={() => setMsg(null)}
              style={{
                border: 0,
                background: "transparent",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        )}
      </header>

      <main style={{ flex: 1, padding: 16, overflow: "auto" }}>
        {tab === "today" && (
          <TodayView
            data={today}
            bias={bias}
            onReq={openPipeline}
            onCand={openCandidate}
          />
        )}
        {tab === "requisitions" && (
          <ReqBoard reqs={reqs} onOpen={openPipeline} role={role!} />
        )}
        {tab === "approvals" && (
          <ApprovalsView
            list={approvals}
            apiFetch={apiFetch}
            onOpen={openPipeline}
            onDone={() => {
              loadApprovals();
              loadReqs();
              setMsg("Decision saved.");
            }}
          />
        )}
        {tab === "schedule" && (
          <ScheduleView
            key={
              schedulePrefill
                ? `${schedulePrefill.reqId}-${schedulePrefill.candidateId}-${schedulePrefill.roundIndex}`
                : "schedule"
            }
            reqs={reqs.filter((r) => r.status === "Approved")}
            apiFetch={apiFetch}
            initialReqId={schedulePrefill?.reqId}
            initialCandidateId={schedulePrefill?.candidateId}
            initialRoundIndex={schedulePrefill?.roundIndex}
            onDone={() => {
              setMsg("Interview scheduled.");
              setSchedulePrefill(null);
            }}
          />
        )}
        {(tab === "dashboard" || tab === "analytics") && (
          <AnalyticsView data={analytics} />
        )}
        {tab === "team" && (
          <TeamView users={team} apiFetch={apiFetch} onRefresh={loadTeam} />
        )}
      </main>

      {overlay && (
        <div
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              maxWidth: 920,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 24,
              boxShadow: "0 24px 64px rgba(20,30,50,.30)",
              position: "relative",
            }}
          >
            <button
              onClick={closeModal}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: 0,
                background: "rgba(241,239,232,.95)",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              ✕
            </button>
            {panel}
          </div>
        </div>
      )}
    </div>
  );
}
