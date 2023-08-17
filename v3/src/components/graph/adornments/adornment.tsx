import React, { useEffect, useRef } from "react"
import { clsx } from "clsx"
import { observer } from "mobx-react-lite"
import { IAdornmentModel } from "./adornment-models"
import { useGraphContentModelContext } from "../hooks/use-graph-content-model-context"
import { useGraphLayoutContext } from "../models/graph-layout"
import { INumericAxisModel } from "../../axis/models/axis-model"
import { getAdornmentComponentInfo } from "./adornment-component-info"
import {transitionDuration} from "../../data-display/data-display-types"

import "./adornment.scss"

interface IProps {
  adornment: IAdornmentModel
  cellKey: Record<string, string>
  topCats: string[] | number[]
  rightCats: string[] | number[]
}

export const Adornment = observer(function Adornment(
  {adornment, cellKey, topCats, rightCats}: IProps
) {
  const graphModel = useGraphContentModelContext(),
    layout = useGraphLayoutContext(),
    subPlotWidth = topCats.length > 0
                     ? layout.plotWidth / topCats.length
                     : layout.plotWidth,
    subPlotHeight = rightCats.length > 0
                      ? layout.plotHeight / rightCats.length
                      : layout.plotHeight,
    isFadeInComplete = useRef(false),
    isFadeOutComplete = useRef(false)

  useEffect(function fadeInCleanup() {
    isFadeInComplete.current = adornment.isVisible
    isFadeOutComplete.current = !adornment.isVisible
  }, [adornment.isVisible])

  const classFromCellKey = adornment.classNameFromKey(cellKey)
  // The adornmentKey is a unique value used for React's key prop and for the adornment wrapper's HTML ID.
  // We can't use the cellKey because that value may be duplicated if there are multiple types of
  // adornments active on the graph.
  const adornmentKey = `${adornment.id}${classFromCellKey ? `-${classFromCellKey}` : ''}`
  const componentInfo = getAdornmentComponentInfo(adornment.type)
  if (!componentInfo) return null
  const { Component } = componentInfo

  const adornmentWrapperClass = clsx(
    'adornment-wrapper',
    `${adornmentKey}-wrapper`,
    `${classFromCellKey}`,
    {
      'fadeIn': adornment.isVisible && !isFadeInComplete.current,
      'fadeOut': !adornment.isVisible && !isFadeOutComplete.current,
      'hidden': !adornment.isVisible && isFadeOutComplete.current
    }
  )

  return (
    <div
      id={adornmentKey}
      className={adornmentWrapperClass}
      style={{animationDuration: `${transitionDuration}ms`}}
      data-testid={'adornment-wrapper'}
    >
      <Component
        containerId={adornmentKey}
        key={adornmentKey}
        model={adornment}
        plotHeight={subPlotHeight}
        plotWidth={subPlotWidth}
        cellKey={cellKey}
        xAxis={graphModel.getAxis('bottom') as INumericAxisModel}
        yAxis={graphModel.getAxis('left') as INumericAxisModel}
      />
    </div>
  )
})
