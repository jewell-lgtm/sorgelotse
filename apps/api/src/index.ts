import { db } from "./db";
import { createApp } from "./routes";

const app = createApp(db).listen(process.env.API_PORT || 6701);

console.log(`API running on port ${app.server?.port}`);

export type { App } from "./routes";
export type {
  RpcSuccess,
  RpcFailure,
  RpcResponse,
  InternalError,
} from "./lib/rpc";
