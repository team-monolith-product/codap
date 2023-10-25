import { makeObservable, observable } from "mobx"
import { ICase } from "../data/data-set-types"
import { formulaError } from "./formula-utils"
import { IFormula } from "./formula"
import { math } from "./functions/math"
import type {
  IFormulaAdapterApi, IFormulaContext, IFormulaExtraMetadata, IFormulaManagerAdapter
} from "./formula-manager"
import type { IGraphContentModel } from "../../components/graph/models/graph-content-model"
import { onAnyAction } from "../../utilities/mst-utils"
import {
  isPlottedValueAdornment
} from "../../components/graph/adornments/univariate-measures/plotted-value/plotted-value-adornment-model"
import { IAnyStateTreeNode } from "@concord-consortium/mobx-state-tree"
import { getFormulaManager } from "../tiles/tile-environment"
import { FormulaMathJsScope } from "./formula-mathjs-scope"
import { DEBUG_FORMULAS } from "../../lib/debug"
import {
  kPlottedValueType
} from "../../components/graph/adornments/univariate-measures/plotted-value/plotted-value-adornment-types"

const PLOTTED_VALUE_FORMULA_ADAPTER = "PlottedValueFormulaAdapter"

interface IPlottedValueFormulaExtraMetadata extends IFormulaExtraMetadata {
  graphContentModelId: string
}

export const getPlottedValueFormulaAdapter = (node?: IAnyStateTreeNode): PlottedValueFormulaAdapter | undefined =>
  getFormulaManager(node)?.adapters.find(a => a.type === PLOTTED_VALUE_FORMULA_ADAPTER) as PlottedValueFormulaAdapter

export class PlottedValueFormulaAdapter implements IFormulaManagerAdapter {
  type = PLOTTED_VALUE_FORMULA_ADAPTER
  api: IFormulaAdapterApi

  @observable.shallow graphContentModels = new Map<string, IGraphContentModel>()

  constructor(api: IFormulaAdapterApi) {
    makeObservable(this)
    this.api = api
  }

  addGraphContentModel(graphContentModel: IGraphContentModel) {
    this.graphContentModels.set(graphContentModel.id, graphContentModel)
  }

  removeGraphContentModel(graphContentModelId: string) {
    this.graphContentModels.delete(graphContentModelId)
  }

  setupFormulaObservers(formulaContext: IFormulaContext, extraMetadata: IPlottedValueFormulaExtraMetadata) {
    const { graphContentModelId } = extraMetadata
    const graphContentModel = this.graphContentModels.get(graphContentModelId)
    const dispose = onAnyAction(graphContentModel, mstAction => {
      if (mstAction.name === "setAttributeID") {
        this.recalculateFormula(formulaContext, extraMetadata)
      }
    })
    return dispose
  }

  getAllFormulas(): ({ formula: IFormula, extraMetadata?: IPlottedValueFormulaExtraMetadata })[] {
    const result: ({ formula: IFormula, extraMetadata: IPlottedValueFormulaExtraMetadata })[] = []
    this.graphContentModels.forEach(graphContentModel => {
      graphContentModel.adornments.forEach(adornment => {
        if (graphContentModel.dataset && isPlottedValueAdornment(adornment)) {
          result.push({
            formula: adornment.formula,
            extraMetadata: {
              graphContentModelId: graphContentModel.id,
              dataSetId: graphContentModel.dataset.id,
            }
          })
        }
      })
    })
    return result
  }

  recalculateFormula(formulaContext: IFormulaContext, extraMetadata: IPlottedValueFormulaExtraMetadata) {
    const { graphContentModelId } = extraMetadata
    const graphContentModel = this.graphContentModels.get(graphContentModelId)
    if (!graphContentModel) {
      throw new Error(`GraphContentModel with id "${graphContentModelId}" not found`)
    }
    const adornment = graphContentModel.adornments.find(a => a.type === kPlottedValueType)
    if (!adornment || !isPlottedValueAdornment(adornment)) {
      throw new Error(`Adornment of type "${kPlottedValueType}" not found`)
    }
    // This code is mostly copied from UnivariateMeasureAdornmentModel.updateCategories.
    // TODO: Is there a way to share it somehow?
    const options = graphContentModel.getUpdateCategoriesOptions()
    const { xCats, yCats, topCats, rightCats, resetPoints, dataConfig } = options
    if (!dataConfig) return
    const topCatCount = topCats.length || 1
    const rightCatCount = rightCats.length || 1
    const xCatCount = xCats.length || 1
    const yCatCount = yCats.length || 1
    const columnCount = topCatCount * xCatCount
    const rowCount = rightCatCount * yCatCount
    const totalCount = rowCount * columnCount
    // TODO: use it as a default argument while working on this feature?
    // const attrId = dataConfig.primaryAttributeID
    for (let i = 0; i < totalCount; ++i) {
      const cellKey = adornment.cellKey(options, i)
      const instanceKey = adornment.instanceKey(cellKey)
      const cases = dataConfig.subPlotCases(cellKey)
      const value = Number(this.computeFormula(formulaContext, extraMetadata, cases))
      if (!adornment.measures.get(instanceKey) || resetPoints) {
        adornment.addMeasure(value, instanceKey)
      } else {
        adornment.updateMeasureValue(value, instanceKey)
      }
    }
  }

  computeFormula(formulaContext: IFormulaContext, extraMetadata: IPlottedValueFormulaExtraMetadata,
    childMostCases: ICase[]) {
    const { formula, dataSet } = formulaContext

    if (DEBUG_FORMULAS) {
      console.log(`[plotted value formula] recalculate "${formula.canonical}"`)
    }

    const formulaScope = new FormulaMathJsScope({
      localDataSet: dataSet,
      dataSets: this.api.getDatasets(),
      globalValueManager: this.api.getGlobalValueManager(),
      caseIds: [],
      childMostCollectionCaseIds: childMostCases.map(c => c.__id__),
    })

    try {
      const compiledFormula = math.compile(formula.canonical)
      return compiledFormula.evaluate(formulaScope)
    } catch (e: any) {
      this.setFormulaError(formulaContext, extraMetadata, formulaError(e.message))
    }
  }

  setFormulaError(formulaContext: IFormulaContext, extraMetadata: IPlottedValueFormulaExtraMetadata, errorMsg: string) {
    // TODO
  }

  getFormulaError(formulaContext: IFormulaContext, extraMetadata: any) {
    // No custom errors yet.
    return undefined
  }
}