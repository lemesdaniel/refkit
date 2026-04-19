FROM oven/bun:1.1-alpine AS builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build:script

FROM oven/bun:1.1-alpine
WORKDIR /app
COPY --from=builder /app .
EXPOSE 3000
CMD ["bun", "src/index.ts"]
