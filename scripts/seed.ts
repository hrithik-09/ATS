/**
 * Seed Firestore users + org.
 * Usage: npx tsx scripts/seed.ts
 * Requires FIREBASE_ADMIN_* env vars (or FIREBASE_ADMIN_CREDENTIALS_PATH).
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, "");
    }
  }
}

async function main() {
  loadEnv();
  const { ensureSeedUsers } = await import("../src/lib/db");
  await ensureSeedUsers();
  console.log("Seeded users + org in Firestore.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
