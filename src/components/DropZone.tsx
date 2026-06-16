import { FileImage, UploadCloud } from "lucide-react";
import { useRef, useState } from "react";

interface DropZoneProps {
  onFile: (file: File) => void;
  compact?: boolean;
}

export function DropZone({ onFile, compact = false }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file && file.type.startsWith("image/")) {
      onFile(file);
    }
  }

  return (
    <button
      className={`drop-zone ${dragging ? "is-dragging" : ""} ${compact ? "is-compact" : ""}`}
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/bmp"
        onChange={(event) => handleFiles(event.target.files)}
      />
      <span className="drop-zone__icon" aria-hidden="true">
        {compact ? <FileImage size={20} /> : <UploadCloud size={28} />}
      </span>
      <span className="drop-zone__text">{compact ? "更换图片" : "拖入图片或点击导入"}</span>
      {!compact && <span className="drop-zone__meta">JPG / PNG / WEBP / BMP</span>}
    </button>
  );
}
