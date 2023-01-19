import React, { ReactElement, useRef } from "react"
import {observer} from "mobx-react-lite"
import {
  Checkbox, Flex, FormControl, FormLabel, Input, Slider, SliderThumb,
  SliderTrack
} from "@chakra-ui/react"
import t from "../../../../utilities/translation/translate"
import { useDataConfigurationContext } from "../../hooks/use-data-configuration-context"
import { missingColor } from "../../../../utilities/color-utils"
import {IGraphModel} from "../../models/graph-model"
import {InspectorPalette} from "../../../inspector-panel"
import StylesIcon from "../../../../assets/icons/icon-styles.svg"

import "./point-format-panel.scss"

interface IProps {
  graphModel: IGraphModel
  setShowPalette: (palette: string | undefined) => void;
}

export const PointFormatPalette = observer(({graphModel, setShowPalette}: IProps) => {
  const dataConfiguration = useDataConfigurationContext()
  const legendAttrID = graphModel.getAttributeID("legend")
  const attrType = dataConfiguration?.dataset?.attrFromID(legendAttrID ?? "")?.type
  const categoriesRef = useRef<Set<string> | undefined>()
  categoriesRef.current = dataConfiguration?.categorySetForAttrRole('legend')

  const handlePointSizeMultiplierSetting = (val: any) => {
    graphModel.setPointSizeMultiplier(val)
  }
  const handleTransparencySetting = (isTransparent: boolean) => {
    graphModel.setIsTransparent(isTransparent)
  }
  const handleBackgroundColorSetting = (color: string) => {
    graphModel.setPlotBackgroundColor(color)
  }
  const handlePointColorSetting = (color: string) => {
    graphModel.setPointColor(color) //TODO: not yet implemented
  }
  const handlePointStrokeColorSetting = (color: string) => {
    graphModel.setPointStrokeColor(color)
  }
  const handleStrokeSameAsPointColorSetting = (isTheSame: boolean) => {
    graphModel.setPointStrokeSameAsFill(isTheSame)
  }

const catPointColorSettingArr: ReactElement[] = []
categoriesRef.current?.forEach(cat => {
  catPointColorSettingArr.push(
    <Flex direction="row" key={cat} className="palette-row cat-color-picker">
      <FormLabel className="form-label">{cat}</FormLabel>
      <Input type="color" className="color-picker-thumb categorical"
              value={dataConfiguration?.getLegendColorForCategory(cat) || missingColor}
              onChange={e => handlePointColorSetting(e.target.value)}/>
    </Flex>
  )
})

  return (
    <InspectorPalette
      title={t("DG.Inspector.styles")}
      Icon={<StylesIcon/>}
      buttonLocation={115}
      paletteTop={35}
    >
      <Flex className="palette-form" direction="column">
        <FormControl size="xs">
          <Flex className="palette-row">
            <FormLabel className="form-label">{t("DG.Inspector.pointSize")}</FormLabel>
            <Slider aria-label="point-size-slider" ml="10px" min={0} max={2}
                    defaultValue={graphModel.pointSizeMultiplier} step={0.01}
                    onChange={(val) => handlePointSizeMultiplierSetting(val)}>
              <SliderTrack/>
              <SliderThumb/>
            </Slider>
          </Flex>
        </FormControl>
        <FormControl isDisabled={graphModel.pointStrokeSameAsFill}>
          <Flex className="palette-row">
            <FormLabel className="form-label">{t("DG.Inspector.stroke")}</FormLabel>
            <Input type="color" className="color-picker-thumb" value={graphModel.pointStrokeColor}
                    onChange={e => handlePointStrokeColorSetting(e.target.value)}/>
          </Flex>
        </FormControl>
        <FormControl>
            <>
              { graphModel.getAttributeID("legend") &&
                  attrType === "categorical"
                    ? <FormControl className="cat-color-setting">{catPointColorSettingArr}</FormControl>
                    : attrType === "numeric"
                      ? <FormControl className="num-color-setting">
                          <Flex className="palette-row">
                            {/* Sets the min and max colors for numeric legend. Currently not implemented so
                                this sets the same color for all the points*/}
                            <FormLabel className="form-label">{t("DG.Inspector.legendColor")}</FormLabel>
                            <Input type="color" className="color-picker-thumb" value={missingColor}
                                  onChange={e => handlePointColorSetting(e.target.value)}/>
                            <Input type="color" className="color-picker-thumb" value={missingColor}
                                  onChange={e => handlePointColorSetting(e.target.value)}/>
                          </Flex>
                        </FormControl>
                      : <Flex className="palette-row">
                          <FormLabel className="form-label">{t("DG.Inspector.color")}</FormLabel>
                          <Input type="color" className="color-picker-thumb" value={graphModel.pointColor}
                                onChange={e => handlePointColorSetting(e.target.value)}/>
                        </Flex>
              }
            </>
        </FormControl>
        <FormControl>
          <Checkbox
            mt="6px" isChecked={graphModel.pointStrokeSameAsFill}
            onChange={e => handleStrokeSameAsPointColorSetting(e.target.checked)}>
            {t("DG.Inspector.strokeSameAsFill")}
          </Checkbox>
        </FormControl>
        <FormControl isDisabled={graphModel.isTransparent}>
        <Flex className="palette-row">
          <FormLabel className="form-label">{t("DG.Inspector.backgroundColor")}</FormLabel>
          <Input type="color" className="color-picker-thumb" value={graphModel.plotBackgroundColor}
                  onChange={e => handleBackgroundColorSetting(e.target.value)}/>
        </Flex>
        </FormControl>
        <FormControl>
          <Checkbox
            mt="6px" isChecked={graphModel.isTransparent}
            onChange={e => handleTransparencySetting(e.target.checked)}>
            {t("DG.Inspector.graphTransparency")}
          </Checkbox>
        </FormControl>
      </Flex>
    </InspectorPalette>
  )
})