import { Instance, types } from "mobx-state-tree"
import { mean, std } from "mathjs"
import {IGraphDataConfigurationModel} from "../../../models/graph-data-configuration-model"
import {
  UnivariateMeasureAdornmentModel, IUnivariateMeasureAdornmentModel
} from "../univariate-measure-adornment-model"
import { kStandardDeviationValueTitleKey, kStandardDeviationType } from "./standard-deviation-adornment-types"

export const StandardDeviationAdornmentModel = UnivariateMeasureAdornmentModel
  .named("StandardDeviationAdornmentModel")
  .props({
    type: types.optional(types.literal(kStandardDeviationType), kStandardDeviationType),
    labelTitle: types.optional(types.literal(kStandardDeviationValueTitleKey), kStandardDeviationValueTitleKey)
  })
  .views(self => ({
    get hasRange() {
      return true
    },
    computeMeasureRange(attrId: string, cellKey: Record<string, string>, dataConfig: IGraphDataConfigurationModel) {
      const caseValues = self.getCaseValues(attrId, cellKey, dataConfig)
      return std(caseValues)
    },
    computeMeasureValue(attrId: string, cellKey: Record<string, string>, dataConfig: IGraphDataConfigurationModel) {
      const caseValues = self.getCaseValues(attrId, cellKey, dataConfig)
      if (caseValues.length === 0) return NaN
      return mean(caseValues)
    }
  }))

export interface IStandardDeviationAdornmentModel extends Instance<typeof StandardDeviationAdornmentModel> {}
export function isStandardDeviationAdornment(adornment: IUnivariateMeasureAdornmentModel):
  adornment is IStandardDeviationAdornmentModel {
  return adornment.type === kStandardDeviationType
}