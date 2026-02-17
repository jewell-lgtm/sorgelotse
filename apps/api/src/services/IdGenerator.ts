import { Context, Effect, Layer } from "effect";

export interface IdGeneratorService {
  readonly generate: () => string;
}

export class IdGenerator extends Context.Tag("IdGenerator")<
  IdGenerator,
  IdGeneratorService
>() {}

export const LiveIdGenerator: Layer.Layer<IdGenerator> = Layer.succeed(
  IdGenerator,
  { generate: () => crypto.randomUUID() },
);

export const makeTestIdGenerator = (ids: string[]): Layer.Layer<IdGenerator> => {
  let index = 0;
  return Layer.succeed(IdGenerator, {
    generate: () => {
      if (index >= ids.length)
        throw new Error(
          `IdGenerator exhausted: requested more than ${ids.length} IDs`,
        );
      return ids[index++];
    },
  });
};

export const generateId = Effect.gen(function* () {
  const idGen = yield* IdGenerator;
  return idGen.generate();
});
