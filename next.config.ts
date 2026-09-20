import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // pdfkit reads its standard-font metrics from disk at runtime; keep it out of
  // the server bundle so those files resolve from node_modules (C5 invoice PDFs).
  serverExternalPackages: ["pdfkit"],
  images: { qualities: [75, 85, 86, 88, 90] },
  // This machine is memory-constrained (background processes have been OOM-killed
  // by the host during this session). Next's internal jest-worker pool (used for
  // image optimization and other parallel jobs) was spawning enough concurrent
  // child processes to crash under memory pressure, surfacing as
  // "Jest worker encountered N child process exceptions, exceeding retry limit"
  // in the dev overlay. Scaling worker count to available memory instead of CPU
  // count, and capping it, keeps that pool from exhausting memory.
  experimental: {
    cpus: 2,
    memoryBasedWorkersCount: true,
  },
};

export default nextConfig;
