import { select } from "d3"
import { IUnivariateMeasureAdornmentModel } from "./univariate-measure-adornment-model"
import { ILineCoords, ILineSpecs, IRange, IRangeSpecs, IRectSpecs, IValue } from "./univariate-measure-adornment-types"
import clsx from "clsx"
import { ScaleNumericBaseType } from "../../../axis/axis-types"
import { isBoxPlotAdornment } from "./box-plot/box-plot-adornment-model"
import { IAxisLayout } from "../../../axis/models/axis-layout-context"
import { valueLabelString } from "../../utilities/graph-utils"
import { IDataConfigurationModel } from "../../../data-display/models/data-configuration-model"

export class UnivariateMeasureAdornmentHelper {
  cellKey: Record<string, string>
  classFromKey = ""
  containerId = ""
  instanceKey = ""
  layout: IAxisLayout
  measureSlug = ""
  model: IUnivariateMeasureAdornmentModel
  plotHeight = 0
  plotWidth = 0
  xScale: ScaleNumericBaseType
  yScale: ScaleNumericBaseType

  constructor (
    cellKey: Record<string, string>,
    layout: IAxisLayout,
    model: IUnivariateMeasureAdornmentModel,
    plotHeight: number,
    plotWidth: number,
    containerId?: string
  ) {
    this.cellKey = cellKey
    this.classFromKey = model.classNameFromKey(cellKey)
    this.containerId = containerId ?? ""
    this.instanceKey = model.instanceKey(cellKey)
    this.layout = layout
    this.measureSlug = model.type.toLowerCase().replace(/ /g, "-")
    this.model = model
    this.plotHeight = plotHeight
    this.plotWidth = plotWidth
    this.xScale = layout.getAxisScale("bottom") as ScaleNumericBaseType
    this.yScale = layout.getAxisScale("left") as ScaleNumericBaseType
  }

  generateIdString = (elementType: string) => {
    return `${this.measureSlug}-${elementType}-${this.containerId}${this.classFromKey ? `-${this.classFromKey}` : ""}`
  }

  calculateLineCoords = (
    value: number, index: number, isVertical: boolean, cellCounts: Record<string, number>,
    secondaryAxisX=0, secondaryAxisY=0
  ) => {
    const [left, right] = this.xScale?.range() || [0, 1]
    const [bottom, top] = this.yScale?.range() || [0, 1]
    const coordX = index === 1 ? right : left
    const coordY = index === 1 ? top : bottom
    const secondaryAxisXReal = !isVertical && isBoxPlotAdornment(this.model)
      ? secondaryAxisX
      : coordX / cellCounts.x
    const secondaryAxisYReal = isVertical && isBoxPlotAdornment(this.model)
      ? secondaryAxisY
      : coordY / cellCounts.y
    const x = !isVertical ? secondaryAxisXReal : this.xScale(value) / cellCounts.x
    const y = isVertical ? secondaryAxisYReal : this.yScale(value) / cellCounts.y
    return {x, y}
  }

  calculateRangeCoords = (
    rangeVal: number, coords: ILineCoords, isVertical: boolean, cellCounts: Record<string, number>
  ) => {
    const { x1, x2, y1, y2 } = coords
    return {
      x1: isVertical ? this.xScale(rangeVal) / cellCounts.x : x1,
      x2: isVertical ? this.xScale(rangeVal) / cellCounts.x : x2,
      y1: isVertical ? y1 : this.yScale(rangeVal) / cellCounts.y,
      y2: isVertical ? y2 : this.yScale(rangeVal) / cellCounts.y
    }
  }

  newLine = (valueElement: SVGGElement | null, lineSpecs: ILineSpecs) => {
    if (!valueElement) return
    const { isVertical, lineClass, lineId, offset=0, x1, x2, y1, y2 } = lineSpecs
    const leftOffset = !isVertical && offset ? offset : 0
    const topOffset = isVertical && offset ? offset : 0
    return select(valueElement).append("line")
      .attr("class", lineClass)
      .attr("id", lineId)
      .attr("data-testid", lineId)
      .attr("x1", x1)
      .attr("x2", x2)
      .attr("y1", y1)
      .attr("y2", y2)
      .attr("transform", `translate(${leftOffset}, ${topOffset})`)
  }

  newRect = (valueElement: SVGGElement | null, rectSpecs: IRectSpecs) => {
    if (!valueElement) return
    const { height, isVertical, rectOffset, width, x, y } = rectSpecs
    const rectId = this.generateIdString("range")
    const rectClass = clsx("measure-range", `${this.measureSlug}-range`)
    const leftOffset = isVertical && rectOffset ? 0 : rectOffset
    const topOffset = isVertical && rectOffset ? rectOffset : 0
    return select(valueElement).append("rect")
      .attr("class", rectClass)
      .attr("id", rectId)
      .attr("data-testid", rectId)
      .attr("x", x)
      .attr("y", y)
      .attr("width", width)
      .attr("height", height)
      .attr("transform", `${`translate(${leftOffset}, ${topOffset})`}`)
  }

  addRange = (valueElement: SVGGElement | null, valueObj: IValue, rangeSpecs: IRangeSpecs) => {
    if (!valueElement) return
    const { cellCounts, coords, coverClass, extentForSecondaryAxis="100%", isVertical, lineClass,
            lineOffset=0, rangeMin, rangeMax, rectOffset=0, secondaryAxisX=0, secondaryAxisY=0 } = rangeSpecs
    const rangeMinId = this.generateIdString("min")
    const rangeMinCoverId = this.generateIdString("min-cover")
    const rangeMaxId = this.generateIdString("max")
    const rangeMaxCoverId = this.generateIdString("max-cover")
    const rangeMinCoords = this.calculateRangeCoords(rangeMin, coords, isVertical, cellCounts)
    const rangeMaxCoords = this.calculateRangeCoords(rangeMax, coords, isVertical, cellCounts)
    const x = !isVertical ? secondaryAxisX : rangeMinCoords.x1
    const y = isVertical ? secondaryAxisY : rangeMaxCoords.y1
    const width = isVertical ? this.xScale(rangeMax) - this.xScale(rangeMin) : extentForSecondaryAxis
    const height = !isVertical ? this.yScale(rangeMin) - this.yScale(rangeMax) : extentForSecondaryAxis
    const rangeMinSpecs = {
      isVertical,
      lineClass: `${lineClass} range-line`,
      lineId: rangeMinId,
      offset: lineOffset,
      x1: rangeMinCoords.x1,
      x2: rangeMinCoords.x2,
      y1: rangeMinCoords.y1,
      y2: rangeMinCoords.y2
    }
    const rangeMinCoverSpecs = {...rangeMinSpecs, lineClass: coverClass, lineId: rangeMinCoverId}
    const rangeMaxSpecs = {
      isVertical,
      lineClass: `${lineClass} range-line`,
      lineId: rangeMaxId,
      offset: lineOffset,
      x1: rangeMaxCoords.x1,
      x2: rangeMaxCoords.x2,
      y1: rangeMaxCoords.y1,
      y2: rangeMaxCoords.y2
    }
    const rangeMaxCoverSpecs = {...rangeMaxSpecs, lineClass: coverClass, lineId: rangeMaxCoverId}

    valueObj.range = this.newRect(valueElement, {height, isVertical, rectOffset, width, x, y})
    valueObj.rangeMin = this.newLine(valueElement, rangeMinSpecs)
    valueObj.rangeMinCover = this.newLine(valueElement, rangeMinCoverSpecs)
    valueObj.rangeMax = this.newLine(valueElement, rangeMaxSpecs)
    valueObj.rangeMaxCover = this.newLine(valueElement, rangeMaxCoverSpecs)
  }

  adornmentSpecs = (
    attrId: string, dataConfig: IDataConfigurationModel, value: number, isVertical: boolean,
    cellCounts: Record<string, number>, secondaryAxisX=0, secondaryAxisY=0
  ) => {
    const multiScale = isVertical
      ? this.layout.getAxisMultiScale("bottom")
      : this.layout.getAxisMultiScale("left")
    const displayValue = multiScale?.formatValueForScale(value) || valueLabelString(value)
    const plotValue = Number(displayValue) // Is this really just `value`?
    const measureRange: IRange | undefined = attrId && this.model.hasRange
      ? this.model.computeMeasureRange(attrId, this.cellKey, dataConfig)
      : {}
    const displayRange = measureRange.min || measureRange.min === 0
      ? multiScale?.formatValueForScale(measureRange.min) || valueLabelString(measureRange.min)
      : undefined
    const {x: x1, y: y1} =
      this.calculateLineCoords(plotValue, 1, isVertical, cellCounts, secondaryAxisX, secondaryAxisY)
    const {x: x2, y: y2} =
      this.calculateLineCoords(plotValue, 2, isVertical, cellCounts, secondaryAxisX, secondaryAxisY)
    const lineClass = clsx("measure-line", `${this.measureSlug}-line`)
    const lineId = this.generateIdString("line")
    const coverClass = clsx("measure-cover", `${this.measureSlug}-cover`)
    const coverId = this.generateIdString("cover")

    return {
      coords: {x1, x2, y1, y2},
      coverClass,
      coverId,
      displayRange,
      displayValue,
      lineClass,
      lineId,
      measureRange,
      plotValue
    }
  }
}
