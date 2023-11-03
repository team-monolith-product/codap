import { ConstantNode, MathNode } from "mathjs"
import { FormulaMathJsScope } from "../formula-mathjs-scope"
import { DisplayNameMap, ILookupDependency, isConstantStringNode, rmCanonicalPrefix } from "../formula-types"
import { UNDEF_RESULT, equal, evaluateNode } from "./function-utils"
import type { IDataSet } from "../../data/data-set"
import t from "../../../utilities/translation/translate"

type LookupStringConstantArg = ConstantNode<string> | undefined

export const lookupFunctions = {
  // lookupByIndex("dataSetName", "attributeName", index)
  lookupByIndex: {
    numOfRequiredArguments: 3,
    getDependency: (args: MathNode[]): ILookupDependency => {
      const [dataSetNameArg, attrNameArg] = args as LookupStringConstantArg[]
      return {
        type: "lookup",
        dataSetId: rmCanonicalPrefix(dataSetNameArg?.value),
        attrId: rmCanonicalPrefix(attrNameArg?.value),
      }
    },
    canonicalize: (args: MathNode[], displayNameMap: DisplayNameMap) => {
      const [dataSetNameArg, attrNameArg] = args as LookupStringConstantArg[]
      const dataSetName = dataSetNameArg?.value || ""
      const attrName = attrNameArg?.value || ""
      if (dataSetNameArg) {
        dataSetNameArg.value = displayNameMap.dataSet[dataSetName]?.id || dataSetName
      }
      if (attrNameArg) {
        attrNameArg.value = displayNameMap.dataSet[dataSetName]?.attribute[attrName] || attrName
      }
    },
    evaluateRaw: (args: MathNode[], mathjs: any, scope: FormulaMathJsScope) => {
      const functionName = "lookupByIndex"
      const numOfReqArgs = lookupFunctions.lookupByIndex.numOfRequiredArguments
      if (args.length !== numOfReqArgs) {
        throw new Error(t("DG.Formula.FuncArgsErrorPlural.description", { vars: [ functionName, numOfReqArgs ] }))
      }
      [0, 1].forEach(i => {
        if (!isConstantStringNode(args[i])) {
          throw new Error(t("V3.formula.error.stringConstantArg", { vars: [ functionName, i + 1 ] }))
        }
      })
      const { dataSetId, attrId } = lookupFunctions.lookupByIndex.getDependency(args)
      const zeroBasedIndex = evaluateNode(args[2], scope) - 1
      const dataSet = scope.getDataSet(dataSetId)
      if (!dataSet) {
        throw new Error(t("DG.Formula.LookupDataSetError.description", { vars: [ dataSetId ] }))
      }
      if (!dataSet.attrFromID(attrId)) {
        throw new Error(t("DG.Formula.LookupAttrError.description", { vars: [ attrId, dataSet.name || "" ] }))
      }
      return dataSet.getValueAtIndex(zeroBasedIndex, attrId) || UNDEF_RESULT
    }
  },

  // lookupByKey("dataSetName", "attributeName", "keyAttributeName", "keyAttributeValue" | localKeyAttribute)
  lookupByKey: {
    numOfRequiredArguments: 4,
    getDependency: (args: MathNode[]): Required<ILookupDependency> => {
      const [dataSetNameArg, attrNameArg, keyAttrNameArg] = args as LookupStringConstantArg[]
      return {
        type: "lookup",
        dataSetId: rmCanonicalPrefix(dataSetNameArg?.value),
        attrId: rmCanonicalPrefix(attrNameArg?.value),
        keyAttrId: rmCanonicalPrefix(keyAttrNameArg?.value)
      }
    },
    canonicalize: (args: MathNode[], displayNameMap: DisplayNameMap) => {
      const [dataSetNameArg, attrNameArg, keyAttrNameArg] = args as LookupStringConstantArg[]
      const dataSetName = dataSetNameArg?.value || ""
      const attrName = attrNameArg?.value || ""
      const keyAttrName = keyAttrNameArg?.value || ""
      if (dataSetNameArg) {
        dataSetNameArg.value = displayNameMap.dataSet[dataSetName]?.id || dataSetName
      }
      if (attrNameArg) {
        attrNameArg.value = displayNameMap.dataSet[dataSetName]?.attribute[attrName] || attrName
      }
      if (keyAttrNameArg) {
        keyAttrNameArg.value = displayNameMap.dataSet[dataSetName]?.attribute[keyAttrName] || keyAttrName
      }
    },
    evaluateRaw: (args: MathNode[], mathjs: any, scope: FormulaMathJsScope) => {
      const functionName = "lookupByKey"
      const numOfReqArgs = lookupFunctions.lookupByKey.numOfRequiredArguments
      if (args.length !== numOfReqArgs) {
        throw new Error(t("DG.Formula.FuncArgsErrorPlural.description", { vars: [ functionName, numOfReqArgs ] }))
      }
      [0, 1, 2].forEach(i => {
        if (!isConstantStringNode(args[i])) {
          throw new Error(t("V3.formula.error.stringConstantArg", { vars: [ functionName, i + 1 ] }))
        }
      })
      const { dataSetId, attrId, keyAttrId } = lookupFunctions.lookupByKey.getDependency(args)
      const keyAttrValue = evaluateNode(args[3], scope)
      const dataSet: IDataSet | undefined = scope.getDataSet(dataSetId)
      if (!dataSet) {
        throw new Error(t("DG.Formula.LookupDataSetError.description", { vars: [ dataSetId ] }))
      }
      if (!dataSet.attrFromID(attrId)) {
        throw new Error(t("DG.Formula.LookupAttrError.description", { vars: [ attrId, dataSet.name || "" ] }))
      }
      if (!dataSet.attrFromID(keyAttrId)) {
        throw new Error(t("DG.Formula.LookupAttrError.description", { vars: [ keyAttrId, dataSet.name || "" ] }))
      }
      for (const c of dataSet.cases) {
        const val = dataSet.getValue(c.__id__, keyAttrId)
        if (equal(val, keyAttrValue)) {
          return dataSet.getValue(c.__id__, attrId) || UNDEF_RESULT
        }
      }
      return UNDEF_RESULT
    },
  },
}
