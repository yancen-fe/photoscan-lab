import { Loader2, MoveHorizontal, ScanSearch } from "lucide-react";
import { useState } from "react";
import { DropZone } from "./DropZone";

interface PreviewStageProps {
  originalUrl: string | null;
  processedUrl: string | null;
  fileName: string | null;
  isProcessing: boolean;
  cropApplied: boolean;
  rotationApplied: boolean;
  onFile: (file: File) => void;
}

export function PreviewStage({
  originalUrl,
  processedUrl,
  fileName,
  isProcessing,
  cropApplied,
  rotationApplied,
  onFile,
}: PreviewStageProps) {
  const [compare, setCompare] = useState(48);
  const hasImage = Boolean(originalUrl);
  const canCompare = Boolean(originalUrl && processedUrl && !cropApplied && !rotationApplied);

  return (
    <main className="preview-stage">
      <div className="preview-stage__bar">
        <div>
          <span className="panel__kicker">画布</span>
          <h1>{fileName ?? "图片转上传材料"}</h1>
        </div>
        <DropZone compact onFile={onFile} />
      </div>

      <section className={`canvas-shell ${hasImage ? "has-image" : ""}`}>
        {!hasImage && (
          <div className="empty-canvas">
            <ScanSearch size={42} />
            <DropZone onFile={onFile} />
          </div>
        )}

        {originalUrl && (
          <div className="comparison-frame" style={{ "--compare": `${compare}%` } as React.CSSProperties}>
            <img className="scan-image scan-image--processed" src={processedUrl ?? originalUrl} alt="扫描结果" />
            {canCompare && (
              <>
                <div className="comparison-frame__before">
                  <img className="scan-image" src={originalUrl} alt="原图预览" />
                </div>
                <div className="comparison-frame__handle" aria-hidden="true">
                  <MoveHorizontal size={16} />
                </div>
              </>
            )}
            {cropApplied && <div className="processing-badge processing-badge--still">已裁切</div>}
            {!cropApplied && rotationApplied && (
              <div className="processing-badge processing-badge--still">已旋转</div>
            )}
            {isProcessing && (
              <div className="processing-badge">
                <Loader2 size={16} />
                处理中
              </div>
            )}
          </div>
        )}
      </section>

      <div className="compare-control">
        <span>原图</span>
        <input
          type="range"
          min="0"
          max="100"
          value={compare}
          onChange={(event) => setCompare(Number(event.target.value))}
          disabled={!canCompare}
          aria-label="原图与扫描结果对比"
        />
        <span>扫描</span>
      </div>
    </main>
  );
}
