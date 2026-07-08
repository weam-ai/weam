# Multi-stage build for smaller production image
FROM node:20-alpine AS builder

RUN npm install -g pnpm
RUN apk add --no-cache make gcc g++ python3
COPY package.json pnpm-lock.yaml ./
COPY .npmrc ./
# Install all dependencies (including devDependencies)
RUN pnpm install
RUN npm rebuild bcrypt --build-from-source
RUN apk del make gcc g++ python3

# Production stage with minimal Alpine
FROM alpine:3.19
RUN apk add --no-cache nodejs npm git docker-cli bash curl \
    && ARCH="$(uname -m)" \
    && case "$ARCH" in x86_64) COMPOSE_ARCH=x86_64 ;; aarch64|arm64) COMPOSE_ARCH=aarch64 ;; *) COMPOSE_ARCH=x86_64 ;; esac \
    && curl -fsSL "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-linux-${COMPOSE_ARCH}" -o /usr/local/bin/docker-compose \
    && chmod +x /usr/local/bin/docker-compose
COPY --from=builder /node_modules /node_modules

WORKDIR /usr/src/app
COPY . .
EXPOSE 4050
EXPOSE 3006
CMD ["node", "index.js"]