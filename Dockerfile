FROM oven/bun:1.1-alpine
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile
COPY . .
RUN bun run build:script
EXPOSE 3000
CMD ["bun", "src/index.ts"]
