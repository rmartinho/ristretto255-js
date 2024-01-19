import nacl from '@rmf1723/tweetnacl'
import core from './core.js'

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
      return new Point(core.scalarMult(this.#bytes, rhs.toBytes()))
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

  static random(): Scalar {
    return new Scalar(core.scalar.getRandom())
  }

  toBytes(): Uint8Array {
    return new Uint8Array(this.#bytes)
  }

  [inspect]() {
    return `Scalar ${byteArrayToHex(this.#bytes)}]`
  }

  static #ZERO = Object.freeze(
    new Scalar(new Uint8Array(32), cloneKey)
  ) as Scalar
  static get ZERO() {
    return Scalar.#ZERO
  }
  static #ONE = Object.freeze(
    new Scalar(
      new Uint8Array([
        1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0,
      ]),
      cloneKey
    )
  ) as Scalar
  static get ONE() {
    return Scalar.#ONE
  }
}

export class Point {
  #bytes: Uint8Array

  constructor(bytes: Uint8Array) {
    if (bytes.byteLength != 32) {
      throw new Error('invalid ristretto255 point length')
    }
    if (!core.isValid(bytes)) {
      throw new Error('invalid ristretto255 point')
    }
    this.#bytes = new Uint8Array(bytes)
  }

  add(rhs: Point): Point {
    return new Point(core.add(this.#bytes, rhs.#bytes))
  }

  sub(rhs: Point): Point {
    return new Point(core.sub(this.#bytes, rhs.#bytes))
  }

  mul(rhs: Scalar): Point {
    return rhs.mul(this)
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

  [inspect]() {
    return `Point ${byteArrayToHex(this.#bytes)}`
  }

  static get BASE(): Point {
    const p = new Point(core.basePoint)
    p.mul = rhs => rhs.mulBase()
    return p
  }
}

function ctEq(lhs: Uint8Array, rhs: Uint8Array): boolean {
  let failures = 0
  for (let i = 0; i < 32; ++i) {
    failures |= +(lhs[i] != rhs[i])
  }
  return failures == 0
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
