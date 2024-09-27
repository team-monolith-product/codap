import { TableTileElements as table } from "../support/elements/table-tile"
import { CardTileElements as card } from "../support/elements/card-tile"
import { ToolbarElements as toolbar } from "../support/elements/toolbar-elements"

context("case card", () => {
  beforeEach(() => {
    // cy.scrollTo() doesn't work as expected with `scroll-behavior: smooth`
    const queryParams = "?sample=mammals&mouseSensor&scrollBehavior=auto"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(2000)
  })

  describe("case card", () => {
    it("can switch from case table to case card view and back with undo/redo", () => {
      // Initial checks case table->case card
      cy.get('[data-testid="codap-case-table"]').should("exist")
      cy.get('[data-testid="codap-case-card"]').should("not.exist")
      table.getToggleCardView().click()
      table.getToggleCardMessage().should("have.text", "Switch to case card view of the data").click()
      cy.wait(500)
      cy.get('[data-testid="codap-case-table"]').should("not.exist")
      cy.get('[data-testid="codap-case-card"]').should("exist")
      table.getToggleCardView().click()
      cy.wait(500)
      table.getToggleCardMessage().should("have.text", "Switch to case table view of the data").click()
      cy.get('[data-testid="codap-case-table"]').should("exist")
      cy.get('[data-testid="codap-case-card"]').should("not.exist")

      // Perform undo actions
      toolbar.getUndoTool().click()  // Undo switch
      cy.get('[data-testid="codap-case-table"]').should("not.exist")
      cy.get('[data-testid="case-card-view"]').should("exist")

      // Perform redo actions
      toolbar.getRedoTool().click()  // Redo switch to case table
      cy.get('[data-testid="codap-case-table"]').should("exist")
      cy.get('[data-testid="case-card-view"]').should("not.exist")
    })
    it("initially displays a summary view of all cases and whenever 'Summarize Dataset' button is clicked", () => {
      table.toggleCaseView()
      cy.wait(500)
      cy.get('[data-testid="case-card-view-title"]').should("have.text", "Cases")
      cy.get('[data-testid="case-card-view-index"]').should("have.text", "27 cases")
      cy.get('[data-testid="case-card-attr-name"]').eq(0).should("contain.text", "Mammal")
      cy.get('[data-testid="case-card-attr-value"]').eq(0).should("have.text", "27 values")
      cy.get('[data-testid="case-card-attr-name"]').eq(1).should("contain.text", "Order")
      cy.get('[data-testid="case-card-attr-value"]').eq(1).should("have.text", "12 values")
      cy.get('[data-testid="case-card-attr-name"]').eq(2).should("contain.text", "LifeSpan")
      cy.get('[data-testid="case-card-attr-value"]').eq(2).should("have.text", "3-80")
      cy.get('[data-testid="case-card-attr-name"]').eq(3).should("contain.text", "Height")
      cy.get('[data-testid="case-card-attr-value"]').eq(3).should("have.text", "0.1-6.5")
      cy.get('[data-testid="case-card-attr-name"]').eq(4).should("contain.text", "Mass")
      cy.get('[data-testid="case-card-attr-value"]').eq(4).should("have.text", "0.02-6400")
      cy.get('[data-testid="case-card-attr-name"]').eq(5).should("contain.text", "Sleep")
      cy.get('[data-testid="case-card-attr-value"]').eq(5).should("have.text", "2-20")
      cy.get('[data-testid="case-card-attr-name"]').eq(6).should("contain.text", "Speed")
      cy.get('[data-testid="case-card-attr-value"]').eq(6).should("have.text", "1-110")
      cy.get('[data-testid="case-card-attr-name"]').eq(7).should("contain.text", "Habitat")
      cy.get('[data-testid="case-card-attr-value"]').eq(7).should("have.text", "3 values")
      cy.get('[data-testid="case-card-attr-name"]').eq(8).should("contain.text", "Diet")
      cy.get('[data-testid="case-card-attr-value"]').eq(8).should("have.text", "3 values")
      cy.log("Switch to individual cases view.")
      cy.get('[data-testid="summary-view-toggle-button"]').should("have.text", "Browse Individual Cases")
      cy.get('[data-testid="summary-view-toggle-button"]').click()
      cy.get('[data-testid="case-card-attr-value"]').eq(0).should("have.text", "African Elephant")
      cy.get('[data-testid="case-card-attr-value"]').eq(1).should("have.text", "Proboscidae")
      cy.get('[data-testid="case-card-attr-value"]').eq(2).should("have.text", "70")
      cy.get('[data-testid="case-card-attr-value"]').eq(3).should("have.text", "4")
      cy.get('[data-testid="case-card-attr-value"]').eq(4).should("have.text", "6400")
      cy.get('[data-testid="case-card-attr-value"]').eq(5).should("have.text", "3")
      cy.get('[data-testid="case-card-attr-value"]').eq(6).should("have.text", "40")
      cy.get('[data-testid="case-card-attr-value"]').eq(7).should("have.text", "land")
      cy.get('[data-testid="case-card-attr-value"]').eq(8).should("have.text", "plants")
      cy.get('[data-testid="summary-view-toggle-button"]').should("have.text", "Summarize Dataset")
      cy.log("Switch back to summary view.")
      cy.get('[data-testid="summary-view-toggle-button"]').click()
      cy.get('[data-testid="case-card-attr-value"]').eq(0).should("have.text", "27 values")
      cy.get('[data-testid="case-card-attr-value"]').eq(1).should("have.text", "12 values")
      cy.get('[data-testid="case-card-attr-value"]').eq(2).should("have.text", "3-80")
      cy.get('[data-testid="case-card-attr-value"]').eq(3).should("have.text", "0.1-6.5")
      cy.get('[data-testid="case-card-attr-value"]').eq(4).should("have.text", "0.02-6400")
      cy.get('[data-testid="case-card-attr-value"]').eq(5).should("have.text", "2-20")
      cy.get('[data-testid="case-card-attr-value"]').eq(6).should("have.text", "1-110")
      cy.get('[data-testid="case-card-attr-value"]').eq(7).should("have.text", "3 values")
      cy.get('[data-testid="case-card-attr-value"]').eq(8).should("have.text", "3 values")
      cy.get('[data-testid="summary-view-toggle-button"]').should("have.text", "Browse Individual Cases")
    })
    it("should not initially display a summary view of all cases if there is a selection", () => {
      table.getGridCell(6, 2).should("contain", "Cheetah").click()
      table.toggleCaseView()
      cy.wait(500)
      cy.get('[data-testid="case-card-attr-name"]').eq(0).should("contain.text", "Mammal")
      cy.get('[data-testid="case-card-attr-value"]').eq(0).should("have.text", "Cheetah")
      cy.get('[data-testid="case-card-attr-value"]').eq(1).should("have.text", "Carnivora")
      cy.get('[data-testid="case-card-attr-value"]').eq(2).should("have.text", "14")
    })
    it("displays cases and allows user to scroll through them", () => {
      table.toggleCaseView()
      cy.wait(500)
      cy.get('[data-testid="case-card-view"]').should("have.length", 1)
      cy.get('[data-testid="case-card-view-title"]').should("have.text", "Cases")
      cy.get('[data-testid="case-card-view-previous-button"]').should("be.disabled")
      cy.get('[data-testid="case-card-view-next-button"]').should("not.be.disabled")
      cy.get('[data-testid="case-card-view-index"]').should("have.text", "27 cases")
      cy.get('[data-testid="case-card-attr-name"]').first().should("contain.text", "Mammal")
      cy.get('[data-testid="case-card-attr-value"]').first().should("have.text", "27 values")
      cy.get('[data-testid="case-card-attr"]').should("have.length", 9)
      cy.get('[data-testid="case-card-attr-name"]').should("have.length", 9)
      cy.get('[data-testid="case-card-attr-value"]').should("have.length", 9)
      cy.get('[data-testid="case-card-view-next-button"]').click()
      cy.get('[data-testid="case-card-view-index"]').should("have.text", "1 of 27")
      cy.get('[data-testid="case-card-attr-value"]').first().should("have.text", "African Elephant")
      cy.get('[data-testid="case-card-view-next-button"]').click()
      cy.get('[data-testid="case-card-attr-value"]').first().should("have.text", "Asian Elephant")
      cy.get('[data-testid="case-card-view-previous-button"]').should("not.be.disabled").click()
      cy.get('[data-testid="case-card-attr-value"]').first().should("have.text", "African Elephant")
    })
    it("displays case data in a hierarchy when there is a parent collection", () => {
      // make a parent collection
      table.moveAttributeToParent("Order", "newCollection")
      cy.wait(500)
      table.toggleCaseView()
      cy.wait(500)
      cy.get('[data-testid="case-card-view"]').should("have.length", 2)
      cy.get('[data-testid="case-card-view"]').eq(0).should("have.class", "color-cycle-1")
      cy.get('[data-testid="case-card-view"]').eq(1).should("have.class", "color-cycle-2")
      cy.get('[data-testid="case-card-view-title"]').should("have.length", 2)
      cy.get('[data-testid="case-card-view-title"]').eq(0).should("have.text", "Orders")
      cy.get('[data-testid="case-card-view-title"]').eq(1).should("have.text", "Cases")
      cy.get('[data-testid="case-card-view-previous-button"]').should("have.length", 2).and("be.disabled")
      cy.get('[data-testid="case-card-view-next-button"]').should("have.length", 2).and("not.be.disabled")
      cy.get('[data-testid="case-card-view-index"]').should("have.length", 2)
      cy.get('[data-testid="case-card-view-index"]').eq(0).should("have.text", "12 cases")
      cy.get('[data-testid="case-card-view-index"]').eq(1).should("have.text", "2 cases")
      cy.get('[data-testid="case-card-attrs"]').should("have.length", 2)
      cy.get('[data-testid="case-card-attrs"]').eq(0).find('[data-testid="case-card-attr"]').should("have.length", 1)
      cy.get('[data-testid="case-card-attrs"]').eq(0).find('[data-testid="case-card-attr-name"]')
                                                 .eq(0).should("contain.text", "Order")
      cy.get('[data-testid="case-card-attrs"]').eq(0).find('[data-testid="case-card-attr-value"]')
                                                 .eq(0).should("have.text", "12 values")
      cy.get('[data-testid="case-card-attrs"]').eq(1).find('[data-testid="case-card-attr"]').should("have.length", 8)
      cy.get('[data-testid="case-card-attrs"]').eq(1).find('[data-testid="case-card-attr-value"]')
                                                 .eq(0).should("have.text", "27 values")
      cy.get('[data-testid="case-card-view-next-button"]').eq(0).click()
      cy.get('[data-testid="case-card-view-index"]').eq(0).should("have.text", "1 of 12")
      cy.get('[data-testid="case-card-attrs"]').eq(0).find('[data-testid="case-card-attr-value"]')
                                                 .eq(0).should("have.text", "Proboscidae")
      cy.get('[data-testid="case-card-attrs"]').eq(1).find('[data-testid="case-card-attr-value"]')
                                                 .eq(0).should("have.text", "African Elephant, Asian Elephant")
      cy.get('[data-testid="case-card-view-index"]').eq(1).should("have.text", "2 cases")
      cy.get('[data-testid="case-card-view-next-button"]').eq(1).click()
      cy.get('[data-testid="case-card-view-index"]').eq(0).should("have.text", "1 of 12")
      cy.get('[data-testid="case-card-attrs"]').eq(0).find('[data-testid="case-card-attr-value"]')
                                                 .eq(0).should("have.text", "Proboscidae")
      cy.get('[data-testid="case-card-view-index"]').eq(1).should("have.text", "1 of 2")
      cy.get('[data-testid="case-card-attrs"]').eq(1).find('[data-testid="case-card-attr-value"]')
                                                 .eq(0).should("have.text", "African Elephant")
    })
    it("allows the user to add, edit, and hide attributes with undo/redo", () => {
      table.toggleCaseView()
      cy.wait(500)
      cy.get('[data-testid="case-card-attr"]').should("have.length", 9)
      cy.get('[data-testid="case-card-attr-name"]').should("have.length", 9)
      cy.get('[data-testid="case-card-attr-value"]').should("have.length", 9)

      cy.log("Add new attribute with undo/redo.")
      cy.get('[data-testid="case-card-view-next-button"]').click()
      cy.get('[data-testid="add-attribute-button"]').click()
      cy.wait(500)
      cy.get('[data-testid="column-name-input"]').should("exist").type(" Memory{enter}")
      cy.get('[data-testid="case-card-attr-name"]').eq(9).should("contain.text", "Memory")
      cy.get('[data-testid="case-card-attr"]').should("have.length", 10)
      cy.get('[data-testid="case-card-attr-name"]').should("have.length", 10)
      cy.get('[data-testid="case-card-attr-value"]').should("have.length", 10)
      cy.get('[data-testid="case-card-attr-value"]').eq(9).click()
      cy.get('[data-testid="case-card-attr-value-text-editor"]').eq(9).should("exist").type("excellent{enter}")
      cy.get('[data-testid="case-card-attr-value"]').eq(9).should("contain.text", "excellent")

      // Undo/redo check after adding a new attribute
      toolbar.getUndoTool().click()
      toolbar.getUndoTool().click()
      toolbar.getUndoTool().click()
      cy.get('[data-testid="case-card-attr"]').should("have.length", 9)
      cy.get('[data-testid="case-card-attr-name"]').should("have.length", 9)
      toolbar.getRedoTool().click()
      toolbar.getRedoTool().click()
      toolbar.getRedoTool().click()
      cy.get('[data-testid="case-card-attr"]').should("have.length", 10)
      cy.get('[data-testid="case-card-attr-name"]').should("have.length", 10)
      cy.get('[data-testid="case-card-attr-name"]').eq(9).should("contain.text", "Memory")

      cy.log("Hide an attribute.")
      cy.get('[data-testid="case-card-attr-name"]').eq(9).click()
      cy.get('[data-testid="attribute-menu-list"]').should("be.visible")
      cy.get('[data-testid="attribute-menu-list"]').find("button").eq(9).trigger("click")
      cy.get('[data-testid="case-card-attr"]').should("have.length", 9)
      cy.get('[data-testid="case-card-attr-name"]').should("have.length", 9)
      cy.get('[data-testid="case-card-attr-value"]').should("have.length", 9)

      // Undo/redo check after hiding an attribute
      toolbar.getUndoTool().click()
      cy.get('[data-testid="case-card-attr"]').should("have.length", 10)
      toolbar.getRedoTool().click()
      cy.get('[data-testid="case-card-attr"]').should("have.length", 9)

      cy.log("Edit an attribute name with undo/redo.")
      cy.get('[data-testid="case-card-attr-name"]').eq(0).should("contain.text", "Mammal")
      cy.get('[data-testid="case-card-attr-name"]').eq(0).click()
      cy.get('[data-testid="attribute-menu-list"]').find("button").first().trigger("click")
      cy.wait(500)
      cy.get('[data-testid="column-name-input"]').type("{selectall}{backspace}Name{enter}")
      cy.get('[data-testid="column-name-input"]').should("not.exist")
      cy.get('[data-testid="case-card-attr-name"]').eq(0).should("contain.text", "Name")

      // Undo/redo check after editing an attribute name
      toolbar.getUndoTool().click()
      cy.get('[data-testid="case-card-attr-name"]').eq(0).should("contain.text", "Mammal")
      toolbar.getRedoTool().click()
      cy.get('[data-testid="case-card-attr-name"]').eq(0).should("contain.text", "Name")

      cy.log("Edit an attribute value.")
      cy.get('[data-testid="case-card-attr-value"]').eq(0).should("contain.text", "African Elephant")
      cy.get('[data-testid="case-card-attr-value"]').eq(0).click()
      cy.get('[data-testid="case-card-attr-value-text-editor"]').eq(0).type("Wooly Mammoth{enter}")
      cy.get('[data-testid="case-card-attr-value"]').eq(0).should("contain.text", "Wooly Mammoth")
      cy.get('[data-testid="case-card-attr-value"]').eq(0).click()
      cy.get('[data-testid="case-card-attr-value-text-editor"]').eq(0).type("{esc}")
      cy.get('[data-testid="case-card-attr-value"]').eq(0).should("contain.text", "Wooly Mammoth")

      // Undo/redo check after editing an attribute value
      toolbar.getUndoTool().click()
      cy.get('[data-testid="case-card-attr-value"]').eq(0).should("contain.text", "African Elephant")
      toolbar.getRedoTool().click()
      cy.get('[data-testid="case-card-attr-value"]').eq(0).should("contain.text", "Wooly Mammoth")
    })
    it("allows the user to add a new case with undo/redo", () => {
      const rootCollectionTitle = "Diets"
      table.moveAttributeToParent("Order", "newCollection")
      cy.wait(500)
      table.moveAttributeToParent("Diet", "newCollection")
      cy.wait(500)
      table.toggleCaseView()
      cy.wait(500)
      cy.get('[data-testid="case-card-view"]').should("have.length", 3)
      cy.log("Add new case to 'middle' collection.")
      cy.get('[data-testid="case-card-view"]').eq(1).find('[data-testid="case-card-view-index"]')
                                                 .eq(0).should("have.text", "4 cases")
      cy.get('[data-testid="case-card-view"]').eq(1).find('[data-testid="add-case-button"]')
                                                 .eq(0).click()
      cy.get('[data-testid="case-card-view"]').eq(1).find('[data-testid="case-card-view-index"]')
                                                 .eq(0).should("have.text", "5 of 5")
      cy.get('[data-testid="case-card-view"]').eq(1).find('[data-testid="case-card-attr-value"]')
                                                 .eq(0).should("exist").click()
      cy.get('[data-testid="case-card-view"]').eq(1).find('[data-testid="case-card-attr-value-text-editor"]')
                                                 .eq(0).should("exist").type("New Order{enter}")
      cy.log("Check new case has parent and child collections' attributes and values match previously-selected case.")
      cy.get('[data-testid="case-card-view"]').eq(0).find('[data-testid="case-card-view-title"]')
                                                 .eq(0).should("have.text", rootCollectionTitle)
      cy.get('[data-testid="case-card-view"]').eq(2).find('[data-testid="case-card-attr-value"]')
                                                 .eq(0).should("have.text", "")

      // Check for undo/redo after adding a new case
      toolbar.getUndoTool().click()
      toolbar.getUndoTool().click()
      cy.get('[data-testid="case-card-view"]').eq(1).find('[data-testid="case-card-view-index"]')
                                                  .eq(0).should("have.text", "4 cases")
      toolbar.getRedoTool().click()
      toolbar.getRedoTool().click()
      cy.get('[data-testid="case-card-view"]').eq(1).find('[data-testid="case-card-view-index"]')
                                                  .eq(0).should("have.text", "5 of 5")

      // Check for undo/redo after editing a case attribute value
      toolbar.getUndoTool().click()
      cy.get('[data-testid="case-card-view"]').eq(1).find('[data-testid="case-card-attr-value"]')
                                                  .eq(0).should("not.contain.text", "New Order")
      toolbar.getRedoTool().click()
      cy.get('[data-testid="case-card-view"]').eq(1).find('[data-testid="case-card-attr-value"]')
                                                  .eq(0).should("contain.text", "New Order")
    })
    it("allows a user to drag an attribute to a new collection", () => {
      table.toggleCaseView()
      cy.wait(500)
      cy.get('[data-testid="case-card-view"]').should("have.length", 1)
      cy.dragAttributeToTarget("card", "Diet", "newTopCardCollection")
      cy.wait(2000)
      cy.get('[data-testid="case-card-view"]').should("have.length", 2)
      cy.get('[data-testid="case-card-view-title"]').first().should("have.text", "Diets")
    })
    it("displays inspector panel when in focus", () => {
      table.toggleCaseView()
      cy.wait(500)
      card.getInspectorPanel().should("exist")
      // click outside the card tile to remove focus
      cy.get('[data-testid="codap-app"]').click()
      card.getInspectorPanel().should("not.exist")
      cy.get('[data-testid="codap-case-card"]').click()
      card.getInspectorPanel().should("exist")
    })
    it("allows user to select and delete all cases from inspector panel", () => {
      table.toggleCaseView()
      cy.wait(500)
      cy.get('[data-testid="case-card-view-next-button"]').click()
      cy.get('[data-testid="case-card-view-index"]').should("have.text", "1 of 27")
      cy.get('[data-testid="case-card-attr-value"]').first().should("have.text", "African Elephant")
      card.getDeleteCasesButton().click()
      cy.wait(500)
      card.getTrashMenu().should("be.visible")
      card.getSelectAllCasesButton().click()
      cy.get('[data-testid="case-card-view-index"]').should("have.text", "27 cases")
      cy.get('[data-testid="case-card-attr-name"]').first().should("contain.text", "Mammal")
      cy.get('[data-testid="case-card-attr-value"]').first().should("have.text", "27 values")
      card.getDeleteCasesButton().click()
      cy.wait(500)
      // resorting to {force: true} because this is failing in CI, though it passes locally
      card.getDeleteAllCasesButton().click({force: true})
      cy.get('[data-testid="case-card-view-index"]').should("have.text", "0 cases")
      cy.get('[data-testid="case-card-attr-name"]').first().should("contain.text", "Mammal")
      cy.get('[data-testid="case-card-attr-value"]').first().should("have.text", "")
    })
    it("allows user to delete selected and unselected cases from inspector panel", () => {
      table.toggleCaseView()
      cy.wait(500)
      cy.get('[data-testid="case-card-view-next-button"]').click()
      cy.get('[data-testid="case-card-view-index"]').should("have.text", "1 of 27")
      cy.get('[data-testid="case-card-attr-value"]').first().should("have.text", "African Elephant")
      card.getDeleteCasesButton().click()
      cy.wait(500)
      cy.get('[data-testid="trash-menu-list"]').should("be.visible")
      card.getDeleteSelectedCasesButton().click()
      cy.get('[data-testid="case-card-view-index"]').should("have.text", "1 of 26")
      cy.get('[data-testid="case-card-attr-value"]').first().should("have.text", "Asian Elephant")
      cy.get('[data-testid="case-card-view-next-button"]').click()
      cy.get('[data-testid="case-card-view-index"]').should("have.text", "2 of 26")
      cy.get('[data-testid="case-card-attr-value"]').first().should("have.text", "Big Brown Bat")
      card.getDeleteCasesButton().click()
      cy.wait(500)
      card.getDeleteUnselectedCasesButton().click()
      cy.get('[data-testid="case-card-view-index"]').should("have.text", "1 of 1")
      cy.get('[data-testid="case-card-attr-value"]').first().should("have.text", "Big Brown Bat")
    })
    it("allows user to set aside and restore cases from inspector panel", () => {
      table.toggleCaseView()
      cy.wait(500)
      card.getHideShowButton().click()
      card.getHideShowMenu().should("be.visible").should("be.visible")
      card.getSetAsideSelectedCasesButton().should("be.disabled")
      cy.get('[data-testid="case-card-view-next-button"]').click()
      cy.get('[data-testid="case-card-view-index"]').should("have.text", "1 of 27")
      cy.get('[data-testid="case-card-attr-value"]').first().should("have.text", "African Elephant")
      card.getHideShowButton().click()
      cy.wait(500)
      card.getRestoreSetAsideCasesButton().should("be.disabled").and("have.text", "Restore 0 Set Aside Cases")
      // resorting to {force: true} because this is failing in CI, though it passes locally
      card.getSetAsideSelectedCasesButton().click({force: true})
      cy.get('[data-testid="case-card-view-index"]').should("have.text", "1 of 26")
      cy.get('[data-testid="case-card-attr-value"]').first().should("have.text", "Asian Elephant")
      card.getHideShowButton().click()
      cy.wait(500)
      card.getRestoreSetAsideCasesButton().should("not.be.disabled").and("have.text", "Restore 1 Set Aside Cases")
      // resorting to {force: true} because this is failing in CI, though it passes locally
      card.getRestoreSetAsideCasesButton().click({force: true})
      cy.get('[data-testid="case-card-view-index"]').should("have.text", "1 of 27")
      cy.get('[data-testid="case-card-attr-value"]').first().should("have.text", "African Elephant")
      card.getHideShowButton().click()
      cy.wait(500)
      card.getRestoreSetAsideCasesButton().should("be.disabled").and("have.text", "Restore 0 Set Aside Cases")
      // resorting to {force: true} because this is failing in CI, though it passes locally
      card.getSetAsideUnselectedCasesButton().click({force: true})
      cy.get('[data-testid="case-card-view-index"]').should("have.text", "1 of 1")
      cy.get('[data-testid="case-card-attr-value"]').first().should("have.text", "African Elephant")
    })
    it("allows user to show hidden attributes from inspector panel", () => {
      table.toggleCaseView()
      cy.wait(500)
      cy.get('[data-testid="case-card-attr"]').should("have.length", 9)
      card.getHideShowButton().click()
      cy.wait(500)
      card.getShowAllHiddenAttributesButton().should("be.disabled")
      // FIXME: Reinstate the below after figuring out why clicking attribute buttons does nothing in Cypress
      // cy.get('[data-testid="case-card-attr-name"]').eq(8).click()
      // cy.get('[data-testid="attribute-menu-list"]').should("be.visible")
      // cy.get('[data-testid="attribute-menu-list"]').find("button").contains("Hide Attribute").click()
      // cy.get('[data-testid="case-card-attr"]').should("have.length", 8)
      // card.getHideShowButton().click()
      // cy.get('[data-testid="hide-show-menu-list"]').should("be.visible")
      // cy.get('[data-testid="hide-show-menu-show-all-hidden-attributes"]').should("not.be.disabled").click()
      // cy.get('[data-testid="case-card-attr"]').should("have.length", 9)
    })
    it("allows user to add an attribute from inspector panel", () => {
      table.toggleCaseView()
      cy.wait(500)
      cy.get('[data-testid="case-card-attr"]').should("have.length", 9)
      card.getRulerButton().click()
      card.getRulerMenu().should("be.visible")
      card.getRulerAddAttributeButton().click()
      cy.wait(500)
      cy.get('[data-testid="column-name-input"]').should("exist").type("Friendliness{enter}")
      cy.get('[data-testid="case-card-attr"]').should("have.length", 10)
    })
  })
})
