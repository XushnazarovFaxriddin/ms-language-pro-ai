# Single dev Dockerfile reused by landing, exam-platform-web, data-engine-web.
# The compose service overrides `command:` to select which app's `dev` script runs.

FROM node:22-alpine

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache libc6-compat \
    && corepack enable \
    && corepack prepare pnpm@10.33.2 --activate

WORKDIR /app

# Workspace metadata first for layer caching
COPY pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

# Per-package manifests (paths must match pnpm-workspace.yaml entries)
COPY apps/landing/package.json            ./apps/landing/package.json
COPY apps/exam-platform-web/package.json  ./apps/exam-platform-web/package.json
COPY apps/data-engine-web/package.json    ./apps/data-engine-web/package.json
COPY packages/config-eslint/package.json  ./packages/config-eslint/package.json
COPY packages/config-tailwind/package.json ./packages/config-tailwind/package.json
COPY packages/config-tsconfig/package.json ./packages/config-tsconfig/package.json
COPY packages/contracts/package.json      ./packages/contracts/package.json
COPY packages/i18n/package.json           ./packages/i18n/package.json
COPY packages/ui/package.json             ./packages/ui/package.json

RUN pnpm install --frozen-lockfile

# Source after deps so code edits don't bust the dep cache layer
COPY packages ./packages
COPY apps/landing            ./apps/landing
COPY apps/exam-platform-web  ./apps/exam-platform-web
COPY apps/data-engine-web    ./apps/data-engine-web

# Default command — compose overrides per service
CMD ["pnpm", "--filter", "landing", "dev"]
