import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root to this project — an unrelated lockfile at the
  // user's home directory would otherwise make Next.js infer the wrong root.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
