import { Context, Effect, Layer, Data } from "effect";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "../db/schema";

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  cause: unknown;
}> {}

export type DatabaseClient = PostgresJsDatabase<typeof schema>;

const TransactionMarker = Symbol.for("sorgelotse/Transaction");

export type TransactionClient = DatabaseClient & {
  readonly [TransactionMarker]: true;
};

export class Transaction extends Context.Tag("Transaction")<
  Transaction,
  TransactionClient
>() {}

export const asTransaction = (client: DatabaseClient): TransactionClient =>
  Object.assign(client, { [TransactionMarker]: true as const });

export const makeTransactionLayer = (
  client: DatabaseClient,
): Layer.Layer<Transaction> =>
  Layer.succeed(Transaction, asTransaction(client));

export const query = <T>(
  fn: (db: TransactionClient) => Promise<T>,
): Effect.Effect<T, DatabaseError, Transaction> =>
  Effect.gen(function* () {
    const db = yield* Transaction;
    return yield* Effect.tryPromise({
      try: () => fn(db),
      catch: (cause) => new DatabaseError({ cause }),
    });
  });
