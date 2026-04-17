import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep pdf.js out of the dev bundle so worker imports resolve on disk (Turbopack).
  serverExternalPackages: ["pdfjs-dist"],
};

export default nextConfig;
