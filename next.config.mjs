import { withBotId } from "botid/next/config";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow a separate local output directory when the shared .next folder is locked.
  distDir: process.env.NEXT_BUILD_DIR || ".next",
};

export default withBotId(nextConfig);
