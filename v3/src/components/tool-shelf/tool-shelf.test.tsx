import React from "react"
import { userEvent } from '@testing-library/user-event'
import { ToolShelf } from "./tool-shelf"
import { render, screen } from "@testing-library/react"
import { createCodapDocument } from "../../models/codap/create-codap-document"

// way to get a writable reference to libDebug
const libDebug = require("../../lib/debug")

describe("Tool shelf", () => {
  it("renders successfully", () => {
    const document = createCodapDocument()
    render(<ToolShelf document={document}/>)
    expect(screen.getByTestId("tool-shelf")).toBeDefined()
  })

  it("renders successfully when DEBUG_UNDO is set", () => {
    libDebug.DEBUG_UNDO = true

    const document = createCodapDocument()
    jestSpyConsole("log", spy => {
      render(<ToolShelf document={document}/>)
      expect(spy).toHaveBeenCalledTimes(2)
    })
    expect(screen.getByTestId("tool-shelf")).toBeDefined()

    libDebug.DEBUG_UNDO = false
  })

  it("undo/redo buttons do nothing when not enabled", async () => {
    const user = userEvent.setup()
    const document = createCodapDocument()
    render(<ToolShelf document={document}/>)
    expect(screen.getByTestId("tool-shelf")).toBeDefined()

    document.setTitle("New Title")
    await user.click(screen.getByTestId("tool-shelf-button-undo"))
    expect(document.title).toBe("New Title")
    await user.click(screen.getByTestId("tool-shelf-button-redo"))
    expect(document.title).toBe("New Title")
  })

  it("undo/redo buttons work as expected when enabled", async () => {
    const user = userEvent.setup()
    const document = createCodapDocument()
    render(<ToolShelf document={document}/>)
    expect(screen.getByTestId("tool-shelf")).toBeDefined()

    document.treeMonitor?.enableMonitoring()
    document.setTitle("New Title")
    await user.click(screen.getByTestId("tool-shelf-button-undo"))
    expect(document.title).toBeUndefined()
    await user.click(screen.getByTestId("tool-shelf-button-redo"))
    expect(document.title).toBe("New Title")
    document.treeMonitor?.disableMonitoring()
  })
})
