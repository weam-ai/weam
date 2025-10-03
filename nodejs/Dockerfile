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
RUN apk add --no-cache nodejs npm git docker-cli bash
COPY --from=builder /node_modules /node_modules

WORKDIR /usr/src/app
COPY . .
EXPOSE 4050
EXPOSE 3006
CMD ["node", "index.js"]