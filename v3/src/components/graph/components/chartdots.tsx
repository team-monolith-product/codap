import {ScaleBand, select} from "d3"
import React, {memo, useCallback} from "react"
import {attrRoleToAxisPlace, PlotProps, transitionDuration} from "../graphing-types"
import {usePlotResponders} from "../hooks/use-plot"
import {useDataConfigurationContext} from "../hooks/use-data-configuration-context"
import {useDataSetContext} from "../../../hooks/use-data-set-context"
import {Bounds, useGraphLayoutContext} from "../models/graph-layout"
import {setPointSelection} from "../utilities/graph-utils"
import {useGraphModelContext} from "../models/graph-model"
import {defaultSelectedColor} from "../../../utilities/color-utils"

type BinMap = Record<string, Record<string, number>>

export const ChartDots = memo(function ChartDots(props: PlotProps) {
  const {dotsRef, enableAnimation} = props,
    graphModel= useGraphModelContext(),
    {pointColor, pointStrokeColor} = graphModel,
    dataConfiguration = useDataConfigurationContext(),
    dataset = useDataSetContext(),
    layout = useGraphLayoutContext(),
    xAttribute = dataConfiguration?.attributeID('x'),
    yAttribute = dataConfiguration?.attributeID('y')
  const primaryAttrPlace = xAttribute ? 'x' :
      yAttribute ? 'y' : undefined,
    primaryAxisPlace = primaryAttrPlace ? attrRoleToAxisPlace[primaryAttrPlace] : undefined,
    primaryIsBottom = primaryAxisPlace === 'bottom',
    primaryAttrID = primaryAttrPlace ? dataConfiguration?.attributeID(primaryAttrPlace) : '',
    secondaryAttrPlace = primaryAttrPlace === 'x' ? 'y' :
      primaryAttrPlace === 'y' ? 'x' : undefined,
    secondaryAxisPlace = secondaryAttrPlace ? attrRoleToAxisPlace[secondaryAttrPlace] : undefined,
    secondaryAttrID = secondaryAttrPlace ? dataConfiguration?.attributeID(secondaryAttrPlace) : '',
    legendAttrID = dataConfiguration?.attributeID('legend'),
    primaryScale = primaryAxisPlace ? layout.getAxisScale(primaryAxisPlace) as ScaleBand<string> : undefined,
    secondaryScale = secondaryAxisPlace ? layout.getAxisScale(secondaryAxisPlace) as ScaleBand<string> : undefined

  const computeMaxOverAllCells = useCallback(() => {
    const valuePairs = (dataConfiguration?.cases || []).map(caseID => {
        return {
          primary: (primaryAttrID && dataset?.getValue(caseID, primaryAttrID)) ?? '',
          secondary: (secondaryAttrID && dataset?.getValue(caseID, secondaryAttrID)) ?? '__main__'
        }
      }),
      bins: BinMap = {}
    valuePairs?.forEach(aValue => {
      if (bins[aValue.primary] === undefined) {
        bins[aValue.primary] = {}
      }
      if (bins[aValue.primary][aValue.secondary] === undefined) {
        bins[aValue.primary][aValue.secondary] = 0
      }
      bins[aValue.primary][aValue.secondary]++
    })
    return Object.keys(bins).reduce((hMax, hKey) => {
      return Math.max(hMax, Object.keys(bins[hKey]).reduce((vMax, vKey) => {
        return Math.max(vMax, bins[hKey][vKey])
      }, 0))
    }, 0)
  }, [dataset, dataConfiguration?.cases, primaryAttrID, secondaryAttrID])

  const refreshPointSelection = useCallback(() => {
    dataConfiguration && setPointSelection({ pointColor, pointStrokeColor, dotsRef, dataConfiguration,
      pointRadius: graphModel.getPointRadius(), selectedPointRadius: graphModel.getPointRadius('select')
    })
  }, [dataConfiguration, dotsRef, graphModel, pointColor, pointStrokeColor])

  const refreshPointPositions = useCallback((selectedOnly: boolean) => {
    // We're pretending that the primaryPlace is the bottom just to help understand the naming
    const
      primaryCategoriesArray: string[] = (dataConfiguration && primaryAttrPlace) ?
        Array.from(dataConfiguration.categorySetForAttrRole(primaryAttrPlace)) : [],
      secondaryCategoriesArray: string[] = (dataConfiguration && secondaryAttrPlace) ?
        Array.from(dataConfiguration.categorySetForAttrRole(secondaryAttrPlace)) : [],
      pointDiameter = 2 * graphModel.getPointRadius(),
      selection = select(dotsRef.current).selectAll(selectedOnly ? '.graph-dot-highlighted' : '.graph-dot'),
      primaryCellWidth = primaryScale?.bandwidth() ?? 0,
      primaryHeight = secondaryScale?.bandwidth ? secondaryScale.bandwidth() :
        (secondaryAxisPlace ? layout.getAxisLength(secondaryAxisPlace) : 0),
      categoriesMap: Record<string, Record<string, { cell: { h: number, v: number }, numSoFar: number }>> = {},
      getLegendColor = legendAttrID ? dataConfiguration?.getLegendColorForCase : undefined

    const computeCellParams = () => {
        primaryCategoriesArray.forEach((primeCat, i) => {
          if (!categoriesMap[primeCat]) {
            categoriesMap[primeCat] = {}
          }
          secondaryCategoriesArray.forEach((secCat, j) => {
            categoriesMap[primeCat][secCat] = {cell: {h: i, v: j}, numSoFar: 0}
          })
        })

        const
          secondaryGap = 5,
          maxInCell = computeMaxOverAllCells(),
          allowedPointsPerColumn = Math.max(1, Math.floor((primaryHeight - secondaryGap) / pointDiameter)),
          primaryGap = 18,
          allowedPointsPerRow = Math.max(1, Math.floor((primaryCellWidth - primaryGap) / pointDiameter)),
          numPointsInRow = Math.max(1, Math.min(allowedPointsPerRow,
            Math.ceil(maxInCell / allowedPointsPerColumn))),
          actualPointsPerColumn = Math.ceil(maxInCell / numPointsInRow),
          overlap = -Math.max(0, ((actualPointsPerColumn + 1) * pointDiameter - primaryHeight) /
            actualPointsPerColumn)
        return {numPointsInRow, overlap}
      },
      cellParams = computeCellParams(),

      buildMapOfIndicesByCase = () => {
        const indices: Record<string, { cell: { h: number, v: number }, row: number, column: number }> = {}
        primaryAttrID && (dataConfiguration?.cases || []).forEach(anID => {
          const hCat = dataset?.getValue(anID, primaryAttrID),
            vCat = secondaryAttrID ? dataset?.getValue(anID, secondaryAttrID) : '__main__',
            mapEntry = categoriesMap[hCat][vCat],
            numInCell = mapEntry.numSoFar++,
            row = Math.floor(numInCell / cellParams.numPointsInRow),
            column = numInCell % cellParams.numPointsInRow
          indices[anID] = {cell: mapEntry.cell, row, column}
        })
        return indices
      },
      cellIndices = buildMapOfIndicesByCase(),
      baseCoord = primaryIsBottom ? 0 : layout.getAxisLength('left'),
      signForOffset = primaryIsBottom ? 1 : -1,
      primaryCenterKey = primaryIsBottom ? 'cx' : 'cy',
      secondaryCenterKey = primaryIsBottom ? 'cy' : 'cx',

      lookupLegendColor = (id: string) => {
        const isSelected = dataset?.isCaseSelected(id),
          legendColor = getLegendColor?.(id) ?? ''
        return legendColor !== '' ? legendColor :
          isSelected ? defaultSelectedColor : graphModel.pointColor
      },
      onComplete = () => {
        if (enableAnimation.current) {
          enableAnimation.current = false
          setPoints()
        }
      },

      setPoints = () => {
        const duration = enableAnimation.current ? transitionDuration : 0,
          plotBounds = layout.computedBounds.get('plot') as Bounds,
          transform = `translate(${plotBounds.left}, ${plotBounds.top})`
        selection
          .attr('transform', transform)
          .transition()
          .duration(duration)
          .on('end', (id, i) => (i === selection.size() - 1) && onComplete?.())
          .attr(primaryCenterKey, (anID: string) => {
            if (cellIndices[anID]) {
              const {column} = cellIndices[anID],
                {h} = cellIndices[anID].cell
              return baseCoord + signForOffset * ((h + 0.5) * primaryCellWidth) + (column + 0.5) * pointDiameter -
                cellParams.numPointsInRow * pointDiameter / 2
            } else {
              return NaN
            }
          })
          .attr(secondaryCenterKey, (anID: string) => {
            if (cellIndices[anID] && secondaryScale) {
              const {row} = cellIndices[anID],
                {v} = cellIndices[anID].cell
              return secondaryScale.range()[0] -
                signForOffset * (v * primaryHeight + (row + 0.5) * pointDiameter + row * cellParams.overlap)
            } else {
              return NaN
            }
          })
          .style('fill', (anID: string) => lookupLegendColor(anID))
      }

    setPoints()
  }, [dataConfiguration, primaryAttrPlace, secondaryAttrPlace, graphModel, dotsRef,
    enableAnimation, primaryScale, primaryIsBottom, layout, secondaryAxisPlace,
    computeMaxOverAllCells, primaryAttrID, secondaryAttrID, legendAttrID, dataset, secondaryScale])

  usePlotResponders({
    graphModel, layout, dotsRef, refreshPointPositions, refreshPointSelection, enableAnimation,
    primaryAttrID, secondaryAttrID, legendAttrID
  })

  return (
    <></>
  )
})