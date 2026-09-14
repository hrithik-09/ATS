import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "firebase-admin",
    "googleapis",
    "googleapis-common",
    "google-auth-library",
    "jose",
    "jwks-rsa",
  ],
};

export default nextConfig;
