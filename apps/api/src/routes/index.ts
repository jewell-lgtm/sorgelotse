import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { type DatabaseClient } from "../services";
import { createRpc } from "../lib/rpc";
import { HealthCheck } from "../mutations/health/HealthCheck";

export function createApp(db: DatabaseClient) {
  const rpc = createRpc(db);

  const app = new Elysia()
    .use(cors())
    .onError(({ error, set }) => {
      console.error("[Elysia Error]", error);
      set.status = 500;
      return {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : String(error),
      };
    })
    .get("/", () => ({ name: "Sorgelotse API", version: "1.0.0" }))
    .get("/health", () => ({ status: "ok" }))
    .use(rpc("healthCheck", () => HealthCheck));

  return app;
}

export type App = ReturnType<typeof createApp>;
