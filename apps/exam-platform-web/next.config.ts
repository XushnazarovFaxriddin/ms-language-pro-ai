import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  transpilePackages: ["@languagepro/ui", "@languagepro/contracts", "@languagepro/i18n"],
};

export default config;
