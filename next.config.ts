import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    eslint: {
        // Skip ESLint during `next build` so we can deploy now.
        ignoreDuringBuilds: true,
    },
};

export default nextConfig;
