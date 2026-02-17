import { Effect } from "effect";

export const HealthCheck = Effect.succeed({ status: "ok" as const });
