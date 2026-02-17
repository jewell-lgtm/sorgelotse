import { pgTable, uuid, text, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { instant } from "./columns";

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(),
  aggregateType: text("aggregate_type").notNull(),
  aggregateId: uuid("aggregate_id").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: instant("created_at").default(sql`now()`).notNull(),
  processedAt: instant("processed_at"),
});
