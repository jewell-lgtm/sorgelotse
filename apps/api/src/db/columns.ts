import { customType } from "drizzle-orm/pg-core";
import { Temporal } from "@js-temporal/polyfill";

export const instant = customType<{
  data: Temporal.Instant;
  driverData: Date | string;
  config: { withTimezone?: boolean };
}>({
  dataType(config) {
    return config?.withTimezone !== false
      ? "timestamp with time zone"
      : "timestamp";
  },
  fromDriver(value: Date | string): Temporal.Instant {
    if (typeof value === "string") {
      const normalized = value
        .replace(" ", "T")
        .replace(/\+(\d{2})$/, "+$1:00")
        .replace(/-(\d{2})$/, "-$1:00");
      return Temporal.Instant.from(normalized);
    }
    return Temporal.Instant.fromEpochMilliseconds(value.getTime());
  },
  toDriver(value: Temporal.Instant): string {
    return value.toString();
  },
});

export const plainDate = customType<{
  data: Temporal.PlainDate;
  driverData: string;
}>({
  dataType() {
    return "date";
  },
  fromDriver(value: string): Temporal.PlainDate {
    return Temporal.PlainDate.from(value);
  },
  toDriver(value: Temporal.PlainDate): string {
    return value.toString();
  },
});
