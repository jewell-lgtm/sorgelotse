FROM oven/bun:1
WORKDIR /app

COPY package.json bun.lock* bunfig.toml ./
COPY apps/care-recipient/package.json apps/care-recipient/
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN bun install --frozen-lockfile || bun install

COPY packages/shared packages/shared
COPY apps/api/src apps/api/src
COPY apps/api/tsconfig.json apps/api/tsconfig.json
COPY apps/care-recipient apps/care-recipient
COPY tsconfig.json ./

RUN cd apps/care-recipient && bun run build

ENV HOST=0.0.0.0
ENV PORT=4323
EXPOSE 4323

CMD ["node", "apps/care-recipient/dist/server/entry.mjs"]
