import {LatLngBounds, Layer, Map as LeafletMap, Polygon} from 'leaflet'
import {comparer, reaction} from "mobx"
import {addDisposer, getSnapshot, Instance, SnapshotIn, types} from "mobx-state-tree"
import {ITileContentModel} from "../../../models/tiles/tile-content"
import {applyModelChange} from "../../../models/history/apply-model-change"
import {withoutUndo} from '../../../models/history/without-undo'
import {IDataSet} from "../../../models/data/data-set"
import {ISharedDataSet, kSharedDataSetType, SharedDataSet} from "../../../models/shared/shared-data-set"
import {getSharedCaseMetadataFromDataset} from "../../../models/shared/shared-data-utils"
import {kMapModelName, kMapTileType} from "../map-defs"
import {BaseMapKey, BaseMapKeys} from "../map-types"
import {
  datasetHasBoundaryData, datasetHasLatLongData, expandLatLngBounds, getLatLongBounds, latLongAttributesFromDataSet
} from "../utilities/map-utils"
import {GraphPlace} from '../../axis-graph-shared'
import {DataDisplayContentModel} from "../../data-display/models/data-display-content-model"
import {isMapPolygonLayerModel, MapPolygonLayerModel} from "./map-polygon-layer-model"
import {MapPointLayerModel} from "./map-point-layer-model"
import {ILatLngSnapshot, LatLngModel} from '../map-model-types'
import {LeafletMapState} from './leaflet-map-state'
import {isMapLayerModel} from "./map-layer-model"

export const MapContentModel = DataDisplayContentModel
  .named(kMapModelName)
  .props({
    type: types.optional(types.literal(kMapTileType), kMapTileType),

    // center and zoom are kept in sync with Leaflet's map state
    center: types.optional(LatLngModel, () => LatLngModel.create()),
    zoom: -1, // -1 means no zoom has yet been set

    // This is the name of the layer used as an argument to L.esri.basemapLayer
    baseMapLayerName: types.optional(types.enumeration([...BaseMapKeys]), 'topo'),

    // Changes the visibility of the layer in Leaflet with the opacity parameter
    baseMapLayerIsVisible: true,
    plotBackgroundColor: '#FFFFFF01',
  })
  .volatile(() => ({
    leafletMap: undefined as LeafletMap | undefined,
    leafletMapState: new LeafletMapState(),
    isLeafletMapInitialized: false,
    isSharedDataInitialized: false,
    // used to track whether a given change was initiated by leaflet or CODAP
    syncFromLeafletCount: 0,
    syncFromLeafletResponseCount: 0,
    _ignoreLeafletClicks: false,
  }))
  .views(self => ({
    get latLongBounds() {
      let overallBounds: LatLngBounds | undefined

      const applyBounds = (bounds: LatLngBounds | undefined) => {
        if (bounds) {
          if (overallBounds) {
            overallBounds.extend(bounds)
          } else {
            overallBounds = bounds
          }
        }
      }

      self.layers.forEach(({dataConfiguration}) => {
        applyBounds(getLatLongBounds(dataConfiguration))
      })
      self.leafletMap?.eachLayer(function (iLayer: Layer) {
        const polygon = iLayer as Polygon
        polygon.getBounds && applyBounds(polygon.getBounds())
      })

      return overallBounds
    },
    get datasetsArray(): IDataSet[] {
      const datasets: IDataSet[] = []
      self.layers.filter(isMapLayerModel).forEach(layer => {
        const dataset = layer.dataConfiguration.dataset
        if (dataset) {
          datasets.push(dataset)
        }
      })
      return datasets
    }
  }))
  .actions(self => ({
    // Each layer can have one legend attribute. The layer that can handle the given legend attribute must already
    // be present in the layers array
    setLegendAttributeID(datasetID: string, attributeID: string) {
      const foundLayer = self.layers.find(layer => layer.data?.id === datasetID)
      if (foundLayer) {
        foundLayer.dataConfiguration.setAttribute('legend', {attributeID})
      }
    },
    setCenterAndZoom(center: ILatLngSnapshot, zoom: number) {
      self.center = center
      self.zoom = zoom
    },
  }))
  // performs the specified action so that response actions are included and undo/redo strings assigned
  .actions(applyModelChange)
  .actions(self => ({
    syncLeafletResponseCount(count: number) {
      self.syncFromLeafletResponseCount = count
    },
    syncCenterAndZoomFromMap() {
      if (self.leafletMap) {
        ++self.syncFromLeafletCount
        self.setCenterAndZoom(self.leafletMap.getCenter(), self.leafletMap.getZoom())
      }
    },
    syncCenterAndZoomFromMapWithoutUndo() {
      withoutUndo()
      this.syncCenterAndZoomFromMap()
    },
    rescale(undoStringKey = "", redoStringKey = "") {
      const bounds = self.latLongBounds
      if (bounds) {
        self.leafletMapState.adjustMapView({
          fitBounds: expandLatLngBounds(bounds, 1.1),
          animate: !!undoStringKey && !!redoStringKey,
          undoStringKey, redoStringKey
        })
      }
    },
    setBaseMapLayerName(name: BaseMapKey) {
      self.baseMapLayerName = name
    },
    setBaseMapLayerVisibility(isVisible: boolean) {
      self.baseMapLayerIsVisible = isVisible
    },
    ignoreLeafletClicks(ignore: boolean) {
      self._ignoreLeafletClicks = ignore
    }
  }))
  .actions(self => ({
    addPointLayer(dataSet: IDataSet) {
      const newPointLayer = MapPointLayerModel.create({layerIndex: self.layers.length})
      self.layers.push(newPointLayer) // We have to do this first so safe references will work
      const dataConfiguration = newPointLayer.dataConfiguration,
        {latId, longId} = latLongAttributesFromDataSet(dataSet)
      dataConfiguration.setDataset(dataSet, getSharedCaseMetadataFromDataset(dataSet))
      dataConfiguration.setAttribute('lat', {attributeID: latId})
      dataConfiguration.setAttribute('long', {attributeID: longId})
      return newPointLayer
    },
    addPolygonLayer(dataSet: IDataSet) {
      const newPolygonLayer = MapPolygonLayerModel.create()
      self.layers.push(newPolygonLayer) // We have to do this first so safe references will work
      newPolygonLayer.setDataset(dataSet)
      return newPolygonLayer
    },
    afterCreate() {
      addDisposer(self, () => self.leafletMapState.destroy())

      // synchronize leaflet state (center, zoom) to map model state
      addDisposer(self, reaction(
        () => {
          const {isChanging, center, zoom} = self.leafletMapState
          return {isChanging, center, zoom}
        },
        ({isChanging, center, zoom}) => {
          // don't sync map state to model until map change is complete
          if (!isChanging) {
            // if undo/redo strings are specified, then treat change as undoable
            if (self.leafletMapState.undoStringKey && self.leafletMapState.redoStringKey) {
              self.applyModelChange(() => {
                self.syncCenterAndZoomFromMap()
              }, {
                log: self.leafletMapState.log,
                undoStringKey: self.leafletMapState.undoStringKey,
                redoStringKey: self.leafletMapState.redoStringKey
              })
            }
            // otherwise, sync map state to model without undo
            else {
              self.syncCenterAndZoomFromMapWithoutUndo()
            }
          }
        },
        {name: "MapContentModel.afterCreate.reaction [leafletState]", equals: comparer.structural}
      ))

      // synchronize map model state to leaflet map state
      addDisposer(self, reaction(
        () => {
          const {zoom, syncFromLeafletCount} = self
          return {center: getSnapshot(self.center), zoom, syncFromLeafletCount}
        },
        ({center, zoom, syncFromLeafletCount}) => {
          // don't sync back to map if this change was initiated from the map
          if (syncFromLeafletCount > self.syncFromLeafletResponseCount) {
            self.syncLeafletResponseCount(syncFromLeafletCount)
          }
          // sync back to map if this change was initiated from model (e.g. undo/redo)
          else {
            self.leafletMapState.adjustMapView({center, zoom})
          }
        }, {name: "MapContentModel.reaction [sync mapModel => leaflet map]", equals: comparer.structural}
      ))
    },
    afterAttachToDocument() {
      // Monitor coming and going of shared datasets
      addDisposer(self, reaction(() => {
          const sharedModelManager = self.tileEnv?.sharedModelManager,
            sharedDataSets: ISharedDataSet[] = sharedModelManager?.isReady
              ? sharedModelManager?.getSharedModelsByType<typeof SharedDataSet>(kSharedDataSetType) ?? []
              : [],
            leafletMap = self.leafletMap
          return {sharedModelManager, sharedDataSets, leafletMap}
        },
        // reaction/effect
        ({sharedModelManager, sharedDataSets, leafletMap}) => {
          if (!sharedModelManager?.isReady || !leafletMap) {
            // We aren't added to a document yet, so we can't do anything yet
            return
          }
          // We make a copy of the layers array and remove any layers that are still in the shared model
          // If there are any layers left in the copy, they are no longer in any shared dataset and should be removed
          const layersToCheck = Array.from(self.layers)
          let layersHaveChanged = false
          sharedDataSets.forEach(sharedDataSet => {
            if (datasetHasLatLongData(sharedDataSet.dataSet)) {
              const foundIndex = layersToCheck.findIndex(aLayer => aLayer.data === sharedDataSet.dataSet)
              if (foundIndex >= 0) {
                const layer = layersToCheck[foundIndex],
                  dataset = sharedDataSet.dataSet
                layer.dataConfiguration.setDataset(dataset, getSharedCaseMetadataFromDataset(dataset))
                // Remove this layer from the list of layers to check since it _is_ present
                layersToCheck.splice(foundIndex, 1)
              } else {
                // Add a new layer for this dataset
                this.addPointLayer(sharedDataSet.dataSet)
                layersHaveChanged = true
              }
            }
            // Todo: We should allow both points and polygons from the same dataset
            else if (datasetHasBoundaryData(sharedDataSet.dataSet)) {
              const layer = layersToCheck.find(aLayer => aLayer.data === sharedDataSet.dataSet)
              if (layer && isMapPolygonLayerModel(layer)) {
                layer.setDataset(sharedDataSet.dataSet)
                layersToCheck.splice(layersToCheck.indexOf(layer), 1)
              } else {
                // Add a new layer for this dataset
                this.addPolygonLayer(sharedDataSet.dataSet)
                layersHaveChanged = true
              }
            }
          })
          // Remove any remaining layers in layersToCheck since they are no longer in any shared dataset
          layersToCheck.forEach(layer => {
            self.layers.splice(self.layers.indexOf(layer), 1)
            layersHaveChanged = true
          })
          if (layersHaveChanged) {
            self.rescale()
          }
          self.isSharedDataInitialized = true
        },
        {name: "MapContentModel.respondToSharedDatasetsChanges", fireImmediately: true}))
    },
    setLeafletMap(leafletMap: LeafletMap) {
      withoutUndo()
      self.leafletMap = leafletMap
      self.leafletMapState.setLeafletMap(leafletMap)
    },
    setHasBeenInitialized() {
      withoutUndo()
      self.isLeafletMapInitialized = true
    }
  }))
  .actions(self => ({
    hideSelectedCases() {
      self.layers.forEach(layer => {
        layer.dataConfiguration?.addNewHiddenCases(
          layer.dataConfiguration.selection ?? []
        )
      })
    },
    hideUnselectedCases() {
      self.layers.forEach(layer => {
        layer.dataConfiguration?.addNewHiddenCases(
          layer.dataConfiguration.unselectedCases ?? []
        )
      })
    },
    clearHiddenCases() {
      self.layers.forEach(layer => {
        layer.dataConfiguration.clearHiddenCases()
      })
    }
  }))
  .views(self => ({
    // Return true if there is already a layer for the given dataset and attributeID is not already in use
    placeCanAcceptAttributeIDDrop(place: GraphPlace, dataset: IDataSet, attributeID: string | undefined) {
      if (dataset && attributeID) {
        const foundLayer = self.layers.find(layer => layer.data === dataset)
        return !!foundLayer && foundLayer.dataConfiguration.attributeID('legend') !== attributeID
      }
      return false
    },
    numSelected() {
      return self.layers.reduce((sum, layer) => sum + layer.dataConfiguration.selection.length, 0)
    },
    numUnselected() {
      return self.layers.reduce((sum, layer) => sum + layer.dataConfiguration.unselectedCases.length, 0)
    },
    numHidden() {
      return self.layers.reduce((sum, layer) => sum + layer.dataConfiguration.hiddenCases.length, 0)
    }
  }))

export interface IMapContentModel extends Instance<typeof MapContentModel> {
}

export interface IMapModelContentSnapshot extends SnapshotIn<typeof MapContentModel> {
}

export function createMapContentModel(snap?: IMapModelContentSnapshot) {
  return MapContentModel.create(snap)
}

export function isMapContentModel(model?: ITileContentModel): model is IMapContentModel {
  return model?.type === kMapTileType
}
