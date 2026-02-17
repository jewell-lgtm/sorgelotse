export type RpcSuccess<T> = { ok: true; data: T };
export type RpcFailure<E = unknown> = { ok: false; error: E };
export type RpcResponse<T, E = unknown> = RpcSuccess<T> | RpcFailure<E>;
export type InternalError = { _tag: "InternalError" };
