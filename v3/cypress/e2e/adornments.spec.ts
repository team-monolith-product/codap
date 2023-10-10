import { GraphTileElements as graph } from "../support/elements/graph-tile"
import { ComponentElements as c } from "../support/elements/component-elements"

context("Graph adornments", () => {
  beforeEach(function () {
    const queryParams = "?sample=mammals&dashboard&mouseSensor"
    const url = `${Cypress.config("index")}${queryParams}`
    cy.visit(url)
    cy.wait(2500)
  })

  it("shows inspector palette when Display Values button is clicked", () => {
    c.selectTile("graph", 0)
    graph.getDisplayValuesButton().click()
    graph.getInspectorPalette().should("be.visible")
  })
  it("adds a count to graph when Count checkbox is checked", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "x")
    cy.dragAttributeToTarget("table", "Speed", "y")
    graph.getDisplayValuesButton().click()
    const inspectorPalette = graph.getInspectorPalette()
    inspectorPalette.should("be.visible")
    const countCheckbox = inspectorPalette.find("[data-testid=adornment-checkbox-count-count]")
    countCheckbox.should("be.visible")
    countCheckbox.click()
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=graph-count]").should("exist")
    // this test has become flaky, sometimes returning 21 and sometimes returning 24
    // cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=graph-count]").should("have.text", "21")
    cy.wait(250)
    countCheckbox.click()
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "hidden")
  })
  it("adds a percent to graph when Percent checkbox is checked", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Diet", "x")
    cy.dragAttributeToTarget("table", "Habitat", "y")
    graph.getDisplayValuesButton().click()
    const inspectorPalette = graph.getInspectorPalette()
    inspectorPalette.should("be.visible")
    const percentCheckbox = inspectorPalette.find("[data-testid=adornment-checkbox-count-percent]")
    percentCheckbox.should("be.visible")
    // percentOptions.should("be.visible")
    // percentOptions.find("input").should("have.attr", "disabled")
    percentCheckbox.click()
    // const percentOptions = inspectorPalette.find("[data-testid=adornment-percent-type-options]")
    // percentOptions.find("input").should("not.have.attr", "disabled")
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 9)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 9)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=graph-count]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=graph-count]").first().should("have.text", "0%")
    cy.wait(250)
    percentCheckbox.click()
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "hidden")
  })
  it("adds mean adornment to graph when Mean checkbox is checked", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "x")
    graph.getDisplayValuesButton().click()
    const inspectorPalette = graph.getInspectorPalette()
    inspectorPalette.should("be.visible")
    const meanCheckbox = inspectorPalette.find("[data-testid=adornment-checkbox-mean]")
    meanCheckbox.should("be.visible")
    meanCheckbox.click()
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=mean]").should("exist")
    cy.get("*[data-testid^=mean-line]").should("exist")
    cy.get("*[data-testid^=mean-cover]").should("exist")
    cy.get("*[data-testid^=mean-tip]").should("exist").should("not.be.visible")
    // TODO: Test that mean-tip appears on mouseover
    // TODO: Also test the above after attributes are added to top and right axes (i.e. when there are multiple means)
    cy.wait(250)
    meanCheckbox.click()
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "hidden")
  })
  it("adds median adornment to graph when Median checkbox is checked", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "x")
    graph.getDisplayValuesButton().click()
    const inspectorPalette = graph.getInspectorPalette()
    inspectorPalette.should("be.visible")
    const medianCheckbox = inspectorPalette.find("[data-testid=adornment-checkbox-median]")
    medianCheckbox.should("be.visible")
    medianCheckbox.click()
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=median]").should("exist")
    cy.get("*[data-testid^=median-line]").should("exist")
    cy.get("*[data-testid^=median-cover]").should("exist")
    cy.get("*[data-testid^=median-tip]").should("exist").should("not.be.visible")
    // TODO: Test that median-tip appears on mouseover
    // TODO: Also test the above after attributes are added to top and right axes (i.e. when there are multiple medians)
    cy.wait(250)
    medianCheckbox.click()
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "hidden")
  })
  it("adds standard deviation adornment to graph when Standard Deviation checkbox is checked", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "x")
    graph.getDisplayValuesButton().click()
    const inspectorPalette = graph.getInspectorPalette()
    inspectorPalette.should("be.visible")
    const sdCheckbox = inspectorPalette.find("[data-testid=adornment-checkbox-standard-deviation]")
    sdCheckbox.should("be.visible")
    sdCheckbox.click()
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=standard-deviation]").should("exist")
    cy.get("*[data-testid^=standard-deviation]").should("exist")
    cy.get("*[data-testid^=standard-deviation-cover]").should("not.exist")
    cy.get("*[data-testid^=standard-deviation-range]").should("exist")
    cy.get("*[data-testid^=standard-deviation-min]").should("exist")
    cy.get("*[data-testid^=standard-deviation-min-cover]").should("exist")
    cy.get("*[data-testid^=standard-deviation-max]").should("exist")
    cy.get("*[data-testid^=standard-deviation-max-cover]").should("exist")
    cy.get("*[data-testid^=standard-deviation-tip]").should("exist").should("not.be.visible")
    // TODO: Test that standard-deviation-tip appears on mouseover
    // TODO: Also test the above after attributes are added to top and right axes (i.e. when there are
    // multiple standard deviations)
    cy.wait(250)
    sdCheckbox.click()
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "hidden")
  })
  it("adds mean absolute deviation adornment to graph when Mean Absolute Deviation checkbox is checked", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "x")
    graph.getDisplayValuesButton().click()
    const inspectorPalette = graph.getInspectorPalette()
    inspectorPalette.should("be.visible")
    const sdCheckbox = inspectorPalette.find("[data-testid=adornment-checkbox-mean-absolute-deviation]")
    sdCheckbox.should("be.visible")
    sdCheckbox.click()
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=mean-absolute-deviation]").should("exist")
    cy.get("*[data-testid^=mean-absolute-deviation]").should("exist")
    cy.get("*[data-testid^=mean-absolute-deviation-cover]").should("not.exist")
    cy.get("*[data-testid^=mean-absolute-deviation-range]").should("exist")
    cy.get("*[data-testid^=mean-absolute-deviation-min]").should("exist")
    cy.get("*[data-testid^=mean-absolute-deviation-min-cover]").should("exist")
    cy.get("*[data-testid^=mean-absolute-deviation-max]").should("exist")
    cy.get("*[data-testid^=mean-absolute-deviation-max-cover]").should("exist")
    cy.get("*[data-testid^=mean-absolute-deviation-tip]").should("exist").should("not.be.visible")
    // TODO: Test that mean-absolute-deviation-tip appears on mouseover
    // TODO: Also test the above after attributes are added to top and right axes (i.e. when there are
    // multiple mean absolute deviations)
    cy.wait(250)
    sdCheckbox.click()
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "hidden")
  })
  it("adds movable labels for univariate measures to graph when Show Measure Labels checkbox is checked", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "x")
    graph.getDisplayValuesButton().click()
    cy.get("[data-testid=adornment-checkbox-mean]").click()
    cy.get("[data-testid=adornment-checkbox-show-measure-labels]").click()
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=mean]").should("exist")
    cy.get("*[data-testid^=mean-line]").should("exist")
    cy.get("*[data-testid^=mean-cover]").should("exist")
    cy.get("*[data-testid^=mean-tip]").should("not.exist")
    cy.get("*[data-testid^=mean-measure-labels-tip]").should("exist")
      .should("be.visible")
      .should("have.text", "mean=10.79")
      .should("have.css", "top", "0px")
      // The exact value of left may vary slightly depending on browser, screen resolution, etc.
      // The below checks that the value is within an expected range to accommodate these variations.
      // Modeled after https://github.com/cypress-io/cypress/issues/14722#issuecomment-767367519
      .should("have.css", "left").should((left: string) => {
        expect(left).to.include("px")
        expect(parseInt(left, 10)).to.be.within(271, 273)
      })
    // TODO: Test drag and drop of label and saving of dropped coordinates
    cy.get("[data-testid=adornment-checkbox-show-measure-labels]").click()
    cy.get("*[data-testid^=mean-measure-labels-tip]").should("not.exist")
  })
  it("adds movable line to graph when Movable Line checkbox is checked", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "x")
    cy.dragAttributeToTarget("table", "Speed", "y")
    graph.getDisplayValuesButton().click()
    const inspectorPalette = graph.getInspectorPalette()
    inspectorPalette.should("be.visible")
    const movableLineCheckbox = inspectorPalette.find("[data-testid=adornment-checkbox-movable-line]")
    movableLineCheckbox.should("be.visible")
    movableLineCheckbox.click()
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=adornment-wrapper]").find("*[data-testid^=movable-line]").should("exist")
    cy.get("[data-testid=adornment-wrapper]").find("*[data-testid^=movable-line-equation-container-]")
      .find("[data-testid=movable-line-equation-]").should("not.be.empty")
    // TODO: Also test the above after attributes are added to top and right axes (i.e. when there are multiple lines)
    // TODO: Test dragging of line and equation value changes
    // TODO: Test unpinning equation box from line
    cy.wait(250)
    movableLineCheckbox.click()
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "hidden")
  })
  it("adds movable point to graph when Movable Point checkbox is checked", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "x")
    cy.dragAttributeToTarget("table", "Speed", "y")
    graph.getDisplayValuesButton().click()
    const inspectorPalette = graph.getInspectorPalette()
    inspectorPalette.should("be.visible")
    const movablePointCheckbox = inspectorPalette.find("[data-testid=adornment-checkbox-movable-point]")
    movablePointCheckbox.should("be.visible")
    movablePointCheckbox.click()
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=movable-point]").should("exist")
    // TODO: Also test the above after attributes are added to top and right axes (i.e. when there are multiple points)
    // TODO: Test dragging of point
    cy.wait(250)
    movablePointCheckbox.click()
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "hidden")
  })
  it("adds plotted value UI to graph when Plotted Value checkbox is checked", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "x")
    graph.getDisplayValuesButton().click()
    const inspectorPalette = graph.getInspectorPalette()
    inspectorPalette.should("be.visible")
    const plottedValueCheckbox = inspectorPalette.find("[data-testid=adornment-checkbox-plotted-value]")
    plottedValueCheckbox.should("be.visible")
    plottedValueCheckbox.click()
    cy.get("[data-testid=graph-adornments-banners]").should("exist")
    cy.get("[data-testid=plotted-value-control]").should("exist")
    cy.get("[data-testid=plotted-value-control-label]").should("exist")
    cy.get("[data-testid=plotted-value-control-value]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=plotted-value-control-label]").should("exist").should("have.text", "value =")
    cy.get("[data-testid=plotted-value-control-value]").should("exist").should("have.text", "")
    cy.wait(250)
    plottedValueCheckbox.click()
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "hidden")
  })
  it("allows adding a plotted value to the graph by entering a value into the plotted value UI", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "x")
    const displayValuesButton = graph.getDisplayValuesButton()
    displayValuesButton.click()
    const inspectorPalette = graph.getInspectorPalette()
    const plottedValueCheckbox = inspectorPalette.find("[data-testid=adornment-checkbox-plotted-value]")
    plottedValueCheckbox.click()
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=plotted-value-control-value]").click()
    cy.get("[data-testid=edit-formula-value-form]").find("[data-testid=formula-value-input]").type("10")
    cy.get("[data-testid=Apply-button]").click()
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=plotted-value]").should("exist")
    cy.get("*[data-testid^=plotted-value-line]").should("exist")
    cy.get("*[data-testid^=plotted-value-cover]").should("exist")
    cy.get("*[data-testid^=plotted-value-tip]").should("exist").should("have.text", "value=10")
    // TODO: Also test the above after attributes are added to top and right axes
    // (i.e. when there are multiple plotted values)
  })
  it("removes plotted value from the graph when both x and y axes are set to numeric attributes", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "x")
    const displayValuesButton = graph.getDisplayValuesButton()
    displayValuesButton.click()
    const inspectorPalette = graph.getInspectorPalette()
    const plottedValueCheckbox = inspectorPalette.find("[data-testid=adornment-checkbox-plotted-value]")
    plottedValueCheckbox.click()
    cy.get("[data-testid=plotted-value-control-value]").click()
    cy.get("[data-testid=edit-formula-value-form]").find("[data-testid=formula-value-input]").type("10")
    cy.get("[data-testid=Apply-button]").click()
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=plotted-value]").should("exist")
    cy.get("*[data-testid^=plotted-value-line]").should("exist")
    cy.get("*[data-testid^=plotted-value-cover]").should("exist")
    cy.get("*[data-testid^=plotted-value-tip]").should("exist").should("have.text", "value=10")
    cy.get("[data-testid=plotted-value-control-value]").click()
    cy.get("[data-testid=edit-formula-value-form]").find("[data-testid=formula-value-input]").clear()
    cy.get("[data-testid=Apply-button]").click()
    cy.get("*[data-testid^=plotted-value-line]").should("not.exist")
    cy.get("*[data-testid^=plotted-value-cover]").should("not.exist")
    cy.get("*[data-testid^=plotted-value-tip]").should("not.exist")
  })
  it("adds movable value to graph when Movable Value button is clicked", () => {
    c.selectTile("graph", 0)
    cy.dragAttributeToTarget("table", "Sleep", "x")
    graph.getDisplayValuesButton().click()
    const inspectorPalette = graph.getInspectorPalette()
    inspectorPalette.should("be.visible")
    const movableValueButton = inspectorPalette.find("[data-testid=adornment-button-movable-value]")
    movableValueButton.should("be.visible")
    movableValueButton.click()
    cy.log("clicking movable value button")
    cy.get("[data-testid=adornment-button-movable-value--add]").should("be.visible")
    cy.get("[data-testid=adornment-button-movable-value--add]").click()
    cy.get("[data-testid=graph-adornments-grid]").should("exist")
    cy.get("[data-testid=graph-adornments-grid]")
      .find("[data-testid=graph-adornments-grid__cell]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.length", 1)
    cy.get("[data-testid=adornment-wrapper]").should("have.class", "visible")
    cy.get("[data-testid=graph-adornments-grid]").find("*[data-testid^=movable-value]").should("exist")
    cy.get(".movable-value-label").should("have.length", 1)
    cy.get(".movable-value-fill").should("have.length", 0)
    cy.log("clicking movable value button -- 1")
    movableValueButton.click()
    cy.log("clicking movable value add button")
    cy.get("[data-testid=adornment-button-movable-value--add]").click()
    cy.get(".movable-value-label").should("have.length", 2)
    cy.get(".movable-value-fill").should("have.length", 1)
    // TODO: Also test the above after attributes are added to top and right axes (i.e. when there are multiple values)
    // TODO: Test dragging of value
    // cy.wait(250)
    // cy.log("clicking movable value button -- 2")
    // movableValueButton.click()
    // cy.log("clicking movable value remove button")
    // cy.get("[data-testid=adornment-button-movable-value--remove]").click()
    // cy.get(".movable-value-label").should("have.length", 1)
    // cy.get(".movable-value-fill").should("have.length", 0)
    // cy.wait(250)
    // cy.log("clicking movable value button -- 3")
    // movableValueButton.click()
    // cy.log("clicking movable value remove button")
    // cy.get("[data-testid=adornment-button-movable-value--remove]").click()
    // cy.get("[data-testid=adornment-wrapper]").should("have.class", "hidden")
    // cy.get(".movable-value-label").should("have.length", 0)
    // cy.get(".movable-value-fill").should("have.length", 0)
  })
})
