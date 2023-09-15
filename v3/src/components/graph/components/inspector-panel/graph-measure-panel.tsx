import React from "react"
import { Box, Checkbox, Flex, FormControl, useToast} from "@chakra-ui/react"
import t from "../../../../utilities/translation/translate"
import { ITileModel } from "../../../../models/tiles/tile-model"
import { isGraphContentModel } from "../../models/graph-content-model"
import { GraphContentModelContext } from "../../hooks/use-graph-content-model-context"
import { InspectorPalette } from "../../../inspector-panel"
import ValuesIcon from "../../../../assets/icons/icon-values.svg"
import { DataConfigurationContext } from "../../hooks/use-data-configuration-context"

import "./point-format-panel.scss"

interface IProps {
  tile?: ITileModel
  panelRect?: DOMRect
  buttonRect?: DOMRect
  setShowPalette: (palette: string | undefined) => void
}

export const GraphMeasurePalette = ({tile, panelRect, buttonRect, setShowPalette}: IProps) => {
  const toast = useToast()
  const graphModel = isGraphContentModel(tile?.content) ? tile?.content : undefined
  const measures = graphModel ? graphModel?.adornmentsStore.getAdornmentsMenuItems(graphModel.plotType) : undefined

  const handleSetting = (measure: string, checked: boolean) => {
    // Show toast pop-ups for adornments that haven't been implemented yet.
    // TODO: Remove this once all adornments are implemented.
    toast({
      title: 'Item clicked',
      description: `You clicked on ${measure} ${checked}`,
      status: 'success',
      duration: 5000,
      isClosable: true,
    })
    return null
  }

  return (
    <InspectorPalette
      title={t("DG.Inspector.values")}
      Icon={<ValuesIcon />}
      setShowPalette={setShowPalette}
      panelRect={panelRect}
      buttonRect={buttonRect}
    >
      <Flex className="palette-form" direction="column">
        <Box className="form-title">Show ...</Box>
        {graphModel && measures?.map((measure: Record<string, any>) => {
          const { checked, clickHandler, componentInfo, componentContentInfo, title } = measure
          const titleSlug = title.replace(/ /g, "-").toLowerCase()
          if (componentInfo && componentContentInfo) {
            return (
              <GraphContentModelContext.Provider key={`${title}-graph-model-context`} value={graphModel}>
                <DataConfigurationContext.Provider
                  key={`${title}-data-configuration-context`}
                  value={graphModel.dataConfiguration}
                >
                  <componentInfo.Controls key={title} adornmentModel={componentContentInfo.modelClass} />
                </DataConfigurationContext.Provider>
              </GraphContentModelContext.Provider>
            )           
          } else {
            return (
              <FormControl key={title}>
                <Checkbox
                  data-testid={`adornment-checkbox-${titleSlug}`}
                  defaultChecked={checked}
                  onChange={clickHandler ? clickHandler : e => handleSetting(title, e.target.checked)}
                >
                  {title}
                </Checkbox>
              </FormControl>
            )
          }
        })}
      </Flex>
    </InspectorPalette>
  )
}
