"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthBootScreen, useAuth } from "@/components/AuthProvider";
import "./auth.css";

function RouteArt() {
  return (
    <svg className="lt-route" viewBox="0 0 520 520" aria-hidden>
      <circle
        cx="260"
        cy="260"
        r="210"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="1"
        fill="none"
      />
      <circle
        cx="260"
        cy="260"
        r="150"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth="1"
        fill="none"
      />
      <path d="M70 340 C140 220, 200 180, 260 250 S380 360, 460 200" />
      <path
        d="M90 180 C170 140, 230 300, 310 280 S420 180, 470 300"
        opacity="0.55"
      />
      <circle cx="70" cy="340" r="6" fill="#e8f2ec" />
      <circle cx="460" cy="200" r="6" fill="#9ec4e8" />
    </svg>
  );
}

export default function Home() {
  const { loading, token, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && token && profile) router.replace("/app");
  }, [loading, token, profile, router]);

  if (loading || (token && profile)) {
    return (
      <AuthBootScreen
        message={token && profile ? "Opening your workspace" : "Getting things ready"}
        detail={
          token && profile
            ? "Taking you to the ATS…"
            : "Restoring your session…"
        }
      />
    );
  }

  return (
    <div className="lt-auth-shell">
      <div className="lt-auth-inner">
        <nav className="lt-nav">
          <Link href="/" className="lt-brand">
            <div className="lt-mark">TA</div>
            <div>
              <div className="lt-brand-name">
                Talent Acquisition
                <span className="lt-chip">ATS</span>
              </div>
              <div className="lt-brand-sub">Applicant Tracking</div>
            </div>
          </Link>
          <Link href="/login" className="lt-nav-cta">
            Sign in
          </Link>
        </nav>

        <section className="lt-hero">
          <div className="lt-hero-copy">
            <h1>Hire with clarity across departments.</h1>
            <p>
              Hiring managers raise requisitions. Department heads approve.
              Admins run the pipeline — on one shared URL.
            </p>
            <div className="lt-cta-row">
              <Link href="/login" className="lt-btn lt-btn-primary">
                Continue with Google
              </Link>
              <Link href="/app" className="lt-btn lt-btn-ghost">
                Open app
              </Link>
            </div>
          </div>
          <div className="lt-hero-visual" aria-hidden>
            <RouteArt />
          </div>
        </section>
      </div>
    </div>
  );
}
