import path from "node:path";
import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // This app lives in a nested checkout and shares dependencies with the
  // workspace root, which also contains a package-lock.json.
  outputFileTracingRoot: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
};

export default nextConfig;
