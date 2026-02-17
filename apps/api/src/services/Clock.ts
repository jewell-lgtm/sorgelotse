import { Temporal } from "@js-temporal/polyfill";
import { Context, Effect, Layer } from "effect";

export interface ClockService {
  readonly now: () => Temporal.Instant;
}

export class Clock extends Context.Tag("Clock")<Clock, ClockService>() {}

export const LiveClock: Layer.Layer<Clock> = Layer.succeed(Clock, {
  now: () => Temporal.Now.instant(),
});

export const makeTestClock = (
  fixedInstant: Temporal.Instant,
): Layer.Layer<Clock> =>
  Layer.succeed(Clock, { now: () => fixedInstant });

export const now = Effect.gen(function* () {
  const clock = yield* Clock;
  return clock.now();
});
