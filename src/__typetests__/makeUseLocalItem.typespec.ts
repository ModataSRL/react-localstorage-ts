import * as t from "io-ts"
import {
  makeHooksFromStorage,
  makeStorageHooks,
  makeUseLocalItem,
} from "../useLocalStorage"
import { DateFromISOString } from "io-ts-types"
import { createLocalStorage } from "localvalue-ts"
import * as E from "fp-ts/Either"
import { Json, JsonFromString } from "io-ts-types"
import { Codec } from "../Codec"
import * as LV from "../LocalValue"
import { pipe } from "fp-ts/lib/function"

const adaptIoTsCodec = <A, B>(C: t.Type<B, A>): Codec<t.Errors, A, B> => {
  return {
    encode: C.encode,
    decode: (u: unknown) => LV.fromEither(C.decode(u)),
  }
}

export const fromIoTsCodec = <A, B extends Json>(C: t.Type<A, B>) => {
  const stringCodec = new t.Type<A, string>(
    C.name,
    C.is,
    (u, c) => {
      return pipe(
        t.string.validate(u, c),
        E.chain((jsonString) => JsonFromString.validate(jsonString, c)),
        E.chain((json) => C.validate(json, c)),
      )
    },
    (v) => {
      return pipe(v, C.encode, JsonFromString.encode)
    },
  )

  return adaptIoTsCodec(stringCodec)
}

const ShapeCodec = t.type({ s: t.string, d: DateFromISOString })
type ShapeCodec = t.TypeOf<typeof ShapeCodec>

const CorrectCodec = fromIoTsCodec(ShapeCodec)

CorrectCodec.encode
const useShape = makeUseLocalItem("shape", CorrectCodec)

// @dts-jest:pass:snap It works with string encoding
makeUseLocalItem("sape", CorrectCodec)

// @dts-jest:fail:snap It doesn't work with non-string encoding
makeUseLocalItem("shape", ShapeCodec)

// @dts-jest:pass:snap You can pass a valid set of options
makeUseLocalItem("sape", CorrectCodec, {
  defaultValue: { s: "foo", d: new Date() },
  useMemorySore: false,
})

makeUseLocalItem("sape", CorrectCodec, {
  // @dts-jest:fail:snap You cannot pass an invalid set of options
  defaultValue: { foo: 123 },
  useMemorySore: false,
})

// @dts-jest:pass:snap resulting useShape typings are correct
useShape

// @dts-jest:fail:snap You cannot pass parameters to hooks
useShape("")

export const UnionCodec = t.union([t.literal("foo"), t.literal("baz")])
const CorrectUnionCodec = fromIoTsCodec(UnionCodec)

const hooks = makeStorageHooks({
  // @dts-jest:pass:snap It works with string encoding
  foo: CorrectCodec,
  union: CorrectUnionCodec,
})

const defaultShape = { s: "foo", d: new Date() }

makeStorageHooks({
  // @dts-jest:fail:snap It doesn't work with non-string encoding
  foo: ShapeCodec,
})

const hooksWithOptions = makeStorageHooks(
  {
    foo: CorrectCodec,
    union: CorrectUnionCodec,
  },
  // @dts-jest:pass:snap You can pass a valid set of options to store
  { useMemorySore: true, defaultValues: { foo: defaultShape } },
)

makeStorageHooks(
  {
    foo: CorrectCodec,
  },
  // @dts-jest:fail:snap You cannot pass an invalid set of options to store
  { useMemorySore: true, defaultValues: { fo: defaultShape } },
)

// @dts-jest:pass:snap store returns the correct type encoding
hooks

// @dts-jest:pass:snap store returns the correct type encoding
hooks.useUnion()

// @dts-jest:pass:snap storeWithOptions returns the correct type encoding
hooksWithOptions

// @dts-jest:pass:snap store returns the correct type encoding
hooksWithOptions.useUnion()

const store = createLocalStorage({
  foo: CorrectCodec,
  union: CorrectUnionCodec,
})

const storeWithOptions = createLocalStorage(
  {
    foo: CorrectCodec,
    union: CorrectUnionCodec,
  },
  { useMemorySore: true, defaultValues: { foo: defaultShape } },
)

const hooksFromStorage = makeHooksFromStorage(store)

const hooksFromStorageWithOptions = makeHooksFromStorage(storeWithOptions)

// @dts-jest:pass:snap store returns the correct type encoding
hooksFromStorage

// @dts-jest:pass:snap store returns the correct type encoding
hooksFromStorage.useUnion()

// @dts-jest:pass:snap storeWithOptions returns the correct type encoding
hooksFromStorageWithOptions

// @dts-jest:pass:snap store returns the correct type encoding
hooksFromStorageWithOptions.useUnion()
