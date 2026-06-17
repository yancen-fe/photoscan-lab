import { FilePlus2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ControlPanel } from "./components/ControlPanel";
import { ExportPanel } from "./components/ExportPanel";
import { PreviewStage } from "./components/PreviewStage";
import {
  convertDataUrl,
  defaultSettings,
  loadImage,
  processScanImage,
  ScanResult,
  ScanSettings,
} from "./lib/scanProcessor";
import { createSamplePhoto } from "./lib/sampleImage";

interface HistoryItem {
  id: string;
  name: string;
  url: string;
}

function App() {
  const [settings, setSettings] = useState<ScanSettings>(defaultSettings);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [isProcessing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeImage = useMemo(
    () => history.find((item) => item.id === activeId) ?? null,
    [activeId, history],
  );
  const downloadNames = useMemo(() => {
    if (!result) {
      return null;
    }

    const baseName = stripExtension(activeImage?.name ?? fileName ?? "scan");
    return {
      png: buildDownloadName(baseName, result, "png"),
      jpeg: buildDownloadName(baseName, result, "jpg"),
    };
  }, [activeImage?.name, fileName, result]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!sourceUrl) {
        setResult(null);
        return;
      }

      setProcessing(true);
      setError(null);

      try {
        const image = await loadImage(sourceUrl);
        const scan = await processScanImage(image, settings);
        if (!cancelled) {
          setResult(scan);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "处理图片时出错");
          setResult(null);
        }
      } finally {
        if (!cancelled) {
          setProcessing(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [settings, sourceUrl]);

  function updateSetting<K extends keyof ScanSettings>(key: K, value: ScanSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      const id = crypto.randomUUID();
      setSourceUrl(url);
      setFileName(file.name);
      setActiveId(id);
      setHistory((current) => [{ id, name: file.name, url }, ...current].slice(0, 8));
    };
    reader.readAsDataURL(file);
  }

  function loadSample() {
    const url = createSamplePhoto();
    const id = crypto.randomUUID();
    const name = "sample-application-form.png";
    setSourceUrl(url);
    setFileName(name);
    setActiveId(id);
    setHistory((current) => [{ id, name, url }, ...current].slice(0, 8));
  }

  function selectHistory(id: string) {
    const item = history.find((entry) => entry.id === id);
    if (!item) return;
    setActiveId(item.id);
    setSourceUrl(item.url);
    setFileName(item.name);
  }

  async function download(format: "png" | "jpeg") {
    if (!result) return;
    const mimeType = format === "png" ? "image/png" : "image/jpeg";
    const dataUrl = await convertDataUrl(result.dataUrl, mimeType);
    const link = document.createElement("a");
    const baseName = stripExtension(activeImage?.name ?? fileName ?? "scan");
    const extension = format === "png" ? "png" : "jpg";
    link.download = buildDownloadName(baseName, result, extension);
    link.href = dataUrl;
    link.click();
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand__mark">PS</span>
          <span>
            <strong>PhotoScan Lab</strong>
            <small>申请材料上传版</small>
          </span>
        </div>
        <div className="topbar__status">
          <button className="sample-button" type="button" onClick={loadSample}>
            <FilePlus2 size={16} />
            示例
          </button>
          {error ? <span className="status status--error">{error}</span> : <span className="status">Canvas ready</span>}
        </div>
      </header>

      <div className="workspace">
        <ControlPanel settings={settings} onChange={updateSetting} onReset={() => setSettings(defaultSettings)} />
        <PreviewStage
          originalUrl={sourceUrl}
          processedUrl={result?.dataUrl ?? null}
          fileName={fileName}
          isProcessing={isProcessing}
          cropApplied={result?.cropApplied ?? false}
          rotationApplied={Math.abs(result?.rotationAppliedDegrees ?? 0) > 0.1}
          onFile={handleFile}
        />
        <ExportPanel
          result={result}
          history={history}
          activeId={activeId}
          downloadNames={downloadNames}
          onSelectHistory={selectHistory}
          onDownload={download}
        />
      </div>
    </div>
  );
}

function buildDownloadName(sourceName: string, result: ScanResult, extension: "png" | "jpg") {
  const baseName = toFileNamePart(sourceName) || "scan";
  const cropName = result.cropPresetLabel ? toFileNamePart(result.cropPresetLabel) : "original-ratio";
  const pixelSize = `${result.width}x${result.height}px`;
  return `${baseName}-scan-${cropName}-${pixelSize}.${extension}`;
}

function stripExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}

function toFileNamePart(value: string) {
  return value
    .trim()
    .replace(/\s*x\s*/gi, "x")
    .replace(/\s+(cm|mm|px)\b/gi, "$1")
    .replace(/\s+/g, "-")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default App;
