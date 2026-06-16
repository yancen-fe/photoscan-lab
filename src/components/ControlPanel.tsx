import {
  ClipboardCheck,
  Contrast,
  Eraser,
  History,
  Palette,
  RotateCcw,
  RotateCw,
  ScanLine,
  SlidersHorizontal,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { defaultSettings, ScanSettings, ScanStyle } from "../lib/scanProcessor";

interface ControlPanelProps {
  settings: ScanSettings;
  onChange: <K extends keyof ScanSettings>(key: K, value: ScanSettings[K]) => void;
  onReset: () => void;
}

const styleOptions: Array<{ value: ScanStyle; label: string }> = [
  { value: "application", label: "复印" },
  { value: "balanced", label: "标准" },
  { value: "crisp", label: "清晰" },
  { value: "mono", label: "黑白" },
];

export function ControlPanel({ settings, onChange, onReset }: ControlPanelProps) {
  return (
    <aside className="panel control-panel" aria-label="扫描参数">
      <div className="panel__header">
        <div>
          <span className="panel__kicker">扫描参数</span>
          <h2>复印效果</h2>
        </div>
        <button className="icon-button" type="button" onClick={onReset} title="重置参数">
          <History size={17} />
        </button>
      </div>

      <div className="segmented" role="list" aria-label="扫描风格">
        {styleOptions.map((option) => (
          <button
            key={option.value}
            className={settings.style === option.value ? "is-selected" : ""}
            type="button"
            disabled={settings.preserveColor}
            onClick={() => onChange("style", option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <button
        className={`preserve-color-button ${settings.preserveColor ? "is-active" : ""}`}
        type="button"
        aria-pressed={settings.preserveColor}
        onClick={() => onChange("preserveColor", !settings.preserveColor)}
      >
        <Palette size={16} />
        {settings.preserveColor ? "使用原色" : "还原色彩"}
      </button>

      <div className="control-stack">
        <SliderControl
          icon={<Sparkles size={16} />}
          label="亮度"
          min={-40}
          max={50}
          value={settings.brightness}
          disabled={settings.preserveColor}
          onChange={(value) => onChange("brightness", value)}
        />
        <SliderControl
          icon={<Contrast size={16} />}
          label="对比"
          min={-35}
          max={75}
          value={settings.contrast}
          disabled={settings.preserveColor}
          onChange={(value) => onChange("contrast", value)}
        />
        <SliderControl
          icon={<ScanLine size={16} />}
          label="黑白阈值"
          min={0}
          max={85}
          value={settings.threshold}
          disabled={settings.preserveColor}
          onChange={(value) => onChange("threshold", value)}
        />
        <SliderControl
          icon={<SlidersHorizontal size={16} />}
          label="锐化"
          min={0}
          max={100}
          value={settings.sharpness}
          disabled={settings.preserveColor}
          onChange={(value) => onChange("sharpness", value)}
        />
        <SliderControl
          icon={<Eraser size={16} />}
          label="碳粉颗粒"
          min={0}
          max={34}
          value={settings.grain}
          disabled={settings.preserveColor}
          onChange={(value) => onChange("grain", value)}
        />
        <SliderControl
          icon={<RotateCw size={16} />}
          label="旋转角度"
          min={-15}
          max={15}
          step={0.5}
          value={settings.rotation}
          valueText={`${settings.rotation.toFixed(1)} deg`}
          onChange={(value) => onChange("rotation", value)}
        />
      </div>

      <div className="toggle-list">
        <ToggleRow
          icon={<ClipboardCheck size={17} />}
          label="灰度输出"
          checked={settings.grayscale}
          disabled={settings.preserveColor}
          onChange={(value) => onChange("grayscale", value)}
        />
        <ToggleRow
          icon={<WandSparkles size={17} />}
          label="背景铺平"
          checked={settings.backgroundFlatten}
          disabled={settings.preserveColor}
          onChange={(value) => onChange("backgroundFlatten", value)}
        />
        <ToggleRow
          icon={<Eraser size={17} />}
          label="边缘净化"
          checked={settings.edgeCleanup}
          disabled={settings.preserveColor}
          onChange={(value) => onChange("edgeCleanup", value)}
        />
        <ToggleRow
          icon={<ScanLine size={17} />}
          label="自动裁边"
          checked={settings.autoCrop}
          onChange={(value) => onChange("autoCrop", value)}
        />
        <ToggleRow
          icon={<RotateCcw size={17} />}
          label="自动校正"
          checked={settings.deskew}
          onChange={(value) => onChange("deskew", value)}
        />
      </div>

      <div className="rotate-actions" aria-label="旋转图片">
        <button type="button" onClick={() => onChange("rotationTurns", settings.rotationTurns - 1)}>
          <RotateCcw size={16} />
          左转90
        </button>
        <button type="button" onClick={() => onChange("rotationTurns", settings.rotationTurns + 1)}>
          <RotateCw size={16} />
          右转90
        </button>
        <button
          type="button"
          onClick={() => {
            onChange("rotation", defaultSettings.rotation);
            onChange("rotationTurns", defaultSettings.rotationTurns);
          }}
        >
          归零
        </button>
      </div>
    </aside>
  );
}

interface SliderControlProps {
  icon: React.ReactNode;
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  valueText?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}

function SliderControl({
  icon,
  label,
  min,
  max,
  step = 1,
  value,
  valueText,
  disabled = false,
  onChange,
}: SliderControlProps) {
  return (
    <label className={`slider-control ${disabled ? "is-disabled" : ""}`}>
      <span className="slider-control__top">
        <span>
          {icon}
          {label}
        </span>
        <strong>{valueText ?? value}</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

interface ToggleRowProps {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}

function ToggleRow({ icon, label, checked, disabled = false, onChange }: ToggleRowProps) {
  return (
    <label className={`toggle-row ${disabled ? "is-disabled" : ""}`}>
      <span className="toggle-row__label">
        {icon}
        {label}
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="switch" aria-hidden="true" />
    </label>
  );
}
