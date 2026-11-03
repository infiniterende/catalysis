# The web app as a container, for Cloud Run.
#   gcloud run deploy catalysis-web --source . --region us-east4
# Secrets (DATABASE_URL, OPENAI_API_KEY) are given to the service at run time, never built in.

FROM node:24-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable

FROM base AS build
WORKDIR /app
COPY . .
# Only the web app and the packages it uses; the parked mobile app stays out.
RUN pnpm install --frozen-lockfile --filter "@catalysis/web..."
RUN pnpm --filter @catalysis/web build

FROM base AS run
WORKDIR /app
ENV NODE_ENV=production PORT=8080 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public
USER node
EXPOSE 8080
CMD ["node", "apps/web/server.js"]
