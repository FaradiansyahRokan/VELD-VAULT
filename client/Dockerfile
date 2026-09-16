# Multi-stage Dockerfile for Next.js Client
FROM node:20-alpine AS base

# Stage 1: Install dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time environment variables for Next.js public config
ARG NEXT_PUBLIC_RPC_URL
ARG NEXT_PUBLIC_CONTRACT_ADDRESS
ARG NEXT_PUBLIC_IPFS_URL
ARG NEXT_PUBLIC_IPFS_GATEWAY
ARG NEXT_PUBLIC_CHAIN_ID
ARG NEXT_PUBLIC_NETWORK_NAME
ARG NEXT_PUBLIC_TOKEN_SYMBOL
ARG NEXT_PUBLIC_TOKEN_NAME
ARG NEXT_PUBLIC_EXPLORER_URL

ENV NEXT_PUBLIC_RPC_URL=${NEXT_PUBLIC_RPC_URL}
ENV NEXT_PUBLIC_CONTRACT_ADDRESS=${NEXT_PUBLIC_CONTRACT_ADDRESS}
ENV NEXT_PUBLIC_IPFS_URL=${NEXT_PUBLIC_IPFS_URL}
ENV NEXT_PUBLIC_IPFS_GATEWAY=${NEXT_PUBLIC_IPFS_GATEWAY}
ENV NEXT_PUBLIC_CHAIN_ID=${NEXT_PUBLIC_CHAIN_ID}
ENV NEXT_PUBLIC_NETWORK_NAME=${NEXT_PUBLIC_NETWORK_NAME}
ENV NEXT_PUBLIC_TOKEN_SYMBOL=${NEXT_PUBLIC_TOKEN_SYMBOL}
ENV NEXT_PUBLIC_TOKEN_NAME=${NEXT_PUBLIC_TOKEN_NAME}
ENV NEXT_PUBLIC_EXPLORER_URL=${NEXT_PUBLIC_EXPLORER_URL}

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# Stage 3: Production runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy static and standalone build outputs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
