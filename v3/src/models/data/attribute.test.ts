import { cloneDeep } from "lodash"
import { reaction } from "mobx"
import { getSnapshot } from "mobx-state-tree"
import { Attribute, IAttributeSnapshot, importValueToString, kDefaultFormatStr } from "./attribute"

describe("Attribute", () => {

  const origNodeEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = origNodeEnv
  })

  test("Value conversions", () => {
    expect(importValueToString(null as any)).toBe("")
    expect(importValueToString(undefined)).toBe("")
    expect(importValueToString(0)).toBe("0")
    expect(importValueToString(3.1415926)).toBe("3.1415926")
    expect(importValueToString(1e6)).toBe("1000000")
    expect(importValueToString(1e-6)).toBe("0.000001")
    expect(importValueToString(true)).toBe("true")
    expect(importValueToString(false)).toBe("false")

    const attr = Attribute.create({ name: "a" })
    expect(attr.toNumeric(null as any)).toBeNaN()
    expect(attr.toNumeric(undefined as any)).toBeNaN()
    expect(attr.toNumeric("")).toBeNaN()
    expect(attr.toNumeric("0")).toBe(0)
    expect(attr.toNumeric("3.1415926")).toBe(3.1415926)
    expect(attr.toNumeric({} as any)).toBeNaN()
    expect(attr.toNumeric(true as any)).toBe(1)
    expect(attr.toNumeric(false as any)).toBe(0)

    attr.addValue("true")
    expect(attr.boolean(0)).toBe(true)
    attr.setValue(0, "TRUE")
    expect(attr.boolean(0)).toBe(true)
    attr.setValue(0, "yes")
    expect(attr.boolean(0)).toBe(true)
    attr.setValue(0, "YES")
    expect(attr.boolean(0)).toBe(true)
    // all other non-numeric strings are considered false
    attr.setValue(0, "")
    expect(attr.boolean(0)).toBe(false)
    attr.setValue(0, "f")
    expect(attr.boolean(0)).toBe(false)
    attr.setValue(0, "false")
    expect(attr.boolean(0)).toBe(false)
    attr.setValue(0, "FALSE")
    expect(attr.boolean(0)).toBe(false)
    attr.setValue(0, "no")
    expect(attr.boolean(0)).toBe(false)
    attr.setValue(0, "NO")
    expect(attr.boolean(0)).toBe(false)
    // non-zero numeric strings are true
    attr.setValue(0, "1")
    expect(attr.boolean(0)).toBe(true)
    attr.setValue(0, "-1")
    expect(attr.boolean(0)).toBe(true)
    attr.setValue(0, String(Infinity))
    expect(attr.boolean(0)).toBe(true)
    // 0 strings are false
    attr.setValue(0, "0")
    expect(attr.boolean(0)).toBe(false)
    attr.setValue(0, "-0")
    expect(attr.boolean(0)).toBe(false)
  })

  test("Basic Attribute functionality", () => {
    const attribute = Attribute.create({ name: "foo" })
    expect(attribute.id).toBeDefined()
    expect(attribute.name).toBe("foo")
    expect(attribute.length).toBe(0)

    const copy = cloneDeep(attribute)
    expect(copy.id).toBe(attribute.id)
    expect(copy.name).toBe(attribute.name)

    attribute.setName("bar")
    expect(attribute.name).toBe("bar")

    attribute.setUnits("m")
    expect(attribute.units).toBe("m")
    expect(attribute.numericCount).toBe(0)
    expect(attribute.type).toBeUndefined()

    attribute.addValue("1")
    expect(attribute.length).toBe(1)
    expect(attribute.value(0)).toBe("1")
    expect(attribute.numeric(0)).toBe(1)

    attribute.addValues([2, 3])
    expect(attribute.length).toBe(3)
    expect(attribute.value(1)).toBe("2")
    expect(attribute.value(2)).toBe("3")
    expect(attribute.numeric(1)).toBe(2)
    expect(attribute.numeric(2)).toBe(3)
    expect(attribute.numericCount).toBe(3)

    attribute.addValue(0, 0)
    expect(attribute.length).toBe(4)
    expect(attribute.value(0)).toBe("0")
    expect(attribute.value(3)).toBe("3")
    expect(attribute.isNumeric(0)).toBe(true)
    expect(attribute.isNumeric(3)).toBe(true)
    expect(attribute.numeric(0)).toBe(0)
    expect(attribute.numeric(3)).toBe(3)

    attribute.addValues(["-2", "-1"], 0)
    expect(attribute.length).toBe(6)
    expect(attribute.value(0)).toBe("-2")
    expect(attribute.value(1)).toBe("-1")
    expect(attribute.value(5)).toBe("3")
    expect(attribute.numeric(0)).toBe(-2)
    expect(attribute.numeric(1)).toBe(-1)
    expect(attribute.numeric(5)).toBe(3)

    attribute.setValue(2, 3)
    expect(attribute.value(2)).toBe("3")
    expect(attribute.numeric(2)).toBe(3)
    attribute.setValue(10, 10)

    attribute.setValues([0, 1], ["1", "2"])
    expect(attribute.value(0)).toBe("1")
    expect(attribute.value(1)).toBe("2")
    expect(attribute.numeric(0)).toBe(1)
    expect(attribute.numeric(1)).toBe(2)
    attribute.setValues([10, 11], [10, 11])

    attribute.setValues([0, 1], [0])
    expect(attribute.value(0)).toBe("0")
    expect(attribute.value(1)).toBe("2")
    expect(attribute.numeric(0)).toBe(0)
    expect(attribute.numeric(1)).toBe(2)
    expect(attribute.numericCount).toBe(6)
    expect(attribute.type).toBe("numeric")

    // undefined/empty values are ignored when determining type
    attribute.setValue(2, undefined)
    expect(attribute.type).toBe("numeric")

    attribute.removeValues(2)
    expect(attribute.length).toBe(5)
    expect(attribute.value(2)).toBe("1")
    expect(attribute.numeric(2)).toBe(1)

    attribute.removeValues(0, 2)
    expect(attribute.length).toBe(3)
    expect(attribute.value(0)).toBe("1")
    expect(attribute.numeric(0)).toBe(1)
    attribute.removeValues(0, 0)
    expect(attribute.length).toBe(3)
    expect(attribute.value(0)).toBe("1")
    expect(attribute.numeric(0)).toBe(1)

    attribute.addValues(["a", "b"])
    expect(attribute.value(3)).toBe("a")
    expect(attribute.isNumeric(3)).toBe(false)
    expect(attribute.numeric(3)).toBeNaN()
    expect(attribute.type).toBe("categorical")

    attribute.setUserType("numeric")
    expect(attribute.type).toBe("numeric")

    attribute.addValue()
    expect(attribute.value(5)).toBe("")
    expect(attribute.isNumeric(5)).toBe(false)
    expect(attribute.numeric(5)).toBeNaN()

    attribute.clearValues()
    expect(attribute.strValues.length).toBe(6)
    expect(attribute.numValues.length).toBe(6)
    expect(attribute.strValues).toEqual(["", "", "", "", "", ""])
    expect(attribute.numValues).toEqual([NaN, NaN, NaN, NaN, NaN, NaN])

    expect(attribute.format).toBe(kDefaultFormatStr)
    attribute.setPrecision(2)
    expect(attribute.format).toBe(".2~f")

    expect(attribute.description).toBeUndefined()
    attribute.setDescription("description")
    expect(attribute.description).toBe("description")

    expect(attribute.editable).toBe(true)
    attribute.setEditable(false)
    expect(attribute.editable).toBe(false)
  })

  test("caching/invalidation of views based on data values works as expected", () => {
    const a = Attribute.create({ id: "aId", name: "a", values: ["1", "2", "3"] })

    // value changes should trigger length reevaluation
    const lengthListener = jest.fn()
    const lengthDisposer = reaction(() => a.length, () => lengthListener())
    expect(a.length).toBe(3)
    expect(lengthListener).toHaveBeenCalledTimes(0)
    a.addValue("4")
    expect(a.length).toBe(4)
    expect(lengthListener).toHaveBeenCalledTimes(1)
    lengthDisposer()

    // value changes should trigger emptyCount reevaluation
    const emptyCountListener = jest.fn()
    const emptyCountDisposer = reaction(() => a.emptyCount, () => emptyCountListener())
    expect(a.emptyCount).toBe(0)
    expect(emptyCountListener).toHaveBeenCalledTimes(0)
    a.setValue(2, "")
    expect(a.emptyCount).toBe(1)
    expect(emptyCountListener).toHaveBeenCalledTimes(1)
    emptyCountDisposer()

    // value changes should trigger numericCount reevaluation
    const numericCountListener = jest.fn()
    const numericCountDisposer = reaction(() => a.numericCount, () => numericCountListener())
    expect(a.numericCount).toBe(3)
    expect(numericCountListener).toHaveBeenCalledTimes(0)
    a.setValue(2, "3")
    expect(a.numericCount).toBe(4)
    expect(numericCountListener).toHaveBeenCalledTimes(1)
    numericCountDisposer()

    const typeListener = jest.fn()
    const typeDisposer = reaction(() => a.type, () => typeListener())
    expect(a.type).toBe("numeric")
    expect(typeListener).toHaveBeenCalledTimes(0)
    a.setValue(2, "a")
    expect(a.type).toBe("categorical")
    expect(typeListener).toHaveBeenCalledTimes(1)
    typeDisposer()
  })

  test("Serialization (development)", () => {
    process.env.NODE_ENV = "development"
    const x = Attribute.create({ name: "x", values: ["1", "2", "3"] })
    expect(x.values).toBeUndefined()
    expect(x.strValues).toEqual(["1", "2", "3"])
    expect(x.numValues).toEqual([1, 2, 3])
    expect(getSnapshot(x).values).toBeUndefined()
    x.prepareSnapshot()
    const xSnapshot = getSnapshot(x)
    expect(Object.isFrozen(x.values)).toBe(true)
    expect(xSnapshot.values).toEqual(["1", "2", "3"])
    x.completeSnapshot()
    expect(getSnapshot(x).values).toBeUndefined()

    const x2 = Attribute.create(xSnapshot)
    expect(x2.strValues).toEqual(["1", "2", "3"])
    expect(x2.numValues).toEqual([1, 2, 3])

    const y = Attribute.create({ name: "y" })
    expect(y.values).toBeUndefined()
    expect(y.strValues.length).toBe(0)
    expect(getSnapshot(y).values).toBeUndefined()
    x.prepareSnapshot()
    expect(Object.isFrozen(y.values)).toBe(true)
    expect(getSnapshot(y).values).toBeUndefined()
    x.completeSnapshot()
    expect(getSnapshot(y).values).toBeUndefined()
  })

  test("Serialization (production)", () => {
    process.env.NODE_ENV = "production"
    const x = Attribute.create({ name: "x", values: ["1", "2", "3"] })
    expect(x.values).toBe(x.strValues)
    expect(x.strValues).toEqual(["1", "2", "3"])
    expect(x.numValues).toEqual([1, 2, 3])
    expect(Object.isFrozen(x.values)).toBe(false)
    expect(getSnapshot(x).values).toEqual(["1", "2", "3"])
    x.prepareSnapshot()
    const xSnapshot = getSnapshot(x)
    expect(xSnapshot.values).toEqual(["1", "2", "3"])
    x.completeSnapshot()
    expect(getSnapshot(x).values).toEqual(["1", "2", "3"])

    const x2 = Attribute.create(xSnapshot)
    expect(x2.strValues).toEqual(["1", "2", "3"])
    expect(x2.numValues).toEqual([1, 2, 3])

    const y = Attribute.create({ name: "y", values: undefined })
    expect(y.values).toEqual([])
    expect(y.strValues).toEqual([])
    expect(getSnapshot(y).values).toEqual([])
    x.prepareSnapshot()
    expect(Object.isFrozen(y.values)).toBe(false)
    expect(getSnapshot(y).values).toEqual([])
    x.completeSnapshot()
    expect(getSnapshot(y).values).toEqual([])
  })

  test("Attribute formulas", () => {
    // current behavior of formulas is based on CLUE's limited needs
    // CODAP will need something more sophisticated
    const attr = Attribute.create({ name: "foo" })
    expect(attr.formula.display).toBe("")
    expect(attr.formula.canonical).toBe("")
    // attr.formula.canonicalize("x")
    expect(attr.formula.canonical).toBe("")
    attr.setDisplayFormula("2 * x")
    expect(attr.formula.display).toBe("2 * x")
    // expect(attr.formula.canonical).toBe(`(2 * ${kSerializedXKey})`)
    // attr.formula.setDisplay()
    // attr.formula.synchronize("x")
    // expect(attr.formula.display).toBe("(2 * x)")
    // attr.setDisplayFormula("2 * y", "x")
    // expect(attr.formula.display).toBe("2 * y")
    // expect(attr.formula.canonical).toBe(`(2 * y)`)
    // attr.formula.setCanonical()
    // attr.formula.synchronize("x")
    // expect(attr.formula.display).toBe("2 * y")
    attr.clearFormula()
    expect(attr.formula.display).toBe("")
    expect(attr.formula.canonical).toBe("")
  })

  test("Attribute derivation", () => {
    const bar = Attribute.create({ name: "bar", values: ["0", "1", "2"] })
    expect(bar.name).toBe("bar")
    expect(bar.length).toBe(3)

    const bazSnap: IAttributeSnapshot = bar.derive("baz")
    expect(bazSnap.id).toBe(bar.id)
    expect(bazSnap.name).toBe("baz")
    expect(bazSnap.values?.length).toBe(0)

    const barSnap: IAttributeSnapshot = bar.derive()
    expect(barSnap.id).toBe(bar.id)
    expect(barSnap.name).toBe(bar.name)
    expect(barSnap.values?.length).toBe(0)
  })

  test.skip("performance of value.toString() vs. JSON.stringify(value)", () => {
    const values: number[] = []
    for (let i = 0; i < 5000; ++i) {
      const factor = Math.pow(10, Math.floor(6 * Math.random()))
      const decimals = Math.pow(10, Math.floor(4 * Math.random()))
      values.push(Math.round(factor * decimals * Math.random()) / decimals)
    }
    const start0 = performance.now()
    const converted0 = values.map(value => JSON.stringify(value))
    const elapsed0 = performance.now() - start0

    const start1 = performance.now()
    const converted1 = values.map(value => value.toString())
    const elapsed1 = performance.now() - start1

    expect(converted0).toEqual(converted1)
    expect(elapsed0).toBeGreaterThan(elapsed1)
    // eslint-disable-next-line no-console
    console.log("JSON.stringify:", `${elapsed0.toFixed(3)}ms,`,
                "value.toString:", `${elapsed1.toFixed(3)}ms,`,
                "% diff:", `${(100 * (elapsed0 - elapsed1) / elapsed0).toFixed(1)}%`)
  })

})
