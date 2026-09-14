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
    return onAuthStateChanged(auth, async (u) => {
      setFirebaseUser(u);
      if (u) {
        const t = await u.getIdToken();
        setToken(t);
      } else {
        setToken(null);
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (token) refreshProfile();
  }, [token, refreshProfile]);

  const signInGoogle = useCallback(async () => {
    const auth = getClientAuth();
    if (!auth) throw new Error("Firebase is not configured.");
    await signInWithPopup(auth, googleProvider);
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
