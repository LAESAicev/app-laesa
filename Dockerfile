# syntax=docker/dockerfile:1
# Imagem do site da LAESA: páginas pré-geradas + servidor Node para /api/* e /avisos/*.
# Variáveis PUBLIC_* e SITE_URL entram no build (ficam no HTML); segredos (SMTP_*, INSCRICAO_SECRET, KEYSTATIC_*)
# só em tempo de execução, pelo ambiente do contêiner. Nada de .env dentro da imagem (.dockerignore).

FROM node:24-slim AS base
WORKDIR /app
ENV ASTRO_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM deps AS build
COPY . .
ARG SITE_URL
ARG PUBLIC_CONTACT_EMAIL
ARG PUBLIC_INSTAGRAM_URL
ARG PUBLIC_LINKEDIN_URL
ARG PUBLIC_GITHUB_URL
# Painel em produção (modo GitHub): só o repositório e o slug do GitHub App, que são públicos. Vazio = sem painel.
ARG PUBLIC_KEYSTATIC_GITHUB_REPO
ARG PUBLIC_KEYSTATIC_GITHUB_APP_SLUG
# 0 por padrão: só confiar em X-Forwarded-For atrás de um proxy que o sobrescreve (o compose e o CI passam 1)
ARG TRUST_PROXY=0
ENV SITE_URL=$SITE_URL \
    PUBLIC_CONTACT_EMAIL=$PUBLIC_CONTACT_EMAIL \
    PUBLIC_INSTAGRAM_URL=$PUBLIC_INSTAGRAM_URL \
    PUBLIC_LINKEDIN_URL=$PUBLIC_LINKEDIN_URL \
    PUBLIC_GITHUB_URL=$PUBLIC_GITHUB_URL \
    PUBLIC_KEYSTATIC_GITHUB_REPO=$PUBLIC_KEYSTATIC_GITHUB_REPO \
    PUBLIC_KEYSTATIC_GITHUB_APP_SLUG=$PUBLIC_KEYSTATIC_GITHUB_APP_SLUG \
    TRUST_PROXY=$TRUST_PROXY
RUN test -n "$SITE_URL" && test -n "$PUBLIC_CONTACT_EMAIL" || (echo 'defina SITE_URL e PUBLIC_CONTACT_EMAIL (build args)' >&2; exit 1)
RUN npx astro build

FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321 \
    INSCRITOS_STORE=sqlite \
    INSCRITOS_DB=/data/laesa.db
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 4321
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4321/').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/server/entry.mjs"]
