import { drizzle } from "drizzle-orm/postgres-js";
import type { Logger } from "drizzle-orm/logger";
import postgres from "postgres";
import * as schema from "./schema";

const isDebug = process.env.DEBUG_SQL === "true" || process.env.DEBUG === "true";

const logger: Logger = {
  logQuery(query: string, params: unknown[]) {
    if (isDebug) {
      console.debug("[SQL]", query);
      if (params.length > 0) console.debug("[SQL params]", params);
    }
  },
};

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema, logger });
