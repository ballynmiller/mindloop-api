# mindloop-api — runtime expects these environment variables (set via `docker run -e`, Compose
# `environment` / `env_file`, or your orchestrator). Do not commit real secrets into the image.
#
# Required (production):
#   DATABASE_URL       — Postgres URL, or Prisma Accelerate URL (prisma+postgres://…)
#   DIRECT_URL         — Direct postgres:// URL for the `pg` driver (required when DATABASE_URL is prisma+)
#   JWT_SECRET         — Strong secret for signing access/refresh JWTs
#
# Optional:
#   PORT               — Listen port (default 3000)
#   HOST               — Bind address (default 0.0.0.0)
#   LOG_LEVEL          — e.g. info, debug (default info in production)
#   GOOGLE_MAPS_API_KEY / GOOGLE_PLACES_API_KEY — Walking matrix, optional seed/image scripts

# Default: Docker Hub. If metadata/pull fails, build with:
#   NODE_IMAGE=public.ecr.aws/docker/library/node:22-bookworm-slim
ARG NODE_IMAGE=node:22-bookworm-slim
FROM ${NODE_IMAGE} AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm prisma generate
RUN pnpm run build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/dist ./dist
COPY --from=build /app/generated ./generated
COPY --from=build /app/prisma ./prisma

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/src/app.js"]
