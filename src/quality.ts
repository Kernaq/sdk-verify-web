/**
 * Pre-flight quality checker.
 *
 * Runs entirely in the browser using Canvas 2D — no server round-trip.
 * Checks blur, brightness, and fill ratio before the image is uploaded.
 * Saves bandwidth and processing costs by rejecting bad captures at the edge.
 */
import type { QualityConfig, QualityReport, QualityFailure } from './capture-types'

const DEFAULT_CONFIG: Required<QualityConfig> = {
  minBlurScore:    40,
  minBrightness:   30,
  maxBrightness:   220,
  minFillRatio:    0.15,
}

/**
 * Analyse an image blob and return a quality report.
 * The caller decides whether to reject based on report.passed.
 */
export async function analyseImage(
  blob: Blob,
  config: QualityConfig = {},
): Promise<QualityReport> {
  const cfg = { ...DEFAULT_CONFIG, ...config }

  const bitmap = await createImageBitmap(blob)

  // Downscale to 256×256 for fast analysis — detail irrelevant at this stage
  const SAMPLE = 256
  const canvas = new OffscreenCanvas(SAMPLE, SAMPLE)
  const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D
  ctx.drawImage(bitmap, 0, 0, SAMPLE, SAMPLE)
  bitmap.close()

  const imageData = ctx.getImageData(0, 0, SAMPLE, SAMPLE)
  const pixels = imageData.data // RGBA flat array

  const brightness = computeBrightness(pixels)
  const blurScore  = computeBlurScore(pixels, SAMPLE)
  const fillRatio  = computeFillRatio(pixels, brightness)

  const failures: QualityFailure[] = []
  if (blurScore   < cfg.minBlurScore)   failures.push('too_blurry')
  if (brightness  < cfg.minBrightness)  failures.push('too_dark')
  if (brightness  > cfg.maxBrightness)  failures.push('too_bright')
  if (fillRatio   < cfg.minFillRatio)   failures.push('too_small')

  return {
    passed: failures.length === 0,
    blurScore,
    brightness,
    fillRatio,
    failures,
  }
}

/**
 * Analyse a video blob by extracting the first frame.
 */
export async function analyseVideoFrame(
  blob: Blob,
  config: QualityConfig = {},
): Promise<QualityReport> {
  const url = URL.createObjectURL(blob)
  try {
    const frame = await extractFirstFrame(url)
    return analyseImage(frame, config)
  } finally {
    URL.revokeObjectURL(url)
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function computeBrightness(pixels: Uint8ClampedArray): number {
  let total = 0
  for (let i = 0; i < pixels.length; i += 4) {
    // Rec. 601 luminance
    total += 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]
  }
  return total / (pixels.length / 4)
}

/**
 * Laplacian variance — standard proxy for sharpness.
 * Higher = sharper. Works on the luminance channel of the downscaled image.
 */
function computeBlurScore(pixels: Uint8ClampedArray, width: number): number {
  const n = pixels.length / 4
  const lum = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const base = i * 4
    lum[i] = 0.299 * pixels[base] + 0.587 * pixels[base + 1] + 0.114 * pixels[base + 2]
  }

  let variance = 0
  let count = 0
  for (let y = 1; y < width - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x
      const lap =
        -lum[idx - width - 1] - lum[idx - width] - lum[idx - width + 1]
        - lum[idx - 1] + 8 * lum[idx] - lum[idx + 1]
        - lum[idx + width - 1] - lum[idx + width] - lum[idx + width + 1]
      variance += lap * lap
      count++
    }
  }
  const raw = count > 0 ? variance / count : 0
  // Normalize to 0–100; empirically ~20 variance → blurry, ~300+ → sharp
  return Math.min(100, Math.round((raw / 300) * 100))
}

/**
 * Rough fill ratio: fraction of pixels whose luminance differs from the
 * mean background (corners) by more than a threshold.
 */
function computeFillRatio(pixels: Uint8ClampedArray, brightness: number): number {
  const threshold = 30
  let foreground = 0
  const total = pixels.length / 4
  for (let i = 0; i < pixels.length; i += 4) {
    const lum = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]
    if (Math.abs(lum - brightness) > threshold) foreground++
  }
  return foreground / total
}

function extractFirstFrame(videoUrl: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.src = videoUrl
    video.preload = 'metadata'
    video.muted = true
    video.currentTime = 0.1
    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas')
      canvas.width  = video.videoWidth  || 640
      canvas.height = video.videoHeight || 480
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(video, 0, 0)
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('frame extraction failed')), 'image/jpeg', 0.85)
      video.remove()
    })
    video.addEventListener('error', () => reject(new Error('video load error')))
  })
}
