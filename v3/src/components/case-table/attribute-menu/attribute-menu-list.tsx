import React, { forwardRef } from "react"
import { MenuItem, MenuList, useDisclosure, useToast } from "@chakra-ui/react"
import { useCaseMetadata } from "../../../hooks/use-case-metadata"
import { useDataSetContext } from "../../../hooks/use-data-set-context"
import { TCalculatedColumn } from "../case-table-types"
import { EditAttributePropertiesModal } from "./edit-attribute-properties-modal"
import t from "../../../utilities/translation/translate"
import { EditFormulaModal } from "./edit-formula-modal"

interface IProps {
  column: TCalculatedColumn
  onRenameAttribute: () => void
  onModalOpen: (open: boolean) => void
}

export const AttributeMenuList = forwardRef<HTMLDivElement, IProps>(
    ({ column, onRenameAttribute, onModalOpen }, ref) => {
  const toast = useToast()
  const data = useDataSetContext()
  const caseMetadata = useCaseMetadata()
  // each use of useDisclosure() maintains its own state and callbacks so they can be used for independent dialogs
  const attributePropsModal = useDisclosure()
  const formulaModal = useDisclosure()
  const columnName = column.name as string
  const columnId = column.key

  const handleMenuItemClick = (menuItem: string) => {
    toast({
      title: 'Menu item clicked',
      description: `You clicked on ${menuItem} on ${columnName}`,
      status: 'success',
      duration: 5000,
      isClosable: true,
    })
  }
  const handleHideAttribute = () => {
   caseMetadata?.setIsHidden(column.key, true)
  }

  const handleDeleteAttribute = () => {
    data?.removeAttribute(column.key)
  }

  const handleEditAttributePropsOpen = () => {
    attributePropsModal.onOpen()
    onModalOpen(true)
  }

  const handleEditAttributePropsClose = () => {
    attributePropsModal.onClose()
    onModalOpen(false)
  }

  const handleEditFormulaOpen = () => {
    formulaModal.onOpen()
    onModalOpen(true)
  }

  const handleEditFormulaClose = () => {
    formulaModal.onClose()
    onModalOpen(false)
  }

  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation()
  }

  return (
    <>
      <MenuList ref={ref} data-testid="attribute-menu-list" onKeyDown={handleMenuKeyDown}>
        <MenuItem onClick={onRenameAttribute}>
          {t("DG.TableController.headerMenuItems.renameAttribute")}
        </MenuItem>
        <MenuItem onClick={() => handleMenuItemClick("Fit width")}>
          {t("DG.TableController.headerMenuItems.resizeColumn")}
        </MenuItem>
        <MenuItem onClick={handleEditAttributePropsOpen}>
          {t("DG.TableController.headerMenuItems.editAttribute")}
        </MenuItem>
        <MenuItem onClick={handleEditFormulaOpen}>
          {t("DG.TableController.headerMenuItems.editFormula")}
        </MenuItem>
        <MenuItem onClick={() => handleMenuItemClick("Delete Formula")}>
          {t("DG.TableController.headerMenuItems.deleteFormula")}
        </MenuItem>
        <MenuItem onClick={() => handleMenuItemClick("Recover Formula")}>
          {t("DG.TableController.headerMenuItems.recoverFormula")}
        </MenuItem>
        <MenuItem onClick={() => handleMenuItemClick("Rerandomize")}>
          {t("DG.TableController.headerMenuItems.randomizeAttribute")}
        </MenuItem>
        <MenuItem onClick={() => handleMenuItemClick("Sort Ascending")}>
          {t("DG.TableController.headerMenuItems.sortAscending")}
        </MenuItem>
        <MenuItem onClick={() => handleMenuItemClick("Sort Descending")}>
          {t("DG.TableController.headerMenuItems.sortDescending")}
        </MenuItem>
        <MenuItem onClick={handleHideAttribute}>
          {t("DG.TableController.headerMenuItems.hideAttribute")}
        </MenuItem>
        <MenuItem onClick={() => handleDeleteAttribute()}>
          {t("DG.TableController.headerMenuItems.deleteAttribute")}
        </MenuItem>
      </MenuList>
      <EditAttributePropertiesModal attributeId={columnId} isOpen={attributePropsModal.isOpen}
        onClose={handleEditAttributePropsClose} />
      <EditFormulaModal attributeId={columnId} isOpen={formulaModal.isOpen} onClose={handleEditFormulaClose} />
    </>
  )
})

AttributeMenuList.displayName = "AttributeMenuList"