import { Download, FileDown, ImageDown, Info, Layers2 } from "lucide-react";
import { ScanResult } from "../lib/scanProcessor";

interface ExportPanelProps {
  result: ScanResult | null;
  history: Array<{ id: string; name: string; url: string }>;
  activeId: string | null;
  onSelectHistory: (id: string) => void;
  onDownload: (format: "png" | "jpeg") => void;
}

export function ExportPanel({ result, history, activeId, onSelectHistory, onDownload }: ExportPanelProps) {
  return (
    <aside className="panel export-panel" aria-label="导出">
      <div className="panel__header">
        <div>
          <span className="panel__kicker">导出</span>
          <h2>文件输出</h2>
        </div>
        <FileDown size={20} />
      </div>

      <div className="export-actions">
        <button className="primary-button" type="button" disabled={!result} onClick={() => onDownload("png")}>
          <Download size={17} />
          PNG
        </button>
        <button className="secondary-button" type="button" disabled={!result} onClick={() => onDownload("jpeg")}>
          <ImageDown size={17} />
          JPEG
        </button>
      </div>

      <div className="stat-grid">
        <OutputStat label="尺寸" value={result ? `${result.width} x ${result.height}` : "--"} />
        <OutputStat label="校正" value={result ? `${result.deskewDegrees.toFixed(2)} deg` : "--"} />
        <OutputStat label="裁边" value={result?.cropApplied ? "已应用" : "未应用"} />
      </div>

      <div className="quality-note">
        <Info size={16} />
        <span>复印效果、旋转和导出都在浏览器本地完成。</span>
      </div>

      <div className="history-block">
        <div className="history-block__title">
          <Layers2 size={17} />
          最近图片
        </div>
        <div className="history-strip">
          {history.length === 0 && <span className="history-empty">暂无图片</span>}
          {history.map((item) => (
            <button
              key={item.id}
              className={item.id === activeId ? "is-active" : ""}
              type="button"
              onClick={() => onSelectHistory(item.id)}
              title={item.name}
            >
              <img src={item.url} alt={item.name} />
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

function OutputStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="output-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
