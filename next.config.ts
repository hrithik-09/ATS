import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "firebase-admin",
    "googleapis",
    "googleapis-common",
    "google-auth-library",
  ],
};

export default nextConfig;
