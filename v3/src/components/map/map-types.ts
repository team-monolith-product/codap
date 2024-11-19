import {GeoJSONOptions, LatLng} from "leaflet"
import { logStringifiedObjectMessage, stringify } from "../../lib/log-message"

export const BaseMapKeys = ['oceans', 'topo', 'streets'] as const
export type BaseMapKey = typeof BaseMapKeys[number]

export const kMapUrls: Record<BaseMapKey, string> = {
  oceans: "https://services.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}",
  topo: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
  streets: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
}

export const kMapPolygonLayerType = "mapPolygonLayer"
export const kMapPointLayerType = "mapPointLayer"

export const kMapClass = "codap-map"
export const kMapClassSelector = `.${kMapClass}`

export const MapAttrRoles = ['lat', 'long', 'polygon'] as const
export type MapAttrRole = typeof MapAttrRoles[number]
export type GeoJsonObject = GeoJSON.GeoJsonObject
export interface PolygonLayerOptions extends GeoJSONOptions<any, GeoJSON.Geometry> {
  caseID: string
}

export const
  kDefaultMapWidth = 530,
  kDefaultMapHeight = 335,
  kMapAttribution = '&copy; <a href="https://static.arcgis.com/attribution/World_Topo_Map">USGS, NOAA</a>',
  kDefaultMapZoomForGeoLocation = 8,
  // Constants for maps
  kDefaultMapFillOpacity = 0.5,
  kDefaultMapStrokeColor = 'white',
  kDefaultMapStrokeOpacity = 0.6,
  kMapAreaNoLegendColor = '#FF3E00',
  kMapAreaNoLegendSelectedColor = '#1a7a93',
  kMapAreaNoLegendUnselectedOpacity = 0.5,
  kMapAreaNoLegendSelectedOpacity = 0.7,
  kMapAreaWithLegendSelectedOpacity = 0.9,
  kMapAreaWithLegendUnselectedOpacity = 0.9,
  kMapAreaNoLegendSelectedBorderColor = 'black',
  kMapAreaWithLegendUnselectedBorderColor = 'white',
  kMapAreaWithLegendSelectedBorderColor = 'red',
  kMapAreaSelectedBorderWeight = 3,
  kMapAreaUnselectedBorderWeight = 2,


  kLatNames = ['latitude', 'lat', 'latitud', 'breitengrad', '緯度', 'عرض جغرافیایی'],
  kLongNames = ['longitude', 'long', 'lng', 'lon', 'longitud', 'längengrad', '経度', 'طول جغرافیایی']

export const MapPlaces = ['map', 'legend'] as const
export type MapPlace = typeof MapPlaces[number]

export type LoggableMapObject = {
  center?: LatLng
  zoom?: number
}

export function logStringifiedMapMessage(message: string, args: LoggableMapObject) {
  const { center = {}, ...others } = args
  return logStringifiedObjectMessage(message, { center: stringify(center), ...others })
}
