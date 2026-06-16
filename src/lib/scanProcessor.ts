export type ScanStyle = "application" | "balanced" | "crisp" | "mono" | "receipt";

export interface ScanSettings {
  style: ScanStyle;
  brightness: number;
  contrast: number;
  sharpness: number;
  threshold: number;
  grain: number;
  grayscale: boolean;
  backgroundFlatten: boolean;
  edgeCleanup: boolean;
  autoCrop: boolean;
  deskew: boolean;
  preserveColor: boolean;
  rotation: number;
  rotationTurns: number;
}

export interface ScanResult {
  dataUrl: string;
  width: number;
  height: number;
  deskewDegrees: number;
  cropApplied: boolean;
  rotationAppliedDegrees: number;
}

interface AnalysisPoint {
  x: number;
  y: number;
}

interface AnalysisBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface PointSet {
  bounds: AnalysisBounds;
  points: AnalysisPoint[];
}

export const defaultSettings: ScanSettings = {
  style: "application",
  brightness: 4,
  contrast: 18,
  sharpness: 48,
  threshold: 10,
  grain: 8,
  grayscale: true,
  backgroundFlatten: true,
  edgeCleanup: true,
  autoCrop: false,
  deskew: true,
  preserveColor: false,
  rotation: 0,
  rotationTurns: 0,
};

const styleAdjustments: Record<
  ScanStyle,
  Pick<ScanSettings, "brightness" | "contrast" | "sharpness" | "threshold" | "grain">
> = {
  application: { brightness: 0, contrast: 10, sharpness: 8, threshold: 0, grain: 2 },
  balanced: { brightness: 0, contrast: 0, sharpness: 0, threshold: 0, grain: 0 },
  crisp: { brightness: 7, contrast: 16, sharpness: 12, threshold: 8, grain: -2 },
  mono: { brightness: 2, contrast: 30, sharpness: 18, threshold: 28, grain: 1 },
  receipt: { brightness: 14, contrast: 10, sharpness: 8, threshold: -4, grain: 8 },
};

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片加载失败"));
    image.src = src;
  });
}

export async function processScanImage(
  image: HTMLImageElement,
  settings: ScanSettings,
): Promise<ScanResult> {
  const source = drawSourceImage(image);
  const strictUpload = settings.style === "application";
  const estimated = settings.deskew ? estimateSkew(source, strictUpload) : 0;
  const manualRotation = settings.rotation + settings.rotationTurns * 90;
  const appliedRotation = manualRotation - estimated;
  const corrected = rotateCanvas(source, appliedRotation);
  const pageCrop = settings.autoCrop ? cropDocumentEdges(corrected, strictUpload) : { canvas: corrected, applied: false };
  const processed = renderScanPixels(pageCrop.canvas, settings);
  const cropped =
    settings.autoCrop && !pageCrop.applied ? cropCanvas(processed) : { canvas: processed, applied: false };

  return {
    dataUrl: cropped.canvas.toDataURL("image/png"),
    width: cropped.canvas.width,
    height: cropped.canvas.height,
    deskewDegrees: estimated,
    cropApplied: pageCrop.applied || cropped.applied,
    rotationAppliedDegrees: appliedRotation,
  };
}

export async function convertDataUrl(
  dataUrl: string,
  mimeType: "image/png" | "image/jpeg",
): Promise<string> {
  if (mimeType === "image/png") {
    return dataUrl;
  }

  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = get2d(canvas);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.92);
}

function drawSourceImage(image: HTMLImageElement): HTMLCanvasElement {
  const maxEdge = 2200;
  const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = get2d(canvas);
  context.fillStyle = "#f6f7f9";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  return canvas;
}

function renderScanPixels(source: HTMLCanvasElement, settings: ScanSettings): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const context = get2d(canvas);
  context.drawImage(source, 0, 0);

  if (settings.preserveColor) {
    return canvas;
  }

  const data = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = data.data;
  const grayMap = buildGrayMap(pixels, canvas.width, canvas.height);
  const preset = styleAdjustments[settings.style];
  const brightness = settings.brightness + preset.brightness;
  const contrast = clamp(settings.contrast + preset.contrast, -90, 120);
  const threshold = clamp(settings.threshold + preset.threshold, 0, 95);
  const grain = clamp(settings.grain + preset.grain, 0, 40);
  const uploadMode = settings.style === "application";
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const thresholdLine = 222 - threshold * 1.42;
  const thresholdMix = threshold / 100;

  for (let index = 0; index < pixels.length; index += 4) {
    const x = (index / 4) % canvas.width;
    const y = Math.floor(index / 4 / canvas.width);
    const pixelIndex = index / 4;
    const gray = grayMap[pixelIndex];
    let value = contrastFactor * (gray - 128) + 128 + brightness;

    if (settings.backgroundFlatten) {
      const flattenFloor = uploadMode ? 168 : 158;
      const flattenStrength = uploadMode ? 0.34 : 0.42;
      if (value > flattenFloor) {
        const paperWhite = uploadMode ? 244 : 255;
        value = value + (paperWhite - value) * flattenStrength;
      }
    }

    if (threshold > 0) {
      const hard = value < thresholdLine ? value * 0.36 : 250 + (value - thresholdLine) * 0.12;
      value = value * (1 - thresholdMix) + hard * thresholdMix;
    }

    if (settings.edgeCleanup) {
      const whiteCutoff = uploadMode ? 250 : 236;
      if (value > whiteCutoff) value = uploadMode ? 246 : 255;
      if (value < 38 + threshold * 0.12) value = 0;
    }

    if (uploadMode) {
      const edgeStrength = localEdgeStrength(grayMap, canvas.width, canvas.height, x, y);
      const edgeDarken = clamp((edgeStrength - 7) * 0.28, 0, 18);
      value -= edgeDarken;

      if (value > 208) {
        value -= Math.max(0, deterministicNoise(x * 0.17, y * 0.17)) * 3.2;
      }
    }

    value += deterministicNoise(x, y) * grain;
    value = clamp(value, 0, 255);

    if (settings.grayscale || settings.style === "mono") {
      pixels[index] = value;
      pixels[index + 1] = value;
      pixels[index + 2] = value;
    } else {
      pixels[index] = clamp(value + 3, 0, 255);
      pixels[index + 1] = clamp(value + 1, 0, 255);
      pixels[index + 2] = clamp(value - 2, 0, 255);
    }
  }

  const sharpenAmount = clamp((settings.sharpness + preset.sharpness) / 100, 0, 1.35);
  const sharpened = sharpenAmount > 0.03 ? sharpenImageData(data, canvas.width, canvas.height, sharpenAmount) : data;
  context.putImageData(sharpened, 0, 0);
  return canvas;
}

function estimateSkew(canvas: HTMLCanvasElement, strictUpload: boolean): number {
  const lineSkew = estimateLineSkew(canvas, strictUpload);
  if (lineSkew !== null) {
    return lineSkew;
  }

  const edgeSkew = estimatePaperEdgeSkew(canvas, strictUpload);
  if (edgeSkew !== null) {
    return edgeSkew;
  }

  const paperPoints = collectPaperPoints(canvas, strictUpload);
  if (isUsablePointSet(paperPoints, canvas, 0.08, 0.94)) {
    return estimateAngleFromPointSet(paperPoints.points);
  }

  const contentPoints = collectContentPoints(canvas, strictUpload);
  if (isUsablePointSet(contentPoints, canvas, 0.04, 0.88)) {
    return estimateAngleFromPointSet(contentPoints.points);
  }

  return estimateInkPcaSkew(canvas);
}

function estimatePaperEdgeSkew(canvas: HTMLCanvasElement, strictUpload: boolean): number | null {
  const context = get2d(canvas);
  const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const stride = Math.max(3, Math.round(Math.min(canvas.width, canvas.height) / 520));
  const borderMean = sampleBorderBrightness(data, canvas.width, canvas.height, stride);
  const threshold = strictUpload
    ? Math.max(210, Math.min(248, borderMean + 4))
    : Math.max(226, Math.min(250, borderMean + 3));
  const chromaLimit = strictUpload ? 58 : 42;
  const columns = new Map<number, { count: number; maxY: number; minY: number; x: number }>();

  for (let y = 0; y < canvas.height; y += stride) {
    for (let x = 0; x < canvas.width; x += stride) {
      const offset = (y * canvas.width + x) * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);

      if (gray > threshold && chroma < chromaLimit) {
        const key = Math.round(x / stride);
        const column = columns.get(key) ?? { count: 0, maxY: Number.NEGATIVE_INFINITY, minY: Number.POSITIVE_INFINITY, x };
        column.count += 1;
        column.minY = Math.min(column.minY, y);
        column.maxY = Math.max(column.maxY, y);
        columns.set(key, column);
      }
    }
  }

  const validColumns = Array.from(columns.values()).filter((column) => column.count >= 4);
  if (validColumns.length < 18) {
    return null;
  }

  const minX = Math.min(...validColumns.map((column) => column.x));
  const maxX = Math.max(...validColumns.map((column) => column.x));
  if (maxX - minX < canvas.width * 0.24 || maxX - minX > canvas.width * 0.96) {
    return null;
  }

  const topPoints = trimEdgePoints(validColumns.map((column) => ({ x: column.x, y: column.minY })));
  const bottomPoints = trimEdgePoints(validColumns.map((column) => ({ x: column.x, y: column.maxY })));
  const topAngle = fitHorizontalAngle(topPoints);
  const bottomAngle = fitHorizontalAngle(bottomPoints);
  const candidates = [topAngle, bottomAngle].filter(
    (angle): angle is number => angle !== null && Math.abs(angle) >= 0.15 && Math.abs(angle) <= 10,
  );

  if (candidates.length === 0) {
    return null;
  }

  return candidates.reduce((total, angle) => total + angle, 0) / candidates.length;
}

function estimateLineSkew(canvas: HTMLCanvasElement, strictUpload: boolean): number | null {
  const contentPoints = collectLinePoints(canvas, strictUpload);
  if (!isUsablePointSet(contentPoints, canvas, 0.015, 0.82)) {
    return null;
  }

  const zeroScore = lineProjectionScore(contentPoints.points, 0);
  const coarse = searchBestLineSkew(contentPoints.points, -10, 10, 0.25);
  const fine = searchBestLineSkew(contentPoints.points, coarse.angle - 0.35, coarse.angle + 0.35, 0.05);

  if (!Number.isFinite(fine.score) || Math.abs(fine.angle) < 0.12) {
    return null;
  }

  if (fine.score < zeroScore * 1.004) {
    return null;
  }

  return clamp(fine.angle, -10, 10);
}

function collectLinePoints(canvas: HTMLCanvasElement, strictUpload: boolean): PointSet {
  const context = get2d(canvas);
  const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const stride = Math.max(2, Math.round(Math.min(canvas.width, canvas.height) / 560));
  const borderMean = sampleBorderBrightness(data, canvas.width, canvas.height, stride);
  const inkThreshold = strictUpload ? Math.min(198, borderMean - 12) : Math.min(186, borderMean - 20);
  const points: AnalysisPoint[] = [];
  const bounds = createEmptyBounds();

  for (let y = 0; y < canvas.height; y += stride) {
    for (let x = 0; x < canvas.width; x += stride) {
      const offset = (y * canvas.width + x) * 4;
      const gray = 0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2];

      if (gray < inkThreshold) {
        addPoint(points, bounds, x, y);
      }
    }
  }

  return { bounds, points };
}

function searchBestLineSkew(
  points: AnalysisPoint[],
  start: number,
  end: number,
  step: number,
): { angle: number; score: number } {
  let bestAngle = 0;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let angle = start; angle <= end + step / 2; angle += step) {
    const roundedAngle = Math.round(angle * 100) / 100;
    const score = lineProjectionScore(points, roundedAngle);
    if (score > bestScore) {
      bestAngle = roundedAngle;
      bestScore = score;
    }
  }

  return { angle: bestAngle, score: bestScore };
}

function lineProjectionScore(points: AnalysisPoint[], skewDegrees: number): number {
  const radians = (-skewDegrees * Math.PI) / 180;
  const sin = Math.sin(radians);
  const cos = Math.cos(radians);
  const binSize = 4;
  const bins = new Map<number, number>();

  for (const point of points) {
    const y = point.x * sin + point.y * cos;
    const key = Math.round(y / binSize);
    bins.set(key, (bins.get(key) ?? 0) + 1);
  }

  let score = 0;
  for (const count of bins.values()) {
    score += count * count;
  }

  return score / points.length;
}

function trimEdgePoints(points: AnalysisPoint[]): AnalysisPoint[] {
  if (points.length < 12) {
    return points;
  }

  const sortedByX = [...points].sort((a, b) => a.x - b.x);
  const trim = Math.max(2, Math.round(sortedByX.length * 0.08));
  return sortedByX.slice(trim, sortedByX.length - trim);
}

function fitHorizontalAngle(points: AnalysisPoint[]): number | null {
  if (points.length < 8) {
    return null;
  }

  const meanX = points.reduce((total, point) => total + point.x, 0) / points.length;
  const meanY = points.reduce((total, point) => total + point.y, 0) / points.length;
  let numerator = 0;
  let denominator = 0;

  for (const point of points) {
    const dx = point.x - meanX;
    numerator += dx * (point.y - meanY);
    denominator += dx * dx;
  }

  if (denominator === 0) {
    return null;
  }

  return (Math.atan(numerator / denominator) * 180) / Math.PI;
}

function collectPaperPoints(canvas: HTMLCanvasElement, strictUpload: boolean): PointSet {
  const context = get2d(canvas);
  const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const stride = Math.max(3, Math.round(Math.min(canvas.width, canvas.height) / 340));
  const borderMean = sampleBorderBrightness(data, canvas.width, canvas.height, stride);
  const threshold = strictUpload
    ? Math.max(210, Math.min(248, borderMean + 4))
    : Math.max(226, Math.min(250, borderMean + 3));
  const chromaLimit = strictUpload ? 58 : 42;
  const points: AnalysisPoint[] = [];
  const bounds = createEmptyBounds();

  for (let y = 0; y < canvas.height; y += stride) {
    for (let x = 0; x < canvas.width; x += stride) {
      const offset = (y * canvas.width + x) * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);

      if (gray > threshold && chroma < chromaLimit) {
        addPoint(points, bounds, x, y);
      }
    }
  }

  return { bounds, points };
}

function collectContentPoints(canvas: HTMLCanvasElement, strictUpload: boolean): PointSet {
  const context = get2d(canvas);
  const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const stride = Math.max(3, Math.round(Math.min(canvas.width, canvas.height) / 420));
  const borderMean = sampleBorderBrightness(data, canvas.width, canvas.height, stride);
  const inkThreshold = strictUpload ? Math.min(210, borderMean - 16) : Math.min(190, borderMean - 22);
  const points: AnalysisPoint[] = [];
  const bounds = createEmptyBounds();

  for (let y = 0; y < canvas.height; y += stride) {
    for (let x = 0; x < canvas.width; x += stride) {
      const offset = (y * canvas.width + x) * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      const isInk = gray < inkThreshold || (strictUpload && gray < 226 && chroma > 42);

      if (isInk) {
        addPoint(points, bounds, x, y);
      }
    }
  }

  return { bounds, points };
}

function createEmptyBounds(): AnalysisBounds {
  return {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };
}

function addPoint(points: AnalysisPoint[], bounds: AnalysisBounds, x: number, y: number): void {
  points.push({ x, y });
  bounds.minX = Math.min(bounds.minX, x);
  bounds.minY = Math.min(bounds.minY, y);
  bounds.maxX = Math.max(bounds.maxX, x);
  bounds.maxY = Math.max(bounds.maxY, y);
}

function isUsablePointSet(
  pointSet: PointSet,
  canvas: HTMLCanvasElement,
  minAreaRatio: number,
  maxAreaRatio: number,
): boolean {
  if (pointSet.points.length < 80 || !Number.isFinite(pointSet.bounds.minX)) {
    return false;
  }

  const width = pointSet.bounds.maxX - pointSet.bounds.minX;
  const height = pointSet.bounds.maxY - pointSet.bounds.minY;
  const areaRatio = (width * height) / (canvas.width * canvas.height);

  return (
    width > canvas.width * 0.16 &&
    height > canvas.height * 0.16 &&
    areaRatio >= minAreaRatio &&
    areaRatio <= maxAreaRatio
  );
}

function estimateAngleFromPointSet(points: AnalysisPoint[]): number {
  if (points.length < 80) {
    return 0;
  }

  const zeroScore = skewScore(points, 0);
  const coarse = searchBestSkew(points, -10, 10, 0.25);
  const fine = searchBestSkew(points, coarse.angle - 0.35, coarse.angle + 0.35, 0.05);

  if (!Number.isFinite(fine.score) || Math.abs(fine.angle) < 0.12) {
    return 0;
  }

  if (fine.score > zeroScore * 0.997) {
    return 0;
  }

  return clamp(fine.angle, -10, 10);
}

function searchBestSkew(
  points: AnalysisPoint[],
  start: number,
  end: number,
  step: number,
): { angle: number; score: number } {
  let bestAngle = 0;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let angle = start; angle <= end + step / 2; angle += step) {
    const roundedAngle = Math.round(angle * 100) / 100;
    const score = skewScore(points, roundedAngle);
    if (score < bestScore) {
      bestAngle = roundedAngle;
      bestScore = score;
    }
  }

  return { angle: bestAngle, score: bestScore };
}

function skewScore(points: AnalysisPoint[], skewDegrees: number): number {
  const radians = (-skewDegrees * Math.PI) / 180;
  const sin = Math.sin(radians);
  const cos = Math.cos(radians);
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const point of points) {
    const x = point.x * cos - point.y * sin;
    const y = point.x * sin + point.y * cos;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  return Math.max(1, maxX - minX) * Math.max(1, maxY - minY);
}

function estimateInkPcaSkew(canvas: HTMLCanvasElement): number {
  const context = get2d(canvas);
  const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const stride = Math.max(4, Math.round(Math.min(canvas.width, canvas.height) / 420));
  let count = 0;
  let sumX = 0;
  let sumY = 0;

  for (let y = 0; y < canvas.height; y += stride) {
    for (let x = 0; x < canvas.width; x += stride) {
      const offset = (y * canvas.width + x) * 4;
      const gray = 0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2];
      if (gray < 170) {
        sumX += x;
        sumY += y;
        count += 1;
      }
    }
  }

  if (count < 60) return 0;

  const meanX = sumX / count;
  const meanY = sumY / count;
  let covXX = 0;
  let covYY = 0;
  let covXY = 0;

  for (let y = 0; y < canvas.height; y += stride) {
    for (let x = 0; x < canvas.width; x += stride) {
      const offset = (y * canvas.width + x) * 4;
      const gray = 0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2];
      if (gray < 170) {
        const dx = x - meanX;
        const dy = y - meanY;
        covXX += dx * dx;
        covYY += dy * dy;
        covXY += dx * dy;
      }
    }
  }

  let degrees = (0.5 * Math.atan2(2 * covXY, covXX - covYY) * 180) / Math.PI;
  if (degrees > 45) degrees -= 90;
  if (degrees < -45) degrees += 90;
  if (Math.abs(degrees) > 8) return 0;
  if (Math.abs(degrees) < 0.18) return 0;
  return degrees;
}

function rotateCanvas(source: HTMLCanvasElement, degrees: number): HTMLCanvasElement {
  const roundedDegrees = Math.round(degrees * 100) / 100;
  if (Math.abs(roundedDegrees) < 0.01) {
    return source;
  }

  const radians = (roundedDegrees * Math.PI) / 180;
  const sin = Math.abs(Math.sin(radians));
  const cos = Math.abs(Math.cos(radians));
  const width = Math.ceil(source.width * cos + source.height * sin);
  const height = Math.ceil(source.width * sin + source.height * cos);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = get2d(canvas);
  context.fillStyle = "#d8e0ea";
  context.fillRect(0, 0, width, height);
  context.translate(width / 2, height / 2);
  context.rotate(radians);
  context.drawImage(source, -source.width / 2, -source.height / 2);
  return canvas;
}

function cropCanvas(source: HTMLCanvasElement): { canvas: HTMLCanvasElement; applied: boolean } {
  const context = get2d(source);
  const image = context.getImageData(0, 0, source.width, source.height);
  const pixels = image.data;
  let minX = source.width;
  let minY = source.height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < source.height; y += 2) {
    for (let x = 0; x < source.width; x += 2) {
      const offset = (y * source.width + x) * 4;
      const value = (pixels[offset] + pixels[offset + 1] + pixels[offset + 2]) / 3;
      if (value < 246) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (minX >= maxX || minY >= maxY) {
    return { canvas: source, applied: false };
  }

  const margin = Math.round(Math.min(source.width, source.height) * 0.025);
  minX = Math.max(0, minX - margin);
  minY = Math.max(0, minY - margin);
  maxX = Math.min(source.width, maxX + margin);
  maxY = Math.min(source.height, maxY + margin);

  const width = maxX - minX;
  const height = maxY - minY;
  const coversMostImage = width > source.width * 0.94 && height > source.height * 0.94;

  if (coversMostImage) {
    return { canvas: source, applied: false };
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const croppedContext = get2d(canvas);
  croppedContext.fillStyle = "#ffffff";
  croppedContext.fillRect(0, 0, width, height);
  croppedContext.drawImage(source, minX, minY, width, height, 0, 0, width, height);
  return { canvas, applied: true };
}

function cropDocumentEdges(source: HTMLCanvasElement, strictUpload: boolean): { canvas: HTMLCanvasElement; applied: boolean } {
  const brightCrop = cropBrightDocument(source, strictUpload);
  if (brightCrop.applied) {
    return brightCrop;
  }

  return cropByContentBounds(source, strictUpload);
}

function cropBrightDocument(source: HTMLCanvasElement, strictUpload: boolean): { canvas: HTMLCanvasElement; applied: boolean } {
  const context = get2d(source);
  const image = context.getImageData(0, 0, source.width, source.height);
  const pixels = image.data;
  const stride = Math.max(2, Math.round(Math.min(source.width, source.height) / 500));
  const borderMean = sampleBorderBrightness(pixels, source.width, source.height, stride);
  const paperThreshold = strictUpload
    ? Math.max(218, Math.min(248, borderMean + 5))
    : Math.max(232, Math.min(250, borderMean + 2.5));
  const chromaLimit = strictUpload ? 54 : 36;
  let minX = source.width;
  let minY = source.height;
  let maxX = 0;
  let maxY = 0;
  let matched = 0;

  for (let y = 0; y < source.height; y += stride) {
    for (let x = 0; x < source.width; x += stride) {
      const offset = (y * source.width + x) * 4;
      const r = pixels[offset];
      const g = pixels[offset + 1];
      const b = pixels[offset + 2];
      const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);

      if (gray > paperThreshold && chroma < chromaLimit) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        matched += 1;
      }
    }
  }

  if (matched < 80 || minX >= maxX || minY >= maxY) {
    return { canvas: source, applied: false };
  }

  const margin = Math.round(Math.min(source.width, source.height) * (strictUpload ? 0.012 : 0.035));
  minX = Math.max(0, minX - margin);
  minY = Math.max(0, minY - margin);
  maxX = Math.min(source.width, maxX + margin);
  maxY = Math.min(source.height, maxY + margin);

  const width = maxX - minX;
  const height = maxY - minY;
  const areaRatio = (width * height) / (source.width * source.height);
  const coversMostImage = width > source.width * 0.96 && height > source.height * 0.96;
  const tooSmall = width < source.width * 0.24 || height < source.height * 0.24 || areaRatio < 0.08;

  if (coversMostImage || tooSmall) {
    return { canvas: source, applied: false };
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const croppedContext = get2d(canvas);
  croppedContext.fillStyle = "#ffffff";
  croppedContext.fillRect(0, 0, width, height);
  croppedContext.drawImage(source, minX, minY, width, height, 0, 0, width, height);
  return { canvas, applied: true };
}

function cropByContentBounds(source: HTMLCanvasElement, strictUpload: boolean): { canvas: HTMLCanvasElement; applied: boolean } {
  const context = get2d(source);
  const image = context.getImageData(0, 0, source.width, source.height);
  const pixels = image.data;
  const stride = Math.max(2, Math.round(Math.min(source.width, source.height) / 650));
  const borderMean = sampleBorderBrightness(pixels, source.width, source.height, stride);
  const inkThreshold = strictUpload ? Math.min(205, borderMean - 18) : Math.min(190, borderMean - 24);
  let minX = source.width;
  let minY = source.height;
  let maxX = 0;
  let maxY = 0;
  let matched = 0;

  for (let y = 0; y < source.height; y += stride) {
    for (let x = 0; x < source.width; x += stride) {
      const offset = (y * source.width + x) * 4;
      const r = pixels[offset];
      const g = pixels[offset + 1];
      const b = pixels[offset + 2];
      const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const chroma = Math.max(r, g, b) - Math.min(r, g, b);
      const looksLikeInk = gray < inkThreshold || (strictUpload && gray < 224 && chroma > 38);

      if (looksLikeInk) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        matched += 1;
      }
    }
  }

  if (matched < 50 || minX >= maxX || minY >= maxY) {
    return { canvas: source, applied: false };
  }

  const widthBeforeMargin = maxX - minX;
  const heightBeforeMargin = maxY - minY;
  const contentLooksTooSparse = widthBeforeMargin < source.width * 0.12 || heightBeforeMargin < source.height * 0.12;

  if (contentLooksTooSparse) {
    return { canvas: source, applied: false };
  }

  const marginX = Math.round(source.width * (strictUpload ? 0.095 : 0.12));
  const marginY = Math.round(source.height * (strictUpload ? 0.08 : 0.1));
  minX = Math.max(0, minX - marginX);
  minY = Math.max(0, minY - marginY);
  maxX = Math.min(source.width, maxX + marginX);
  maxY = Math.min(source.height, maxY + marginY);

  const width = maxX - minX;
  const height = maxY - minY;
  const areaRatio = (width * height) / (source.width * source.height);
  const coversMostImage = width > source.width * 0.96 && height > source.height * 0.96;
  const tooSmall = width < source.width * 0.28 || height < source.height * 0.28 || areaRatio < 0.09;

  if (coversMostImage || tooSmall) {
    return { canvas: source, applied: false };
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const croppedContext = get2d(canvas);
  croppedContext.fillStyle = "#ffffff";
  croppedContext.fillRect(0, 0, width, height);
  croppedContext.drawImage(source, minX, minY, width, height, 0, 0, width, height);
  return { canvas, applied: true };
}

function sampleBorderBrightness(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  stride: number,
): number {
  let total = 0;
  let count = 0;
  const band = Math.max(stride * 2, Math.round(Math.min(width, height) * 0.035));

  for (let y = 0; y < height; y += stride) {
    for (let x = 0; x < width; x += stride) {
      if (x > band && x < width - band && y > band && y < height - band) {
        continue;
      }
      const offset = (y * width + x) * 4;
      total += 0.2126 * pixels[offset] + 0.7152 * pixels[offset + 1] + 0.0722 * pixels[offset + 2];
      count += 1;
    }
  }

  return count > 0 ? total / count : 0;
}

function sharpenImageData(image: ImageData, width: number, height: number, amount: number): ImageData {
  const source = new Uint8ClampedArray(image.data);
  const output = image.data;
  const center = 1 + 4 * amount;
  const neighbor = -amount;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const offset = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        const value =
          source[offset + channel] * center +
          source[offset - 4 + channel] * neighbor +
          source[offset + 4 + channel] * neighbor +
          source[offset - width * 4 + channel] * neighbor +
          source[offset + width * 4 + channel] * neighbor;
        output[offset + channel] = clamp(value, 0, 255);
      }
    }
  }

  return image;
}

function buildGrayMap(pixels: Uint8ClampedArray, width: number, height: number): Float32Array {
  const map = new Float32Array(width * height);

  for (let index = 0; index < map.length; index += 1) {
    const offset = index * 4;
    map[index] = 0.2126 * pixels[offset] + 0.7152 * pixels[offset + 1] + 0.0722 * pixels[offset + 2];
  }

  return map;
}

function localEdgeStrength(grayMap: Float32Array, width: number, height: number, x: number, y: number): number {
  const center = y * width + x;
  const left = x > 0 ? center - 1 : center;
  const right = x < width - 1 ? center + 1 : center;
  const up = y > 0 ? center - width : center;
  const down = y < height - 1 ? center + width : center;
  const horizontal = Math.abs(grayMap[right] - grayMap[left]);
  const vertical = Math.abs(grayMap[down] - grayMap[up]);
  return Math.max(horizontal, vertical);
}

function deterministicNoise(x: number, y: number): number {
  const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return (value - Math.floor(value) - 0.5) * 2;
}

function get2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("无法创建 Canvas 上下文");
  }
  return context;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
