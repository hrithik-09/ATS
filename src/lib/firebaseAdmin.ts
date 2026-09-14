import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function loadServiceAccount(): ServiceAccount | null {
  const pathEnv = process.env.FIREBASE_ADMIN_CREDENTIALS_PATH;
  if (pathEnv) {
    const full = resolve(process.cwd(), pathEnv);
    if (existsSync(full)) {
      const json = JSON.parse(readFileSync(full, "utf8")) as {
        project_id: string;
        client_email: string;
        private_key: string;
      };
      return {
        projectId: json.project_id,
        clientEmail: json.client_email,
        privateKey: json.private_key,
      };
    }
  }
  if (
    process.env.FIREBASE_ADMIN_PROJECT_ID &&
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
    process.env.FIREBASE_ADMIN_PRIVATE_KEY
  ) {
    return {
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(
        /\\n/g,
        "\n"
      ),
    };
  }
  return null;
}

let adminApp: App | null = null;

export function getAdminApp(): App | null {
  const sa = loadServiceAccount();
  if (!sa) return null;
  if (adminApp) return adminApp;
  if (getApps().length) {
    adminApp = getApps()[0]!;
    return adminApp;
  }
  adminApp = initializeApp({
    credential: cert(sa),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
  return adminApp;
}

export function adminAuth() {
  const app = getAdminApp();
  return app ? getAuth(app) : null;
}

export function adminDb() {
  const app = getAdminApp();
  if (!app) return null;
  const db = getFirestore(app);
  try {
    db.settings({ ignoreUndefinedProperties: true });
  } catch {
    // settings may only be called once per app
  }
  return db;
}

export function requireAdminDb(): Firestore {
  const db = adminDb();
  if (!db) {
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_ADMIN_CREDENTIALS_PATH or FIREBASE_ADMIN_* env vars."
    );
  }
  return db;
}

export function adminStorage() {
  const app = getAdminApp();
  return app ? getStorage(app) : null;
}
