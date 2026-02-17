import { Elysia, t, type TSchema } from "elysia";
import { Effect, Exit, Cause, Logger, Layer, Data } from "effect";
import { serializeError, type SerializedError } from "./serialize";
import {
  Transaction,
  asTransaction,
  Clock,
  LiveClock,
  IdGenerator,
  LiveIdGenerator,
  type DatabaseClient,
} from "../services";

// =============================================================================
// RPC Response Types
// =============================================================================

export type RpcSuccess<T> = { ok: true; data: T };
export type RpcFailure<E = unknown> = { ok: false; error: E };
export type RpcResponse<T, E = unknown> = RpcSuccess<T> | RpcFailure<E>;

// =============================================================================
// Transaction Error
// =============================================================================

export class TransactionError extends Data.TaggedError("TransactionError")<{
  cause: unknown;
}> {}

export type InternalError = { _tag: "InternalError" };

// =============================================================================
// Error Mapping
// =============================================================================

function getHttpStatus(error: unknown): number {
  if (error && typeof error === "object" && "_tag" in error) {
    const tag = (error as { _tag: string })._tag;
    if (tag.endsWith("NotFoundError")) return 404;
    if (tag.includes("Already") || tag.includes("Exists") || tag.includes("Conflict")) return 409;
    if (tag.includes("Validation") || tag.includes("Policy") || tag.includes("Mismatch")) return 400;
    if (tag.includes("NotOwned") || tag.includes("NotAllowed") || tag.includes("Forbidden")) return 403;
    if (tag.includes("Provider")) return 502;
    if (tag === "DatabaseError" || tag === "TransactionError") return 500;
    return 400;
  }
  return 500;
}

function isInternalError(error: unknown): boolean {
  if (error && typeof error === "object" && "_tag" in error) {
    const tag = (error as { _tag: string })._tag;
    return tag === "DatabaseError" || tag === "TransactionError";
  }
  return true;
}

// =============================================================================
// Transaction Combinator
// =============================================================================

export const withTransaction = <A, E>(
  db: DatabaseClient,
  effect: Effect.Effect<A, E, RpcServices>,
  services: Layer.Layer<Clock | IdGenerator>,
): Effect.Effect<A, E | TransactionError, never> =>
  Effect.tryPromise({
    try: () =>
      db.transaction(async (tx) => {
        const program = effect.pipe(
          Effect.provideService(
            Transaction,
            asTransaction(tx as DatabaseClient),
          ),
          Effect.provide(services),
        );
        const exit = await Effect.runPromiseExit(program);
        if (Exit.isFailure(exit)) {
          const error = Cause.failureOption(exit.cause);
          if (error._tag === "Some") throw error.value;
          throw Cause.squash(exit.cause);
        }
        return exit.value;
      }),
    catch: (cause) => {
      if (cause && typeof cause === "object" && "_tag" in cause) {
        return cause as E;
      }
      return new TransactionError({ cause }) as E | TransactionError;
    },
  }) as Effect.Effect<A, E | TransactionError, never>;

// =============================================================================
// Logging
// =============================================================================

function makeRpcLogger(rpcName: string) {
  return Logger.make(({ logLevel, message }) => {
    const level = logLevel._tag;
    const msg =
      typeof message === "string" ? message : JSON.stringify(message);
    const prefix = `[${rpcName}]`;
    if (level === "Error" || level === "Fatal") console.error(prefix, msg);
    else if (level === "Warning") console.warn(prefix, msg);
    else if (level === "Debug") {
      if (process.env.NODE_ENV !== "production") console.debug(prefix, msg);
    } else console.log(prefix, msg);
  });
}

// =============================================================================
// Service Layer
// =============================================================================

const LiveServices = Layer.mergeAll(LiveClock, LiveIdGenerator);

// =============================================================================
// Required Services Type
// =============================================================================

export type RpcServices = Transaction | Clock | IdGenerator;

// =============================================================================
// Run RPC Effect Helper
// =============================================================================

export async function runRpcEffect<TOutput, TError, TErrorDTO extends object>(
  db: DatabaseClient,
  name: string,
  effect: Effect.Effect<TOutput, TError, RpcServices>,
  set: { status?: number | string },
): Promise<RpcResponse<TOutput, TErrorDTO | InternalError>> {
  const startTime = Date.now();

  const program = withTransaction(db, effect, LiveServices).pipe(
    Effect.provide(Logger.replace(Logger.defaultLogger, makeRpcLogger(name))),
  );

  const exit = await Effect.runPromiseExit(program);
  const duration = Date.now() - startTime;

  if (Exit.isFailure(exit)) {
    const error = Cause.failureOption(exit.cause);
    const errorValue =
      error._tag === "Some" ? error.value : Cause.squash(exit.cause);

    set.status = getHttpStatus(errorValue);
    const tag =
      errorValue && typeof errorValue === "object" && "_tag" in errorValue
        ? (errorValue as { _tag: string })._tag
        : "UnknownError";
    console.error(`[${name}] Failed (${duration}ms):`, tag);

    if (isInternalError(errorValue)) {
      return { ok: false, error: { _tag: "InternalError" } as InternalError };
    }
    return {
      ok: false,
      error: serializeError(errorValue as object) as TErrorDTO,
    };
  }

  console.log(`[${name}] OK (${duration}ms)`);
  return { ok: true, data: exit.value };
}

// =============================================================================
// RPC Definition
// =============================================================================

export function createRpc(db: DatabaseClient) {
  function rpc<TSchema extends { static: unknown }, TOutput, TError>(
    name: string,
    inputSchema: TSchema,
    handler: (
      input: TSchema["static"],
    ) => Effect.Effect<TOutput, TError, RpcServices>,
  ): Elysia;
  function rpc<TOutput, TError>(
    name: string,
    handler: () => Effect.Effect<TOutput, TError, RpcServices>,
  ): Elysia;
  function rpc(
    name: string,
    inputOrHandler:
      | { static: unknown }
      | (() => Effect.Effect<unknown, unknown, RpcServices>),
    maybeHandler?: (
      input: unknown,
    ) => Effect.Effect<unknown, unknown, RpcServices>,
  ): Elysia {
    const hasInput = typeof inputOrHandler !== "function";
    const inputSchema = hasInput ? (inputOrHandler as TSchema) : undefined;
    const handler = hasInput
      ? (maybeHandler as (
          input: unknown,
        ) => Effect.Effect<unknown, unknown, RpcServices>)
      : (inputOrHandler as () => Effect.Effect<unknown, unknown, RpcServices>);

    const app = new Elysia();

    return app.post(
      `/${name}`,
      async ({ body, set }): Promise<RpcResponse<unknown>> => {
        const startTime = Date.now();
        const baseEffect = hasInput
          ? handler(body)
          : (handler as () => Effect.Effect<unknown, unknown, RpcServices>)();

        const program = withTransaction(db, baseEffect, LiveServices).pipe(
          Effect.provide(
            Logger.replace(Logger.defaultLogger, makeRpcLogger(name)),
          ),
        );

        const exit = await Effect.runPromiseExit(program);
        const duration = Date.now() - startTime;

        if (Exit.isFailure(exit)) {
          const error = Cause.failureOption(exit.cause);
          const errorValue =
            error._tag === "Some" ? error.value : Cause.squash(exit.cause);
          set.status = getHttpStatus(errorValue);
          const tag =
            errorValue &&
            typeof errorValue === "object" &&
            "_tag" in errorValue
              ? (errorValue as { _tag: string })._tag
              : "UnknownError";
          console.error(`[${name}] Failed (${duration}ms):`, tag);
          if (isInternalError(errorValue)) {
            return { ok: false, error: { _tag: "InternalError" } };
          }
          return { ok: false, error: serializeError(errorValue as object) };
        }

        console.log(`[${name}] OK (${duration}ms)`);
        return { ok: true, data: exit.value };
      },
      inputSchema ? { body: inputSchema } : undefined,
    );
  }

  return rpc;
}

// =============================================================================
// Response Schema Helpers
// =============================================================================

export const rpcSuccessSchema = <T extends TSchema>(dataSchema: T) =>
  t.Object({ ok: t.Literal(true), data: dataSchema });

export const rpcFailureSchema = t.Object({
  ok: t.Literal(false),
  error: t.Object({ code: t.String(), message: t.String() }),
});

export const rpcResponseSchema = <T extends TSchema>(dataSchema: T) =>
  t.Union([rpcSuccessSchema(dataSchema), rpcFailureSchema]);
