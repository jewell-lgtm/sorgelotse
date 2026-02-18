FROM oven/bun:1
WORKDIR /app

COPY package.json bun.lock* bunfig.toml ./
COPY apps/admin/package.json apps/admin/
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile || bun install

COPY packages/shared packages/shared
COPY apps/api/src apps/api/src
COPY apps/api/tsconfig.json apps/api/tsconfig.json
COPY apps/admin apps/admin
COPY tsconfig.json ./

RUN cd apps/admin && bun run build

ENV HOST=0.0.0.0
ENV PORT=4321
EXPOSE 4321

CMD ["node", "apps/admin/dist/server/entry.mjs"]
