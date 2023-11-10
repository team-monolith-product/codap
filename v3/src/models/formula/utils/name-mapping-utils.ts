import {
  LOCAL_ATTR, GLOBAL_VALUE, CANONICAL_NAME, CASE_INDEX_FAKE_ATTR_ID, DisplayNameMap, CanonicalNameMap,
} from "../formula-types"
import type { IDataSet } from "../../data/data-set"
import type { IGlobalValueManager } from "../../global/global-value-manager"

export const safeSymbolName = (name: string) =>
  name
    // Math.js does not allow to use symbols that start with a number, so we need to add a prefix.
    .replace(/^(\d+)/, '_$1')
    // We also need to escape all the symbols that are not allowed in Math.js.
    .replace(/[^a-zA-Z0-9_]/g, "_")

export const localAttrIdToCanonical = (attrId: string) => `${CANONICAL_NAME}${LOCAL_ATTR}${attrId}`

export const globalValueIdToCanonical = (globalId: string) => `${CANONICAL_NAME}${GLOBAL_VALUE}${globalId}`

export const idToCanonical = (id: string) => `${CANONICAL_NAME}${id}`

export interface IDisplayNameMapOptions {
  localDataSet: IDataSet
  dataSets: Map<string, IDataSet>
  globalValueManager?: IGlobalValueManager
}

// useSafeSymbolNames should be set to false only when display map is generated to be reversed into canonical map.
export const getDisplayNameMap = (options: IDisplayNameMapOptions, useSafeSymbolNames = true) => {
  const { localDataSet, dataSets, globalValueManager } = options

  const displayNameMap: DisplayNameMap = {
    localNames: {},
    dataSet: {}
  }

  const nonEmptyName = (name: string) => name || "_empty_symbol_name_"

  const key = (name: string, _useSafeSymbolNames = useSafeSymbolNames) =>
    nonEmptyName(_useSafeSymbolNames ? safeSymbolName(name) : name)

  // When localNames are generated, the order of processing various sources of names is important.
  // The last source would provide the final canonical name for the symbol. So, currently the global values
  // have the lowest priority, then local attributes, and finally the reserved symbols like `caseIndex`.
  globalValueManager?.globals.forEach(global => {
    displayNameMap.localNames[key(global.name)] = `${CANONICAL_NAME}${GLOBAL_VALUE}${global.id}`
  })

  localDataSet.attributes.forEach(attr => {
    displayNameMap.localNames[key(attr.name)] = localAttrIdToCanonical(attr.id)
  })

  // caseIndex is a special name supported by formulas. It essentially behaves like a local data set attribute
  // that returns the current, 1-based index of the case in its collection group.
  displayNameMap.localNames.caseIndex = localAttrIdToCanonical(CASE_INDEX_FAKE_ATTR_ID)

  dataSets.forEach(dataSet => {
    if (dataSet.name) {
      // No LOCAL_ATTR prefix is necessary for external attributes. They always need to be resolved manually by custom
      // mathjs functions (like "lookupByIndex"). Also, it's never necessary to use safe names, as these names
      // are string constants, not a symbols, so MathJS will not care about special characters there.
      const dataSetKey = key(dataSet.name, false)
      displayNameMap.dataSet[dataSetKey] = {
        id: idToCanonical(dataSet.id),
        attribute: {}
      }
      dataSet.attributes.forEach(attr => {
        displayNameMap.dataSet[dataSetKey].attribute[key(attr.name, false)] = idToCanonical(attr.id)
      })
    }
  })

  return displayNameMap
}

export const reverseDisplayNameMap = (displayNameMap: DisplayNameMap): CanonicalNameMap => {
  return Object.fromEntries([
    ...Object.entries(displayNameMap.localNames).map(([attrName, attrId]) => [attrId, attrName]),
    ...Object.entries(displayNameMap.dataSet).map(([dataSetName, dataSet]) => [dataSet.id, dataSetName]),
    ...Object.entries(displayNameMap.dataSet).flatMap(([dataSetName, dataSet]) =>
      Object.entries(dataSet.attribute).map(([attrName, attrId]) => [attrId, attrName])
    )
  ])
}

export const getCanonicalNameMap = (options: IDisplayNameMapOptions) => {
  const displayNameMap = getDisplayNameMap(options, false) // useSafeSymbolNames = false
  return reverseDisplayNameMap(displayNameMap)
}
