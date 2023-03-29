import React from "react"
import {Box, Flex, HStack, Tag, useToast} from "@chakra-ui/react"
import { kDefaultTileHeight, kDefaultTileWidth } from "../constants"
import t from "../../utilities/translation/translate"
import { IDocumentContentModel } from "../../models/document/document-content"
import { createDefaultTileOfType } from "../../models/codap/add-default-content"
import { getTileComponentIcon, getTileComponentInfo, ITileComponentInfo } from "../../models/tiles/tile-component-info"
import { isFreeTileRow } from "../../models/document/free-tile-row"
import { getPositionOfNewComponent } from "../../utilities/view-utils"
import MapIcon from '../../assets/icons/icon-map.svg'
import TextIcon from '../../assets/icons/icon-text.svg'
import PluginsIcon from '../../assets/icons/icon-plug.svg'

import './tool-shelf.scss'

const kHeaderHeight = 25

interface IProps {
  content?: IDocumentContentModel
}

export const ToolShelf = ({content}: IProps) => {
  const notify = (description: string) => {
      toast({
        position: "top-right",
        title: "Tool icon clicked",
        description,
        status: "success"
      })
    },
    toast = useToast()

  const row = content?.getRowByIndex(0)

  const toggleTileVisibility = (tileType: string, componentInfo: ITileComponentInfo) => {
    const tiles = content?.getTilesOfType(tileType)
    if (tiles && tiles.length > 0) {
      const tileId = tiles[0].id
      content?.deleteTile(tileId)
    } else {
      createTile(tileType, componentInfo)
    }
  }

  const createTile = (tileType: string, componentInfo: ITileComponentInfo) => {
    const width = componentInfo.defaultWidth || kDefaultTileWidth
    const height = componentInfo.defaultHeight || kDefaultTileHeight
    if (row) {
      const newTile = createDefaultTileOfType(tileType)
      if (newTile) {
        if (isFreeTileRow(row)) {
          const newTileSize = {width, height}
          const {x, y} = getPositionOfNewComponent(newTileSize)
          const tileOptions = { x, y, width, height }
          content?.insertTileInRow(newTile, row, tileOptions)
          const rowTile = row.tiles.get(newTile.id)
          if (componentInfo.defaultWidth && componentInfo.defaultHeight) {
            rowTile?.setSize(componentInfo.defaultWidth,  componentInfo.defaultHeight + kHeaderHeight)
            rowTile?.setPosition(tileOptions.x, tileOptions.y)
          }
        }
      }
    }
  }

  const createComponentHandler = (tileType: string) => {
    const componentInfo = getTileComponentInfo(tileType)
    if (componentInfo) {
      if (componentInfo.isSingleton) {
        toggleTileVisibility(tileType, componentInfo)
      } else {
        createTile(tileType, componentInfo)
      }
    }  else {
      notify(tileType)
    }
  }

  const buttonDescriptions = [
    {
      ariaLabel: 'Make a table',
      icon: getTileComponentIcon("CodapCaseTable"),
      iconLabel: t("DG.ToolButtonData.tableButton.title"),
      buttonHint: t("DG.ToolButtonData.tableButton.toolTip"),
      tileType: "CodapCaseTable"
    },
    {
      ariaLabel: 'Make a graph',
      icon: getTileComponentIcon("CodapGraph"),
      iconLabel: t("DG.ToolButtonData.graphButton.title"),
      buttonHint: t("DG.ToolButtonData.graphButton.toolTip"),
      tileType: "CodapGraph"
    },
    {
      ariaLabel: 'Make a map',
      icon: MapIcon,
      iconLabel: t("DG.ToolButtonData.mapButton.title"),
      buttonHint: t("DG.ToolButtonData.mapButton.toolTip"),
      tileType: "CodapMap"
    },
    {
      ariaLabel: 'Make a slider',
      icon: getTileComponentIcon("CodapSlider"),
      iconLabel: t("DG.ToolButtonData.sliderButton.title"),
      buttonHint: t("DG.ToolButtonData.sliderButton.toolTip"),
      tileType: "CodapSlider"
    },
    {
      ariaLabel: 'Open/close the calculator',
      icon: getTileComponentIcon("Calculator"),
      iconLabel: t("DG.ToolButtonData.calcButton.title"),
      buttonHint: t("DG.ToolButtonData.calcButton.toolTip"),
      tileType: "Calculator"
    },
    {
      ariaLabel: 'Make a text object',
      icon: TextIcon,
      iconLabel: t("DG.ToolButtonData.textButton.title"),
      buttonHint: t("DG.ToolButtonData.textButton.toolTip"),
      tileType: "CodapText"
    },
    {
      ariaLabel: 'Choose a plugin',
      icon: PluginsIcon,
      iconLabel: t("DG.ToolButtonData.pluginMenu.title"),
      buttonHint: t("DG.ToolButtonData.pluginMenu.toolTip"),
      tileType: "CodapPlugin"
    }
  ]

  return (
    <HStack className='tool-shelf' alignContent='center' data-testid='tool-shelf'>
      <Flex className="toolshelf-component-buttons" >
        {buttonDescriptions.map(aDesc => {
          return (
            <Box
              as='button'
              key={aDesc.iconLabel}
              bg='white'
              onClick={() => createComponentHandler(aDesc.tileType)}
              data-testid={`tool-shelf-button-${aDesc.iconLabel}`}
              className="toolshelf-button"
              _hover={{ boxShadow: '1px 1px 1px 0px rgba(0, 0, 0, 0.5)' }}
              // :active styling is in css to override Chakra default
            >
              {aDesc.icon && <aDesc.icon/>}
              <Tag className='tool-shelf-tool-label'>{aDesc.iconLabel}</Tag>
            </Box>)
        })}
      </Flex>
    </HStack>
  )
}
