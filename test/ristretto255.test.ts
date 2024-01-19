import { test, expect } from 'vitest'

import testDalekScalars from '../data/scalars.data'
import testDalek from '../data/ristretto.data'
import crypto from 'node:crypto'
import { Point, Scalar } from '../src/ristretto255'

const L_BYTES = new Uint8Array([
  0xed, 0xd3, 0xf5, 0x5c, 0x1a, 0x63, 0x12, 0x58, 0xd6, 0x9c, 0xf7, 0xa2, 0xde,
  0xf9, 0xde, 0x14, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x10,
])

function makeScalar(init: ArrayLike<number>) {
  const r = new Uint8Array(32)
  r.set(init, 0)
  return new Scalar(r)
}

function pad(s: string, size: number) {
  let res = `${s}`
  while (res.length < size) res = `0${res}`
  return res
}

function hexToByteArray(hexString: string) {
  const result = [] as number[]
  for (let i = 0; i < hexString.length; i += 2) {
    result.push(parseInt(hexString.substr(i, 2), 16))
  }
  return new Uint8Array(result)
}

function byteArrayToHex(byteArray: ArrayLike<number>) {
  return Array.from(byteArray, byte => {
    return pad((byte & 0xff).toString(16), 2)
  }).join('')
}

// Testing scalar operations against test vectors
test('Scalars: add, sub, mul, invert, negate', () => {
  for (let i = 0; i < testDalekScalars.length; i++) {
    const a = new Scalar(testDalekScalars[i][0])
    const b = new Scalar(testDalekScalars[i][1])

    let resExp = testDalekScalars[i][2]
    let res = a.add(b)
    expect(resExp).toEqual(res.toBytes())

    resExp = testDalekScalars[i][3]
    res = a.sub(b)
    expect(resExp).toEqual(res.toBytes())

    resExp = testDalekScalars[i][4]
    res = a.mul(b)
    expect(resExp).toEqual(res.toBytes())

    resExp = testDalekScalars[i][5]
    res = a.invert()
    expect(resExp).toEqual(res.toBytes())

    resExp = testDalekScalars[i][6]
    res = b.invert()
    expect(resExp).toEqual(res.toBytes())

    resExp = testDalekScalars[i][7]
    res = a.negate()
    expect(resExp).toEqual(res.toBytes())

    resExp = testDalekScalars[i][8]
    res = b.negate()
    expect(resExp).toEqual(res.toBytes())
  }
})

// Testing ristretto operations against test vectors
test('Ristretto: add, sub, scalarMultBase, scalarMult, fromHash, isValid', () => {
  for (let i = 0; i < testDalek.ristretto_ops.length; i++) {
    const a = new Point(testDalek.ristretto_ops[i][0])
    const b = new Point(testDalek.ristretto_ops[i][1])

    let resExp = testDalek.ristretto_ops[i][2]
    let res = a.add(b)
    expect(resExp).toEqual(res.toBytes())

    resExp = testDalek.ristretto_ops[i][3]
    res = a.sub(b)
    expect(resExp).toEqual(res.toBytes())

    let s = new Scalar(testDalek.ristretto_ops[i][4])

    resExp = testDalek.ristretto_ops[i][5]
    res = s.mulBase()
    expect(resExp).toEqual(res.toBytes())
    res = Point.BASE.mul(s)
    expect(resExp).toEqual(res.toBytes())

    resExp = testDalek.ristretto_ops[i][6]
    res = s.mul(a)
    expect(resExp).toEqual(res.toBytes())
    res = a.mul(s)
    expect(resExp).toEqual(res.toBytes())

    resExp = testDalek.ristretto_ops[i][7]
    res = s.mul(b)
    expect(resExp).toEqual(res.toBytes())
    res = b.mul(s)
    expect(resExp).toEqual(res.toBytes())

    const h = testDalek.ristretto_ops[i][8]
    resExp = testDalek.ristretto_ops[i][9]
    res = Point.fromHash(h)
    expect(resExp).toEqual(res.toBytes())
  }

  for (let i = 1; i < testDalek.ristretto_valid_or_not.length; i++) {
    const a = testDalek.ristretto_valid_or_not[i][0] as Uint8Array
    const resExp = testDalek.ristretto_valid_or_not[i][1] as boolean
    if (resExp) {
      expect(() => new Point(a)).not.toThrow()
    } else {
      expect(() => new Point(a)).toThrow()
    }
  }
})

const FUZZY_TESTS_ITERATIONS_NUMBER = 5

/* Checking for ristretto test vectors from https://ristretto.group/test_vectors/ristretto255.html */
const encodingsOfSmallMultiples = [
  // This is the identity point
  '0000000000000000000000000000000000000000000000000000000000000000',
  // This is the basepoint
  'e2f2ae0a6abc4e71a884a961c500515f58e30b6aa582dd8db6a65945e08d2d76',
  // These are small multiples of the basepoint
  '6a493210f7499cd17fecb510ae0cea23a110e8d5b901f8acadd3095c73a3b919',
  '94741f5d5d52755ece4f23f044ee27d5d1ea1e2bd196b462166b16152a9d0259',
  'da80862773358b466ffadfe0b3293ab3d9fd53c5ea6c955358f568322daf6a57',
  'e882b131016b52c1d3337080187cf768423efccbb517bb495ab812c4160ff44e',
  'f64746d3c92b13050ed8d80236a7f0007c3b3f962f5ba793d19a601ebb1df403',
  '44f53520926ec81fbd5a387845beb7df85a96a24ece18738bdcfa6a7822a176d',
  '903293d8f2287ebe10e2374dc1a53e0bc887e592699f02d077d5263cdd55601c',
  '02622ace8f7303a31cafc63f8fc48fdc16e1c8c8d234b2f0d6685282a9076031',
  '20706fd788b2720a1ed2a5dad4952b01f413bcf0e7564de8cdc816689e2db95f',
  'bce83f8ba5dd2fa572864c24ba1810f9522bc6004afe95877ac73241cafdab42',
  'e4549ee16b9aa03099ca208c67adafcafa4c3f3e4e5303de6026e3ca8ff84460',
  'aa52e000df2e16f55fb1032fc33bc42742dad6bd5a8fc0be0167436c5948501f',
  '46376b80f409b29dc2b5f6f0c52591990896e5716f41477cd30085ab7f10301e',
  'e0c418f7c8d9c4cdd7395b93ea124f3ad99021bb681dfc3302a9d99a2e53e64e',
]

test('Ristretto official: Checking encodings of small multiples', () => {
  for (let i = 0; i < 16; i++) {
    const p = makeScalar([i]).mulBase()
    const res = p.toBytes()
    expect(res).toEqual(hexToByteArray(encodingsOfSmallMultiples[i]))
  }
})

const badEncodings = [
  // These are all bad because they're non-canonical field encodings.
  '00ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f',
  'f3ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f',
  'edffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f',
  // These are all bad because they're negative field elements.
  '0100000000000000000000000000000000000000000000000000000000000000',
  '01ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f',
  'ed57ffd8c914fb201471d1c3d245ce3c746fcbe63a3679d51b6a516ebebe0e20',
  'c34c4e1826e5d403b78e246e88aa051c36ccf0aafebffe137d148a2bf9104562',
  'c940e5a4404157cfb1628b108db051a8d439e1a421394ec4ebccb9ec92a8ac78',
  '47cfc5497c53dc8e61c91d17fd626ffb1c49e2bca94eed052281b510b1117a24',
  'f1c6165d33367351b0da8f6e4511010c68174a03b6581212c71c0e1d026c3c72',
  '87260f7a2f12495118360f02c26a470f450dadf34a413d21042b43b9d93e1309',
  // These are all bad because they give a nonsquare x^2.
  '26948d35ca62e643e26a83177332e6b6afeb9d08e4268b650f1f5bbd8d81d371',
  '4eac077a713c57b4f4397629a4145982c661f48044dd3f96427d40b147d9742f',
  'de6a7b00deadc788eb6b6c8d20c0ae96c2f2019078fa604fee5b87d6e989ad7b',
  'bcab477be20861e01e4a0e295284146a510150d9817763caf1a6f4b422d67042',
  '2a292df7e32cababbd9de088d1d1abec9fc0440f637ed2fba145094dc14bea08',
  'f4a9e534fc0d216c44b218fa0c42d99635a0127ee2e53c712f70609649fdff22',
  '8268436f8c4126196cf64b3c7ddbda90746a378625f9813dd9b8457077256731',
  '2810e5cbc2cc4d4eece54f61c6f69758e289aa7ab440b3cbeaa21995c2f4232b',
  // These are all bad because they give a negative xy value.
  '3eb858e78f5a7254d8c9731174a94f76755fd3941c0ac93735c07ba14579630e',
  'a45fdc55c76448c049a1ab33f17023edfb2be3581e9c7aade8a6125215e04220',
  'd483fe813c6ba647ebbfd3ec41adca1c6130c2beeee9d9bf065c8d151c5f396e',
  '8a2e1d30050198c65a54483123960ccc38aef6848e1ec8f5f780e8523769ba32',
  '32888462f8b486c68ad7dd9610be5192bbeaf3b443951ac1a8118419d9fa097b',
  '227142501b9d4355ccba290404bde41575b037693cef1f438c47f8fbf35d1165',
  '5c37cc491da847cfeb9281d407efc41e15144c876e0170b499a96a22ed31e01e',
  '445425117cb8c90edcbc7c1cc0e74f747f2c1efa5630a967c64f287792a48a4b',
  // This is s = -1, which causes y = 0.
  'ecffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff7f',
]

/* Testing for bad encodings */
test('Ristretto official: Checking bad encodings', () => {
  for (const encoding of badEncodings) {
    expect(() => new Point(hexToByteArray(encoding))).toThrow()
  }
})

/* Testing for good encodings: using the small multiples of the base point */
test('Ristretto official: Checking good encodings', () => {
  for (const encoding of encodingsOfSmallMultiples) {
    expect(() => new Point(hexToByteArray(encoding))).not.toThrow()
  }
})

const labels = [
  'Ristretto is traditionally a short shot of espresso coffee',
  'made with the normal amount of ground coffee but extracted with',
  'about half the amount of water in the same amount of time',
  'by using a finer grind.',
  'This produces a concentrated shot of coffee per volume.',
  'Just pulling a normal shot short will produce a weaker shot',
  'and is not a Ristretto as some believe.',
]

const intermediateHash = [
  '5d1be09e3d0c82fc538112490e35701979d99e06ca3e2b5b54bffe8b4dc772c14d98b696a1bbfb5ca32c436cc61c16563790306c79eaca7705668b47dffe5bb6',
  'f116b34b8f17ceb56e8732a60d913dd10cce47a6d53bee9204be8b44f6678b270102a56902e2488c46120e9276cfe54638286b9e4b3cdb470b542d46c2068d38',
  '8422e1bbdaab52938b81fd602effb6f89110e1e57208ad12d9ad767e2e25510c27140775f9337088b982d83d7fcf0b2fa1edffe51952cbe7365e95c86eaf325c',
  'ac22415129b61427bf464e17baee8db65940c233b98afce8d17c57beeb7876c2150d15af1cb1fb824bbd14955f2b57d08d388aab431a391cfc33d5bafb5dbbaf',
  '165d697a1ef3d5cf3c38565beefcf88c0f282b8e7dbd28544c483432f1cec7675debea8ebb4e5fe7d6f6e5db15f15587ac4d4d4a1de7191e0c1ca6664abcc413',
  'a836e6c9a9ca9f1e8d486273ad56a78c70cf18f0ce10abb1c7172ddd605d7fd2979854f47ae1ccf204a33102095b4200e5befc0465accc263175485f0e17ea5c',
  '2cdc11eaeb95daf01189417cdddbf95952993aa9cb9c640eb5058d09702c74622c9965a697a3b345ec24ee56335b556e677b30e6f90ac77d781064f866a3c982',
]

const encodedHashToPoints = [
  '3066f82a1a747d45120d1740f14358531a8f04bbffe6a819f86dfe50f44a0a46',
  'f26e5b6f7d362d2d2a94c5d0e7602cb4773c95a2e5c31a64f133189fa76ed61b',
  '006ccd2a9e6867e6a2c5cea83d3302cc9de128dd2a9a57dd8ee7b9d7ffe02826',
  'f8f0c87cf237953c5890aec3998169005dae3eca1fbb04548c635953c817f92a',
  'ae81e7dedf20a497e10c304a765c1767a42d6e06029758d2d7e8ef7cc4c41179',
  'e2705652ff9f5e44d3e841bf1c251cf7dddb77d140870d1ab2ed64f1a9ce8628',
  '80bd07262511cdde4863f8a7434cef696750681cb9510eea557088f76d9e5065',
]

test('Ristretto official: Checking hash-to-point', () => {
  for (let i = 0; i < 7; i++) {
    const h = crypto.createHash('sha512').update(labels[i]).digest()
    expect(byteArrayToHex(h)).toEqual(intermediateHash[i])
    const res = Point.fromHash(h)
    expect(res.toBytes()).toEqual(hexToByteArray(encodedHashToPoints[i]))
  }
})

// Porting libsodium test tv3 https://github.com/jedisct1/libsodium/blob/master/test/default/core_ristretto255.c#L110
test('Fuzzy checking ristretto ops (libsodium tv3)', () => {
  for (let i = 0; i < FUZZY_TESTS_ITERATIONS_NUMBER; i++) {
    // s := random_scalar * BASE
    const r = Scalar.random()
    expect(() => r.mulBase()).not.toThrow()

    // s := random
    expect(() => Point.random()).not.toThrow()

    // s := s * L
    let s = Point.random()
    s = Scalar.ZERO.mul(s)
    // test s == 0
    expect(s.toBytes()).toEqual(new Uint8Array(32))

    // s := from hash h
    const h = crypto.randomBytes(64)
    expect(() => (s = Point.fromHash(h))).not.toThrow()

    // test s * L == 0
    expect(s.mul(Scalar.ZERO).toBytes()).toEqual(new Uint8Array(32))

    // s2 := s * r
    let s2!: Point
    expect(() => (s2 = s.mul(r))).not.toThrow()

    // sVar := s2 * (1/r)
    const rInv = r.invert()
    let sVar!: Point
    expect(() => (sVar = s2.mul(rInv))).not.toThrow()
    // test sVar == s
    expect(sVar.toBytes()).toEqual(s.toBytes())

    // s2 := s2 * L
    s2 = s2.mul(Scalar.ZERO)
    // test s2 == 0
    expect(s2.toBytes()).toEqual(new Uint8Array(32))

    // s2 := s + s
    expect(() => (s2 = s.add(sVar))).not.toThrow()
    // s2 := s2 - s
    expect(() => (s2 = s2.sub(sVar))).not.toThrow()
    // test s2 == s
    expect(s2.toBytes()).toEqual(s.toBytes())

    // s2 := s2 - s
    expect(() => (s2 = s2.sub(sVar))).not.toThrow()
    // test s2 == 0
    expect(s2.toBytes()).toEqual(new Uint8Array(32))

    expect(() => new Point(new Uint8Array(32).fill(0xfe))).toThrow()

    s = Point.random()
  }
})

// Porting libsodium test tv4 https://github.com/jedisct1/libsodium/blob/master/test/default/core_ristretto255.c#L210
test('Fuzzy checking ristretto ops (libsodium tv4)', () => {
  for (let i = 0; i < FUZZY_TESTS_ITERATIONS_NUMBER; i++) {
    // s1 := random
    let s1 = Scalar.random()
    // s2 := random
    let s2 = Scalar.random()
    // s3 := s1 + s2
    const s3 = s1.add(s2)
    // s4 := s1 - s2
    let s4 = s1.sub(s2)
    // s2 := s3 + s4 == 2 * org_s1
    s2 = s3.add(s4)
    // s2 := s2 - s1 == org_s1
    s2 = s2.sub(s1)
    // s2 := s3 * s2 == (org_s1 + org_s2) * org_s1
    s2 = s3.mul(s2)
    // s4 = 1/s3 == 1 / (org_s1 + org_s2)
    s4 = s3.invert()
    // s2 := s2 * s4 == org_s1
    s2 = s2.mul(s4)
    // s1 := -s1 == -org_s1
    s1 = s1.negate()
    // s2 := s2 + s1 == 0
    s2 = s2.add(s1)
    // test s2 == 0
    expect(s2.toBytes()).toEqual(new Uint8Array(32))
  }
})

// Test basepoint round trip: serialization/deserialization
test('Ristretto base point round trip', () => {
  const base = Point.BASE
  const base2 = new Point(base.toBytes())
  // test base == base2
  expect(base.toBytes()).toEqual(base2.toBytes())
})

// Test random point round trip: serialization/deserialization
test('Ristretto random point round trip', () => {
  for (let i = 0; i < FUZZY_TESTS_ITERATIONS_NUMBER; i++) {
    const random = Point.random()
    const random2 = new Point(random.toBytes())
    // test random == random2
    expect(random.toBytes()).toEqual(random2.toBytes())
  }
})

// Test scalar mult and add
test('Ristretto random ops', () => {
  const s1 = makeScalar([33])
  const s2 = makeScalar([66])
  // P1 := BASE * s1
  let P1 = Point.BASE.mul(s1)
  // P1 := P1 + P1
  P1 = P1.add(P1)
  // P2 := BASE * s2
  const P2 = Point.BASE.mul(s2)

  expect(P1.toBytes()).toEqual(P2.toBytes())
})

// Test border-scalars
test('Scalar operations, corner cases', () => {
  const x = Scalar.ONE.negate()
  const xInv = x.invert()
  // one = x * (1/x)
  let one = x.mul(xInv)
  expect(one.toBytes()).toEqual(Scalar.ONE.toBytes())
  one = xInv.mul(x)
  expect(one.toBytes()).toEqual(Scalar.ONE.toBytes())

  const zero = x.add(Scalar.ONE)
  expect(zero.toBytes()).toEqual(new Uint8Array(32))

  const x2 = Scalar.ZERO.sub(Scalar.ONE)
  expect(x.toBytes()).toEqual(x2.toBytes())

  const negOne = makeScalar([1]).negate()
  expect(negOne.toBytes()).toEqual(x2.toBytes())

  const l = new Scalar(L_BYTES)
  expect(l.toBytes()).toEqual(new Uint8Array(32))
})

test('scalar equals', () => {
  const x = Scalar.random()
  const y = Scalar.random()
  const z = Scalar.random()
  const xy = x.add(y)
  const yx = y.add(x)
  const xz = x.add(z)

  expect(xy.equals(xy)).toBeTruthy()
  expect(xy.equals(yx)).toBeTruthy()
  expect(yx.equals(xy)).toBeTruthy()
  expect(xy.equals(xz)).toBeFalsy()
  expect(xz.equals(xy)).toBeFalsy()
})

test('point equals', () => {
  const x = Point.random()
  const y = Point.random()
  const z = Point.random()
  const xy = x.add(y)
  const yx = y.add(x)
  const xz = x.add(z)

  expect(xy.equals(xy)).toBeTruthy()
  expect(xy.equals(yx)).toBeTruthy()
  expect(yx.equals(xy)).toBeTruthy()
  expect(xy.equals(xz)).toBeFalsy()
  expect(xz.equals(xy)).toBeFalsy()
})
