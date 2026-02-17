import { query } from "./Database";
import { messages } from "../db/schema";

export const publishMessage = (msg: {
  type: string;
  aggregateType: string;
  aggregateId: string;
  payload: unknown;
}) => query((db) => db.insert(messages).values(msg));
