import { cloneDeep } from "lodash"
import {
  ClientEventCallback, CloudFileManagerClient, CloudFileManagerClientEvent
} from "@concord-consortium/cloud-file-manager"
import { getSnapshot } from "mobx-state-tree"
import { appState } from "../models/app-state"
import { createCodapDocument, isCodapDocument } from "../models/codap/create-codap-document"
import { ICodapV2DocumentJson } from "../v2/codap-v2-types"
import * as ImportV2Document from "../v2/import-v2-document"
import { handleCFMEvent } from "./handle-cfm-event"
import { Logger } from "./logger"

const urlParamsModule = require("../utilities/url-params")

describe("handleCFMEvent", () => {

  let updateDocumentSpy: jest.SpyInstance

  beforeEach(() => {
    updateDocumentSpy = jest.spyOn(Logger, "updateDocument").mockImplementation(() => null)
  })

  afterEach(() => {
    updateDocumentSpy.mockRestore()
  })

  it("handles the `connected` message", async () => {
    const mockCfmClient = {
      openUrlFile: jest.fn(),
      setProviderOptions: jest.fn(),
      _ui: {
        setMenuBarInfo: jest.fn()
      },
    }
    const mockCfmClientArg = mockCfmClient as unknown as CloudFileManagerClient
    const cfmEvent = {
      type: "connected"
    } as CloudFileManagerClientEvent
    await handleCFMEvent(mockCfmClientArg, cfmEvent)
    expect(mockCfmClient.openUrlFile).not.toHaveBeenCalled()
    expect(mockCfmClient.setProviderOptions).toHaveBeenCalledTimes(1)
    const [providerNameArg, providerOptionsArg] = mockCfmClient.setProviderOptions.mock.calls[0]
    expect(providerNameArg).toBe("documentStore")
    expect(providerOptionsArg.appName).toBe("DG")
    expect(providerOptionsArg.appVersion).toBeTruthy()
    expect(providerOptionsArg.appBuildNum).toBeTruthy()
    expect(mockCfmClient._ui.setMenuBarInfo).toHaveBeenCalledTimes(1)
    const menuBarInfoArg = mockCfmClient._ui.setMenuBarInfo.mock.calls[0][0]
    expect(menuBarInfoArg).toBe(`v${providerOptionsArg.appVersion} (${providerOptionsArg.appBuildNum})`)

    urlParamsModule.urlParams.url = "https://concord.org/example.json"
    await handleCFMEvent(mockCfmClientArg, cfmEvent)
    expect(mockCfmClient.openUrlFile).toHaveBeenCalledTimes(1)
    expect(mockCfmClient.setProviderOptions).toHaveBeenCalledTimes(2)
    expect(mockCfmClient._ui.setMenuBarInfo).toHaveBeenCalledTimes(2)
  })

  it("handles the `getContent` message", async () => {
    const mockCfmClient = {} as CloudFileManagerClient
    const mockCfmEvent = {
      type: "getContent",
      callback: jest.fn()
    }
    const mockCfmEventArg = mockCfmEvent as unknown as CloudFileManagerClientEvent
    await handleCFMEvent(mockCfmClient, mockCfmEventArg)

    const contentArg = mockCfmEvent.callback.mock.calls[0][0]
    expect(isCodapDocument(contentArg)).toBe(true)
  })

  it("handles the `getContent` message with sharing info", async () => {
    const mockCfmClient = {} as CloudFileManagerClient
    // This is not real metadata for sharing. Our CFM handler should
    // not care and just add it to the returned content whatever it is.
    const mockSharingInfo = { sharingInfo: "value" }
    const mockCfmEvent = {
      type: "getContent",
      callback: jest.fn(),
      data: {
        shared: mockSharingInfo
      }
    }
    const mockCfmEventArg = mockCfmEvent as unknown as CloudFileManagerClientEvent
    await handleCFMEvent(mockCfmClient, mockCfmEventArg)

    const contentArg = mockCfmEvent.callback.mock.calls[0][0]
    expect(isCodapDocument(contentArg)).toBe(true)

    expect(contentArg.metadata.shared).toEqual(mockSharingInfo)
  })

  it("handles the willOpenFile message", async () => {
    const mockCfmClient = {} as CloudFileManagerClient
    const mockCfmEvent = {
      type: "willOpenFile",
      callback: jest.fn()
    }
    const spy = jest.spyOn(urlParamsModule, "removeDevUrlParams")
    const mockCfmEventArg = mockCfmEvent as unknown as CloudFileManagerClientEvent
    await handleCFMEvent(mockCfmClient, mockCfmEventArg)
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })

  it("handles the `openedFile` message with a v2 document", async () => {
    const mockCfmClient = {} as CloudFileManagerClient
    const mockV2Document: ICodapV2DocumentJson = {
      appName: "DG",
      components: [],
      contexts: []
    } as unknown as ICodapV2DocumentJson
    const cfmEvent = {
      type: "openedFile",
      data: {
        content: mockV2Document
      },
      callback: jest.fn() as ClientEventCallback
    } as CloudFileManagerClientEvent
    const spy = jest.spyOn(ImportV2Document, "importV2Document")
    await handleCFMEvent(mockCfmClient, cfmEvent)
    expect(ImportV2Document.importV2Document).toHaveBeenCalledTimes(1)
    // No error and no shared data
    expect(cfmEvent.callback).toHaveBeenCalledWith(null, {})
    spy.mockRestore()
  })

  it("handles the `openedFile` message with a v3 document", async () => {
    const mockCfmClient = {} as CloudFileManagerClient
    const v3Document = createCodapDocument()
    const cfmEvent = {
      type: "openedFile",
      data: {
        content: getSnapshot(v3Document)
      },
      callback: jest.fn() as ClientEventCallback
    } as CloudFileManagerClientEvent
    const spy = jest.spyOn(appState, "setDocument")
    await handleCFMEvent(mockCfmClient, cfmEvent)
    expect(spy).toHaveBeenCalledTimes(1)
    // No error and no shared data
    expect(cfmEvent.callback).toHaveBeenCalledWith(null, {})
    spy.mockRestore()
  })

  it("handles the `openedFile` message with sharing info", async () => {
    const mockCfmClient = {} as CloudFileManagerClient
    const v3Document = createCodapDocument()
    // This is not real metadata for sharing. Our CFM handler should
    // not care and just return it whatever it is.
    const mockSharingInfo = { sharingInfo: "value" }
    const snapshot = getSnapshot(v3Document)
    const content = cloneDeep(snapshot) as any
    content.metadata = {
      shared: mockSharingInfo
    }

    const cfmEvent = {
      type: "openedFile",
      data: {
        content
      },
      callback: jest.fn() as ClientEventCallback
    } as CloudFileManagerClientEvent
    const spy = jest.spyOn(appState, "setDocument")
    await handleCFMEvent(mockCfmClient, cfmEvent)
    expect(spy).toHaveBeenCalledTimes(1)
    // No error and the sharing info is returned
    expect(cfmEvent.callback).toHaveBeenCalledWith(null, mockSharingInfo)
    spy.mockRestore()
  })
})
