FROM oven/bun:1
WORKDIR /app

COPY package.json bun.lock* bunfig.toml ./
COPY apps/care-provider/package.json apps/care-provider/
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile || bun install

COPY packages/shared packages/shared
COPY apps/api/src apps/api/src
COPY apps/api/tsconfig.json apps/api/tsconfig.json
COPY apps/care-provider apps/care-provider
COPY tsconfig.json ./

RUN cd apps/care-provider && bun run build

ENV HOST=0.0.0.0
ENV PORT=4322
EXPOSE 4322

CMD ["node", "apps/care-provider/dist/server/entry.mjs"]
