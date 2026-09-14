"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import {
  getClientAuth,
  googleProvider,
  isFirebaseClientConfigured,
} from "@/lib/firebaseClient";
import type { AppUser } from "@/lib/types";

type AuthState = {
  firebaseUser: User | null;
  profile: AppUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>;
  refreshProfile: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

async function fetchMe(token: string) {
  const res = await fetch("/api/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to load profile");
  return data as { user: AppUser; org: { company: string } };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!token) {
      setProfile(null);
      return;
    }
    try {
      const data = await fetchMe(token);
      setProfile(data.user);
      setError(null);
    } catch (e) {
      setProfile(null);
      setError(e instanceof Error ? e.message : "Profile error");
    }
  }, [token]);

  useEffect(() => {
    if (!isFirebaseClientConfigured()) {
      setError("Firebase client is not configured.");
      setLoading(false);
      return;
    }
    const auth = getClientAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    // Stay in loading until Firebase session + /api/me are both settled,
    // so /app never redirects to /login mid-restore (avoids login flicker).
    return onAuthStateChanged(auth, async (u) => {
      setFirebaseUser(u);
      if (!u) {
        setToken(null);
        setProfile(null);
        setError(null);
        setLoading(false);
        return;
      }
      try {
        const t = await u.getIdToken();
        setToken(t);
        const data = await fetchMe(t);
        setProfile(data.user);
        setError(null);
      } catch (e) {
        setToken(null);
        setProfile(null);
        setError(e instanceof Error ? e.message : "Profile error");
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const signInGoogle = useCallback(async () => {
    const auth = getClientAuth();
    if (!auth) throw new Error("Firebase is not configured.");
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // Profile is loaded by onAuthStateChanged; keep loading until then.
    } catch (e) {
      setLoading(false);
      throw e;
    }
  }, []);

  const signOut = useCallback(async () => {
    setToken(null);
    setProfile(null);
    const auth = getClientAuth();
    if (auth) await fbSignOut(auth);
  }, []);

  const apiFetch = useCallback(
    async (path: string, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (token) headers.set("Authorization", `Bearer ${token}`);
      return fetch(path, { ...init, headers });
    },
    [token]
  );

  const value = useMemo(
    () => ({
      firebaseUser,
      profile,
      token,
      loading,
      error,
      signInGoogle,
      signOut,
      apiFetch,
      refreshProfile,
    }),
    [
      firebaseUser,
      profile,
      token,
      loading,
      error,
      signInGoogle,
      signOut,
      apiFetch,
      refreshProfile,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside provider");
  return v;
}

/** Full-page boot while session restores or sign-in completes. */
export function AuthBootScreen({
  message = "Getting things ready",
  detail = "Restoring your session…",
}: {
  message?: string;
  detail?: string;
}) {
  return (
    <div className="ats-boot" role="status" aria-live="polite" aria-busy="true">
      <div className="ats-boot-card">
        <div className="ats-boot-mark-wrap">
          <div className="ats-boot-ring" aria-hidden />
          <div className="ats-boot-mark">TA</div>
        </div>
        <div>
          <p className="ats-boot-title">{message}</p>
          <p className="ats-boot-sub">{detail}</p>
        </div>
        <div className="ats-boot-track" aria-hidden>
          <div className="ats-boot-bar" />
        </div>
        <div className="ats-boot-dots" aria-hidden>
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
