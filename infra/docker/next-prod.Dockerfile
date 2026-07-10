# Production Dockerfile for Next.js apps (multi-stage build)
# Builds the app and serves via `next start` (no dev server)

FROM node:22-alpine AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache libc6-compat \
    && corepack enable \
    && corepack prepare pnpm@10.33.2 --activate

WORKDIR /app

# ── Stage 1: Install deps ──
FROM base AS deps

COPY pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./

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

# ── Stage 2: Build ──
FROM deps AS builder

COPY packages ./packages
COPY apps/landing            ./apps/landing
COPY apps/exam-platform-web  ./apps/exam-platform-web
COPY apps/data-engine-web    ./apps/data-engine-web

ARG APP_NAME
ARG NEXT_PUBLIC_AUTH_API
ARG NEXT_PUBLIC_DATA_API
ARG NEXT_PUBLIC_EXAM_API
ARG NEXT_PUBLIC_LANDING_URL
ARG NEXT_PUBLIC_EXAM_WEB_URL
ARG NEXT_PUBLIC_ADMIN_WEB_URL

ENV NEXT_PUBLIC_AUTH_API=${NEXT_PUBLIC_AUTH_API}
ENV NEXT_PUBLIC_DATA_API=${NEXT_PUBLIC_DATA_API}
ENV NEXT_PUBLIC_EXAM_API=${NEXT_PUBLIC_EXAM_API}
ENV NEXT_PUBLIC_LANDING_URL=${NEXT_PUBLIC_LANDING_URL}
ENV NEXT_PUBLIC_EXAM_WEB_URL=${NEXT_PUBLIC_EXAM_WEB_URL}
ENV NEXT_PUBLIC_ADMIN_WEB_URL=${NEXT_PUBLIC_ADMIN_WEB_URL}

RUN pnpm --filter ${APP_NAME} build

# ── Stage 3: Production runner ──
FROM base AS runner

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

WORKDIR /app

# Copy built output
COPY --from=builder /app ./

USER nextjs

ARG APP_PORT=3000
ENV PORT=${APP_PORT}
EXPOSE ${APP_PORT}

ARG APP_NAME
ENV APP_NAME=${APP_NAME}
CMD ["sh", "-c", "pnpm --filter ${APP_NAME} start"]
