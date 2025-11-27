import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
   compiler: {
        removeConsole: process.env.NEXT_ENV === 'production',
    },
};

export default nextConfig;
