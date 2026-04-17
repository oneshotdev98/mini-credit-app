import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfjs-dist", "@thednp/dommatrix"],
};

export default nextConfig;
