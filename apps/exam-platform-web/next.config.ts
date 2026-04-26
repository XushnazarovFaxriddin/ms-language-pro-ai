import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const config: NextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  transpilePackages: ["@languagepro/ui", "@languagepro/contracts", "@languagepro/i18n"],
};

export default withNextIntl(config);
