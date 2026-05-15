# ---------- Stage 1: build the React frontend ----------
FROM node:20-slim AS web
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
COPY public ./public
RUN npm run build          # -> /app/dist

# ---------- Stage 2: backend runtime ----------
FROM node:20-slim
# Prisma needs openssl; node-gyp deps not required for Prisma engines
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
# generate Prisma client for the container platform
RUN npx prisma generate

# built SPA served by Fastify @fastify/static
COPY --from=web /app/dist ./public

ENV NODE_ENV=production
ENV PORT=8080
ENV DATABASE_URL=file:/data/invoicing.sqlite
VOLUME /data
EXPOSE 8080

# Apply migrations then start (idempotent; safe on every boot)
CMD ["sh", "-c", "npx prisma migrate deploy && node index.js"]
