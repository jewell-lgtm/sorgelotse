import type { InternalError } from "./rpc-types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => any;

/** Extract the input/params type from an Eden endpoint */
export type EndpointInput<T extends AnyFn> = NonNullable<Parameters<T>[0]>;

/** Extract the full Eden result type */
type EndpointResult<T extends AnyFn> = Awaited<ReturnType<T>>;

/** Extract the RPC response type (the data property from Eden result) */
type RpcResult<T extends AnyFn> = NonNullable<EndpointResult<T>["data"]>;

/** Extract the success data type from an RPC endpoint */
export type EndpointData<T extends AnyFn> = Extract<
  RpcResult<T>,
  { ok: true }
>["data"];

/** Extract the error type from an RPC endpoint (includes InternalError) */
export type EndpointError<T extends AnyFn> =
  | Extract<RpcResult<T>, { ok: false }>["error"]
  | InternalError;
