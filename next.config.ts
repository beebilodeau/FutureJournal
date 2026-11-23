import type { NextConfig } from "next";

// Static export: the whole app runs in the browser for now (entries live in
// localStorage), so it can be hosted anywhere. Drop `output` when adding
// server features such as Supabase auth callbacks.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
