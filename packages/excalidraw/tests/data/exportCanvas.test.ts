import { MIME_TYPES } from "@excalidraw/common";

import { getDefaultAppState } from "../../appState";
import { exportCanvas } from "../../data";

import { API } from "../helpers/api";

const {
  fileSaveMock,
  canvasToBlobMock,
  exportToCanvasMock,
  pdfDocCreateMock,
  embedPngMock,
  addPageMock,
  savePdfMock,
  drawImageMock,
} = vi.hoisted(() => ({
  fileSaveMock: vi.fn(),
  canvasToBlobMock: vi.fn(),
  exportToCanvasMock: vi.fn(),
  pdfDocCreateMock: vi.fn(),
  embedPngMock: vi.fn(),
  addPageMock: vi.fn(),
  savePdfMock: vi.fn(),
  drawImageMock: vi.fn(),
}));

vi.mock("../../data/filesystem", async () => {
  const actual = await vi.importActual<typeof import("../../data/filesystem")>(
    "../../data/filesystem",
  );

  return {
    ...actual,
    fileSave: fileSaveMock,
  };
});

vi.mock("../../data/blob", async () => {
  const actual = await vi.importActual<typeof import("../../data/blob")>(
    "../../data/blob",
  );

  return {
    ...actual,
    canvasToBlob: canvasToBlobMock,
  };
});

vi.mock("../../scene/export", async () => {
  const actual = await vi.importActual<typeof import("../../scene/export")>(
    "../../scene/export",
  );

  return {
    ...actual,
    exportToCanvas: exportToCanvasMock,
  };
});

vi.mock("pdf-lib", () => {
  return {
    PDFDocument: {
      create: pdfDocCreateMock,
    },
  };
});

describe("exportCanvas PDF", () => {
  const appState = {
    ...getDefaultAppState(),
    width: 0,
    height: 0,
    offsetTop: 0,
    offsetLeft: 0,
  };

  beforeEach(() => {
    fileSaveMock.mockResolvedValue(null);
    canvasToBlobMock.mockResolvedValue(
      new Blob([new Uint8Array([1])], { type: MIME_TYPES.png }),
    );
    exportToCanvasMock.mockResolvedValue(document.createElement("canvas"));
    embedPngMock.mockResolvedValue({ width: 100, height: 80 });
    addPageMock.mockReturnValue({ drawImage: drawImageMock });
    savePdfMock.mockResolvedValue(new Uint8Array([1, 2, 3]));
    pdfDocCreateMock.mockResolvedValue({
      embedPng: embedPngMock,
      addPage: addPageMock,
      save: savePdfMock,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("exports one page by default", async () => {
    const frame = API.createElement({
      type: "frame",
      width: 100,
      height: 100,
    });
    const elements = [frame] as any;

    await exportCanvas(
      "pdf",
      elements,
      appState,
      {},
      {
        exportBackground: false,
        viewBackgroundColor: "#fff",
        exportingFrame: null,
      },
    );
    await fileSaveMock.mock.calls[0][0];

    expect(exportToCanvasMock).toHaveBeenCalledTimes(1);
    expect(exportToCanvasMock).toHaveBeenCalledWith(
      elements,
      expect.anything(),
      {},
      expect.objectContaining({ exportingFrame: null }),
    );
    expect(fileSaveMock).toHaveBeenCalledWith(
      expect.any(Promise),
      expect.objectContaining({
        extension: "pdf",
        mimeTypes: [MIME_TYPES.pdf],
      }),
    );
  });

  it("exports each frame as a separate page when enabled", async () => {
    const frame1 = API.createElement({
      type: "frame",
      width: 100,
      height: 100,
    });
    const frame2 = API.createElement({
      type: "frame",
      width: 150,
      height: 100,
      x: 200,
    });
    const elements = [frame1, frame2] as any;

    await exportCanvas(
      "pdf",
      elements,
      appState,
      {},
      {
        exportBackground: false,
        viewBackgroundColor: "#fff",
        exportingFrame: null,
        exportPdfPerFrame: true,
      },
    );
    await fileSaveMock.mock.calls[0][0];

    expect(exportToCanvasMock).toHaveBeenCalledTimes(2);
    expect(exportToCanvasMock).toHaveBeenNthCalledWith(
      1,
      elements,
      expect.anything(),
      {},
      expect.objectContaining({ exportingFrame: frame1 }),
    );
    expect(exportToCanvasMock).toHaveBeenNthCalledWith(
      2,
      elements,
      expect.anything(),
      {},
      expect.objectContaining({ exportingFrame: frame2 }),
    );
    expect(addPageMock).toHaveBeenCalledTimes(2);
    expect(drawImageMock).toHaveBeenCalledTimes(2);
  });
});
