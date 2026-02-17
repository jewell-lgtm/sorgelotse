import { Temporal } from "@js-temporal/polyfill";

export type Serialized<T> = T extends
  | Temporal.Instant
  | Temporal.PlainDate
  | Temporal.ZonedDateTime
  ? string
  : T extends null
    ? null
    : T extends Array<infer U>
      ? Array<Serialized<U>>
      : T extends object
        ? { [K in keyof T]: Serialized<T[K]> }
        : T;

export type SerializedError<T> = Serialized<Omit<T, "cause">>;

export function serializeError<T extends object>(error: T): SerializedError<T> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(error)) {
    if (key === "cause") continue;
    if (value instanceof Temporal.Instant) result[key] = value.toString();
    else if (value instanceof Temporal.PlainDate) result[key] = value.toString();
    else if (value instanceof Temporal.ZonedDateTime)
      result[key] = value.toString();
    else if (Array.isArray(value))
      result[key] = value.map((v) =>
        v && typeof v === "object" ? serializeError(v) : v,
      );
    else if (value && typeof value === "object")
      result[key] = serializeError(value as object);
    else result[key] = value;
  }
  return result as SerializedError<T>;
}
