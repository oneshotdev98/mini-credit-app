import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep pdf.js out of the dev bundle so worker imports resolve on disk (Turbopack).
  serverExternalPackages: [
    "pdf-parse",
    "pdfjs-dist",
    "@napi-rs/canvas",
  ],
};

export default nextConfig;
