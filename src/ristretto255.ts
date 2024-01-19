import nacl from '@rmf1723/tweetnacl'
import core from './core.js'
import { type InspectOptionsStylized } from 'util'

const inspect: unique symbol = Symbol.for('nodejs.util.inspect.custom')
const cloneKey: unique symbol = Symbol()

export class Scalar {
  #bytes = new Uint8Array(32)

  constructor(bytes: Uint8Array)
  constructor(bytes: Uint8Array, key: typeof cloneKey)
  constructor(bytes: Uint8Array, key?: typeof cloneKey) {
    if (key == cloneKey) {
      this.#bytes = new Uint8Array(bytes)
    } else {
      if (bytes.byteLength != 32) {
        throw new Error('invalid ristretto255 scalar length')
      }
      const f = new Float64Array(64)
      f.set(bytes)
      this.#bytes = new Uint8Array(32)
      nacl.lowlevel.modL(this.#bytes, f)
    }
  }

  invert(): Scalar {
    if (ctIsZero(this.#bytes)) {
      throw new Error('cannot invert zero')
    }
    return new Scalar(core.scalar.invert(this.#bytes))
  }

  negate(): Scalar {
    return new Scalar(core.scalar.negate(this.#bytes))
  }

  add(rhs: Scalar): Scalar {
    return new Scalar(core.scalar.add(this.#bytes, rhs.#bytes))
  }

  sub(rhs: Scalar): Scalar {
    return new Scalar(core.scalar.sub(this.#bytes, rhs.#bytes))
  }

  mul(rhs: Scalar): Scalar
  mul(rhs: Point): Point
  mul(rhs: Scalar | Point): Scalar | Point {
    if (rhs instanceof Scalar) {
      return new Scalar(core.scalar.mul(this.#bytes, rhs.#bytes))
    } else {
      return rhs.mul(this)
    }
  }

  mulBase(): Point {
    return new Point(core.scalarMultBase(this.#bytes))
  }

  equals(rhs: Scalar): boolean {
    return ctEq(this.#bytes, rhs.#bytes)
  }

  clone(): Scalar {
    return new Scalar(this.#bytes, cloneKey)
  }

  static fromHash(hash: Uint8Array): Scalar {
    if (hash.byteLength != 64) {
      throw new Error('invalid hash length for ristretto255 scalar')
    }
    const f = new Float64Array(hash)
    const reduced = new Uint8Array(32)
    nacl.lowlevel.modL(reduced, f)
    return new Scalar(reduced, cloneKey)
  }

  static random(): Scalar {
    return new Scalar(core.scalar.getRandom())
  }

  toBytes(): Uint8Array {
    return new Uint8Array(this.#bytes)
  }

  [inspect](depth: number, options: InspectOptionsStylized) {
    if (depth < 0) {
      return '[Scalar]'
    }
    return (
      `${options.stylize('Scalar', 'special')} ` +
      `${byteArrayToHex(this.#bytes)}`
    )
  }

  static #ZERO = (() => {
    const s: Scalar = Object.assign(new Scalar(new Uint8Array(32), cloneKey), {
      invert(): Scalar {
        throw new Error('cannot invert zero')
      },
      negate(): Scalar {
        return Scalar.ZERO
      },
      add(rhs: Scalar): Scalar {
        return rhs.clone()
      },
      sub(rhs: Scalar): Scalar {
        return rhs.negate()
      },
      mul(rhs: Scalar | Point): Scalar | Point {
        if (rhs instanceof Scalar) {
          return Scalar.ZERO
        } else {
          return Point.IDENTITY
        }
      },
      mulBase(): Point {
        return Point.IDENTITY
      },
    })
    return Object.freeze(s) as Scalar
  })()

  static get ZERO() {
    return Scalar.#ZERO
  }

  static #ONE = (() => {
    const p: Scalar = Object.assign(
      new Scalar(
        new Uint8Array([
          1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0,
        ]),
        cloneKey
      ),
      {
        invert(): Scalar {
          return Scalar.ONE
        },
        mul(rhs: Scalar | Point): Scalar | Point {
          return rhs.clone()
        },
        mulBase(): Point {
          return Point.BASE
        },
      }
    )
    return Object.freeze(p) as Scalar
  })()

  static get ONE() {
    return Scalar.#ONE
  }
}

export class Point {
  #bytes: Uint8Array

  constructor(bytes: Uint8Array)
  constructor(bytes: Uint8Array, key: typeof cloneKey)
  constructor(bytes: Uint8Array, key?: typeof cloneKey) {
    if (key == cloneKey) {
      this.#bytes = new Uint8Array(bytes)
    } else {
      if (bytes.byteLength != 32) {
        throw new Error('invalid ristretto255 point length')
      }
      if (!core.isValid(bytes)) {
        throw new Error('invalid ristretto255 point')
      }
      this.#bytes = new Uint8Array(bytes)
    }
  }

  add(rhs: Point): Point {
    return new Point(core.add(this.#bytes, rhs.#bytes))
  }

  sub(rhs: Point): Point {
    return new Point(core.sub(this.#bytes, rhs.#bytes))
  }

  mul(rhs: Scalar): Point {
    return new Point(core.scalarMult(rhs.toBytes(), this.#bytes))
  }

  equals(rhs: Point): boolean {
    return ctEq(this.#bytes, rhs.#bytes)
  }

  clone(): Point {
    return new Point(this.#bytes)
  }

  static fromHash(hash: Uint8Array): Point {
    if (hash.byteLength != 64) {
      throw new Error('invalid hash length for ristretto255 point')
    }
    return new Point(core.fromHash(hash))
  }

  static random(): Point {
    return new Point(core.getRandom())
  }

  toBytes(): Uint8Array {
    return new Uint8Array(this.#bytes)
  }

  [inspect](depth: number, options: InspectOptionsStylized) {
    if (depth < 0) {
      return '[Point]'
    }
    return (
      `${options.stylize('Point', 'special')} ` +
      `${byteArrayToHex(this.#bytes)}`
    )
  }

  static #BASE = (() => {
    const p: Point = Object.assign(new Point(core.basePoint, cloneKey), {
      mul(rhs: Scalar) {
        return rhs.mulBase()
      },
      [inspect]() {
        return `BasePoint`
      },
    })
    return Object.freeze(p) as Point
  })()
  static get BASE(): Point {
    return Point.#BASE
  }

  static #IDENTITY = (() => {
    const p: Point = Object.assign(new Point(new Uint8Array(32), cloneKey), {
      add(rhs: Point): Point {
        return rhs.clone()
      },
      mul(rhs: Scalar): Point {
        return Point.IDENTITY
      },
    })
    return Object.freeze(p) as Point
  })()
  static get IDENTITY(): Point {
    return Point.#IDENTITY
  }
}

function ctEq(lhs: Uint8Array, rhs: Uint8Array): boolean {
  let failures = 0
  for (let i = 0; i < 32; ++i) {
    failures |= +(lhs[i] != rhs[i])
  }
  return failures == 0
}

function ctIsZero(lhs: Uint8Array): boolean {
  return ctEq(lhs, new Uint8Array(32))
}

function pad(s: string, size: number) {
  let res = `${s}`
  while (res.length < size) res = `0${res}`
  return res
}

function byteArrayToHex(byteArray: ArrayLike<number>) {
  return Array.from(byteArray, byte => {
    return pad((byte & 0xff).toString(16), 2)
  }).join('')
}

// TODO COMPRESS/DECOMPRESS?
