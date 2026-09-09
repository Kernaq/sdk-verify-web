/**
 * <kernaq-verify> — drop-in identity verification Web Component.
 *
 * Flow: intro → doc-front → doc-back → selfie → liveness → processing → result
 *
 * Developer configures document type via attribute. User never picks it.
 * Blur is rejected client-side before upload. Liveness requires completing
 * randomly-ordered action challenges.
 */
import type { VerifyConfig, VerifyStep, VerifyResult, LivenessTask, VerifyLocale, VerifyStepName } from './types'
import { getStyles } from './styles'
import { DEFAULT_LOCALE } from './locale'
import { analyseImage } from './quality'

// ── SVG icons ─────────────────────────────────────────────────────────────────
const I = {
  close:  `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg>`,
  brand:  `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="1" width="4" height="4" rx="1" fill="currentColor"/><rect x="7" y="1" width="4" height="4" rx="1" fill="currentColor" opacity=".5"/><rect x="1" y="7" width="4" height="4" rx="1" fill="currentColor" opacity=".5"/><rect x="7" y="7" width="4" height="4" rx="1" fill="currentColor"/></svg>`,
  id:     `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="5" width="18" height="12" rx="2"/><line x1="5.5" y1="10" x2="9.5" y2="10"/><line x1="5.5" y1="13" x2="8.5" y2="13"/><circle cx="15" cy="11" r="2.5"/></svg>`,
  flip:   `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="5" width="18" height="12" rx="2"/><path d="M11 2l-3 3 3 3"/><path d="M11 20l3-3-3-3"/></svg>`,
  face:   `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="9"/><path d="M7.5 13.5s1.5 2.5 3.5 2.5 3.5-2.5 3.5-2.5"/><circle cx="8.5" cy="9.5" r=".7" fill="currentColor" stroke="none"/><circle cx="13.5" cy="9.5" r=".7" fill="currentColor" stroke="none"/></svg>`,
  eye:    `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 11s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="11" cy="11" r="3"/></svg>`,
  check:  `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 10 8 14 16 6"/></svg>`,
  x:      `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="5" x2="15" y2="15"/><line x1="15" y1="5" x2="5" y2="15"/></svg>`,
  clock:  `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="10" r="8"/><polyline points="10 6 10 10 13 13"/></svg>`,
  alert:  `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="7" cy="7" r="6"/><line x1="7" y1="4" x2="7" y2="7.5"/><circle cx="7" cy="10" r=".7" fill="currentColor" stroke="none"/></svg>`,
  info:   `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="7" cy="7" r="6"/><line x1="7" y1="6" x2="7" y2="10"/><circle cx="7" cy="4" r=".7" fill="currentColor" stroke="none"/></svg>`,
  lock:   `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1.5" y="5.5" width="9" height="6" rx="1.5"/><path d="M3.5 5.5V4a2.5 2.5 0 015 0v1.5"/></svg>`,
  arrow:  `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="8" x2="13" y2="8"/><polyline points="9 4 13 8 9 12"/></svg>`,
}

// ── Liveness task definitions ─────────────────────────────────────────────────
const TASK_POOL: Array<{ id: LivenessTask; label: string; icon: string; duration: number }> = [
  { id: 'blink',       label: 'Blink twice',            icon: I.eye,   duration: 3000 },
  { id: 'turn-left',   label: 'Turn your head left',    icon: I.face,  duration: 3000 },
  { id: 'turn-right',  label: 'Turn your head right',   icon: I.face,  duration: 3000 },
  { id: 'nod',         label: 'Nod your head',          icon: I.face,  duration: 3000 },
  { id: 'open-mouth',  label: 'Open your mouth',        icon: I.face,  duration: 3000 },
]

// ── Blur detection via Laplacian variance ─────────────────────────────────────
function measureBlur(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext('2d')!
  const { width, height } = canvas
  const imgData = ctx.getImageData(0, 0, width, height)
  const d = imgData.data
  const pixels: number[] = []

  // Convert to grayscale
  for (let i = 0; i < d.length; i += 4) {
    pixels.push(0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!)
  }

  // Apply 3x3 Laplacian kernel and compute variance
  let sum = 0, sumSq = 0, count = 0
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x
      const lap =
        -pixels[idx - width - 1]! - pixels[idx - width]! - pixels[idx - width + 1]!
        - pixels[idx - 1]!        + 8 * pixels[idx]!     - pixels[idx + 1]!
        - pixels[idx + width - 1]! - pixels[idx + width]! - pixels[idx + width + 1]!
      sum   += lap
      sumSq += lap * lap
      count++
    }
  }
  const mean = sum / count
  const variance = sumSq / count - mean * mean
  return variance
}

// ── Component ─────────────────────────────────────────────────────────────────
type CaptureState = {
  docFrontBlob?: Blob
  docBackBlob?: Blob
  selfieBlob?: Blob
  livenessFrames: Blob[]
  livenessVideo?: Blob
}

export class KernaqVerify extends HTMLElement {
  static get observedAttributes() {
    return [
      'api-key', 'backend-url', 'country', 'reference',
      'sandbox', 'document-type', 'steps',
      'liveness-duration', 'liveness-tasks',
      'blur-threshold',
      'accent-color', 'theme-mode',
    ]
  }

  private shadow: ShadowRoot
  private config: VerifyConfig = {}
  private locale: VerifyLocale = { ...DEFAULT_LOCALE }
  private step: VerifyStep = 'intro'
  private capture: CaptureState = { livenessFrames: [] }

  // camera
  private stream: MediaStream | null = null
  private selfieAnalysisTimer: ReturnType<typeof setInterval> | null = null
  private selfieReadyFrames = 0          // consecutive frames that pass all checks
  private selfieCapturing   = false      // prevent double-capture

  // liveness
  private liveTasks: typeof TASK_POOL = []
  private liveTaskIdx = 0
  private liveTaskTimer: ReturnType<typeof setTimeout> | null = null
  private liveTaskProgress = 0   // 0–100
  private liveTaskProgressTimer: ReturnType<typeof setInterval> | null = null
  private liveComplete = false
  private recorder: MediaRecorder | null = null
  private recorderChunks: Blob[] = []

  private errorMsg = ''

  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: 'open' })
  }

  connectedCallback() { this._sync(); this._render() }
  disconnectedCallback() { this._stopCamera() }
  attributeChangedCallback() {
    this._sync()
    // Re-inject styles if theme changed and modal is open
    const styleEl = this.shadow.querySelector('style')
    if (styleEl) {
      styleEl.textContent = getStyles(this.config.theme?.mode ?? 'light')
    }
    this._render()
  }

  // ── Public API ──────────────────────────────────────────────────────────────
  open(cfg?: VerifyConfig) {
    if (cfg) this.config = { ...this.config, ...cfg }
    if (cfg?.locale) this.locale = { ...DEFAULT_LOCALE, ...cfg.locale }
    // If only one step type, skip intro and go straight to it
    const steps = this.config.steps ?? ['document', 'selfie', 'liveness']
    if (steps.length === 1) {
      const first = this._flow()[0]!
      this._goto(first)
    } else {
      this._goto('intro')
    }
  }

  close() {
    this._stopCamera()
    this._clearLivenessTimers()
    this._stopSelfieAnalysis()
    this.step = 'intro'
    this.capture = { livenessFrames: [] }
    this.errorMsg = ''
    this.selfieReadyFrames = 0
    this.selfieCapturing = false
    // Tear down shadow fully — next open() will rebuild from scratch
    this.shadow.innerHTML = ''
  }

  // ── Config sync ─────────────────────────────────────────────────────────────
  private _sync() {
    const g = (a: string) => this.getAttribute(a)
    this.config = {
      apiKey:           g('api-key')          ?? this.config.apiKey,
      backendUrl:       g('backend-url')       ?? this.config.backendUrl,
      country:          g('country')           ?? this.config.country   ?? 'KEN',
      reference:        g('reference')         ?? this.config.reference  ?? `kq_${Date.now()}`,
      sandbox:          this.hasAttribute('sandbox'),
      documentTypes:    [(g('document-type') ?? this.config.documentTypes?.[0] ?? 'national_id') as any],
      steps:            (g('steps')?.split(',').map(s => s.trim()) as VerifyStepName[]) ?? this.config.steps ?? ['document', 'selfie', 'liveness'],
      livenessDuration: parseInt(g('liveness-duration') ?? '3000', 10),
      livenessTaskCount: parseInt(g('liveness-tasks') ?? '2', 10),
      blurThreshold:    parseInt(g('blur-threshold') ?? '80', 10),
      theme: {
        ...this.config.theme,
        accentColor: g('accent-color') ?? this.config.theme?.accentColor,
        mode: (g('theme-mode') as 'light' | 'dark') ?? this.config.theme?.mode ?? 'light',
      },
    }
  }

  // ── Navigation ──────────────────────────────────────────────────────────────
  /** Ordered UI steps derived from config.steps */
  private _flow(): VerifyStep[] {
    const s = this.config.steps ?? ['document', 'selfie', 'liveness']
    const steps: VerifyStep[] = []
    if (s.includes('document')) { steps.push('doc-front'); steps.push('doc-back') }
    if (s.includes('selfie'))   steps.push('selfie')
    if (s.includes('liveness')) steps.push('liveness')
    steps.push('processing')
    return steps
  }

  /** After a capture step completes, go to the next step in the flow */
  private _next(current: VerifyStep) {
    const flow = this._flow()
    const idx  = flow.indexOf(current)
    const next = flow[idx + 1] ?? 'processing'
    this._goto(next)
  }

  private _goto(step: VerifyStep) {
    this._stopCamera()
    this._clearLivenessTimers()
    this._stopSelfieAnalysis()
    this.step = step
    this.errorMsg = ''
    this._render()
    this._dispatch('kernaq:step', { step })

    if (step === 'doc-front' || step === 'doc-back') {
      this._startCamera('environment')
    }
    if (step === 'selfie') {
      this.selfieReadyFrames = 0
      this.selfieCapturing = false
      this._startCamera('user', () => this._startSelfieAnalysis())
    }
    if (step === 'liveness') {
      this._prepareLiveness()
      this._startCamera('user')
    }
    if (step === 'processing') {
      this._submit()
    }
  }

  // ── Camera ──────────────────────────────────────────────────────────────────
  private async _startCamera(facing: 'user' | 'environment', onReady?: () => void) {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      const v = this.shadow.querySelector<HTMLVideoElement>('.kq-video')
      if (v) {
        v.srcObject = this.stream
        v.onloadedmetadata = () => {
          const p = this.shadow.querySelector<HTMLElement>('.kq-cam-prompt')
          if (p) p.style.display = 'none'
          v.play().catch(() => {})
          if (onReady) onReady()
        }
      }
    } catch (err) {
      const e = err as Error
      this._setError(
        e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError'
          ? this.locale.error_camera_denied
          : this.locale.error_network
      )
    }
  }

  private _stopCamera() {
    this.recorder?.stop()
    this.recorder = null
    this.stream?.getTracks().forEach(t => t.stop())
    this.stream = null
  }

  // ── Selfie real-time analysis ────────────────────────────────────────────────
  // Samples a frame every 120ms. Checks blur, brightness, face coverage and
  // glasses-glare heuristic. Shows a single actionable instruction until all
  // checks pass for HOLD_FRAMES consecutive frames, then auto-captures.

  private static HOLD_FRAMES = 12   // ~1.5 s at 120ms per frame

  private _startSelfieAnalysis() {
    this._stopSelfieAnalysis()
    this.selfieAnalysisTimer = setInterval(() => this._analyseFrame(), 120)
  }

  private _stopSelfieAnalysis() {
    if (this.selfieAnalysisTimer) { clearInterval(this.selfieAnalysisTimer); this.selfieAnalysisTimer = null }
  }

  private async _analyseFrame() {
    if (this.selfieCapturing) return
    const v = this.shadow.querySelector<HTMLVideoElement>('.kq-video')
    if (!v || !this.stream || v.readyState < 2) return

    const W = v.videoWidth  || 640
    const H = v.videoHeight || 480
    const c = document.createElement('canvas')
    c.width = W; c.height = H
    const ctx = c.getContext('2d')!
    ctx.drawImage(v, 0, 0)

    // ── Crop to the oval region for quality analysis ──
    const ow = Math.round(W * 0.58)
    const oh = Math.round(ow * (4 / 3))
    const ox = Math.round((W - ow) / 2)
    const oy = Math.round((H - oh) / 2 - H * 0.02)

    const ovalCanvas = document.createElement('canvas')
    ovalCanvas.width = ow; ovalCanvas.height = oh
    ovalCanvas.getContext('2d')!.drawImage(c, ox, oy, ow, oh, 0, 0, ow, oh)

    const ovalBlob = await new Promise<Blob | null>(r => ovalCanvas.toBlob(b => r(b), 'image/jpeg', 0.85))
    if (!ovalBlob) return

    // Use capture SDK analyseImage on the oval crop
    const report = await analyseImage(ovalBlob, {
      minBlurScore:  25,
      minBrightness: 45,
      maxBrightness: 215,
      minFillRatio:  0.10,
    })

    // Glasses heuristic: bright band across eye region (top 40% of oval)
    const eyeH = Math.round(oh * 0.4)
    const eyeData = ctx.getImageData(ox, oy, ow, eyeH)
    const eyeLum  = this._meanLum(eyeData.data)
    const hasGlare = eyeLum > 195

    // Priority-ordered instructions
    let instruction = ''
    let passing = report.passed && !hasGlare

    if (report.failures.includes('too_dark')) {
      instruction = 'Move to better lighting'
    } else if (report.failures.includes('too_bright')) {
      instruction = 'Too bright — avoid direct light or flash'
    } else if (report.failures.includes('too_small')) {
      instruction = 'Move closer'
    } else if (hasGlare) {
      instruction = 'Remove glasses'
    } else if (report.failures.includes('too_blurry')) {
      instruction = 'Hold still'
    }

    this._updateSelfieOverlay(instruction, passing)

    if (passing) {
      this.selfieReadyFrames++
    } else {
      this.selfieReadyFrames = 0
    }

    if (this.selfieReadyFrames >= KernaqVerify.HOLD_FRAMES) {
      this.selfieCapturing = true
      this._stopSelfieAnalysis()
      const blob = await new Promise<Blob | null>(r => c.toBlob(b => r(b), 'image/jpeg', 0.93))
      if (blob) {
        this.capture.selfieBlob = blob
        this._next('selfie')
      } else {
        this.selfieCapturing = false
        this.selfieReadyFrames = 0
        this._startSelfieAnalysis()
      }
    }
  }

  private _meanLum(data: Uint8ClampedArray): number {
    let s = 0
    for (let i = 0; i < data.length; i += 4) s += 0.299 * data[i]! + 0.587 * data[i+1]! + 0.114 * data[i+2]!
    return s / (data.length / 4)
  }

  private _updateSelfieOverlay(instruction: string, ready: boolean) {
    const pill = this.shadow.querySelector<HTMLElement>('.kq-selfie-pill')
    const ring = this.shadow.querySelector<HTMLElement>('.kq-oval-guide')
    if (pill) {
      pill.textContent = instruction || (ready ? 'Hold still…' : 'Align your face')
      pill.className   = `kq-selfie-pill ${ready ? 'kq-selfie-pill-ok' : ''}`
    }
    if (ring) {
      ring.className = `kq-oval-guide ${ready ? 'kq-oval-guide-ok' : ''}`
    }
  }

  // ── Capture + blur/quality check via @kernaq/capture-web analyseImage ───────
  private async _capture(): Promise<Blob | null> {
    const v = this.shadow.querySelector<HTMLVideoElement>('.kq-video')
    if (!v || !this.stream) return null

    const c = document.createElement('canvas')
    c.width  = v.videoWidth  || 1280
    c.height = v.videoHeight || 720
    c.getContext('2d')!.drawImage(v, 0, 0)

    const blob = await new Promise<Blob | null>(r => c.toBlob(b => r(b), 'image/jpeg', 0.93))
    if (!blob) return null

    const report = await analyseImage(blob, {
      minBlurScore:  this.config.blurThreshold ?? 35,
      minBrightness: 30,
      maxBrightness: 220,
      minFillRatio:  0.05,
    })

    if (!report.passed) {
      const msgs: Record<string, string> = {
        too_blurry: this.locale.error_blur,
        too_dark:   'Move to better lighting',
        too_bright: 'Reduce brightness or move away from light',
        too_small:  'Move closer to the camera',
      }
      this._setError(msgs[report.failures[0]!] ?? this.locale.error_quality)
      return null
    }

    return blob
  }

  // ── Liveness tasks ──────────────────────────────────────────────────────────
  private _prepareLiveness() {
    const count = Math.min(this.config.livenessTaskCount ?? 2, TASK_POOL.length)
    // Fisher-Yates shuffle and take `count`
    const pool = [...TASK_POOL]
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[pool[i], pool[j]] = [pool[j]!, pool[i]!]
    }
    this.liveTasks    = pool.slice(0, count)
    this.liveTaskIdx  = 0
    this.liveComplete = false
    this.liveTaskProgress = 0
  }

  private _startLivenessTask() {
    const task = this.liveTasks[this.liveTaskIdx]
    if (!task) return

    this._clearLivenessTimers()
    this.liveTaskProgress = 0
    this._render()

    // Progress bar animation
    const dur   = task.duration
    const start = Date.now()
    this.liveTaskProgressTimer = setInterval(() => {
      const elapsed = Date.now() - start
      this.liveTaskProgress = Math.min(100, (elapsed / dur) * 100)
      // Update in-viewport bar fill
      const bar = this.shadow.querySelector<HTMLElement>('.kq-live-bar-fill')
      if (bar) bar.style.width = `${this.liveTaskProgress}%`
      if (elapsed >= dur) {
        this._clearLivenessTimers()
        this._nextLivenessTask()
      }
    }, 80)
  }

  private _nextLivenessTask() {
    this.liveTaskIdx++
    if (this.liveTaskIdx >= this.liveTasks.length) {
      this._finishLiveness()
      return
    }
    this.liveTaskProgress = 0
    this._render()
    // Short pause before next task
    this.liveTaskTimer = setTimeout(() => this._startLivenessTask(), 500)
  }

  private _finishLiveness() {
    this.liveComplete = true
    this._render()
    this.liveTaskTimer = setTimeout(() => {
      this._stopCamera()
      this._next('liveness')
    }, 1000)
  }

  private _clearLivenessTimers() {
    if (this.liveTaskTimer)        { clearTimeout(this.liveTaskTimer);         this.liveTaskTimer = null }
    if (this.liveTaskProgressTimer){ clearInterval(this.liveTaskProgressTimer); this.liveTaskProgressTimer = null }
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  private async _submit() {
    const { docFrontBlob, docBackBlob, selfieBlob } = this.capture
    if (!docFrontBlob || !selfieBlob) {
      this._setError('Captures incomplete — please restart.')
      this._goto('intro')
      return
    }

    const base = (this.config.backendUrl ?? 'https://api.identity.kernaq.com/v1').replace(/\/$/, '')
    const form = new FormData()
    form.append('document',           docFrontBlob,       'doc_front.jpg')
    if (docBackBlob) form.append('document_back', docBackBlob, 'doc_back.jpg')
    form.append('selfie',             selfieBlob,         'selfie.jpg')
    form.append('document_type',      this.config.documentTypes?.[0] ?? 'national_id')
    form.append('country',            this.config.country ?? 'KEN')
    form.append('reference',          this.config.reference ?? `kq_${Date.now()}`)
    if (this.config.sandbox) form.append('sandbox', 'true')

    const headers: HeadersInit = {}
    if (this.config.apiKey) headers['X-API-Key'] = this.config.apiKey

    try {
      const res  = await fetch(`${base}/verify`, { method: 'POST', headers, body: form })
      const body = await res.json() as Record<string, unknown>
      if (!res.ok) throw new Error((body['message'] as string) ?? `HTTP ${res.status}`)

      const result: VerifyResult = {
        verificationId: body['verification_id'] as string,
        reference:      body['reference']        as string,
        verdict:        body['verdict']          as 'pass' | 'fail' | 'review',
        score:          (body['score']           as number) ?? 0,
        faceMatch:      (body['face_match']      as boolean) ?? false,
        isLive:         (body['is_live']         as boolean) ?? false,
        documentFields: body['document_fields']  as Record<string, string> | undefined,
      }
      this._dispatch('kernaq:complete', result)
      ;(this as any)['_result'] = result
    } catch (err) {
      this.errorMsg = (err as Error).message ?? this.locale.error_network
      ;(this as any)['_result'] = null
    }
    this._goto('result')
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  private _render() {
    const theme = this.config.theme ?? {}
    const vars  = [
      theme.accentColor     ? `--kernaq-accent-color: ${theme.accentColor};`         : '',
      theme.backgroundColor ? `--kernaq-background-color: ${theme.backgroundColor};` : '',
      theme.textColor       ? `--kernaq-text-color: ${theme.textColor};`             : '',
      theme.borderRadius    ? `--kernaq-border-radius: ${theme.borderRadius};`       : '',
      theme.fontFamily      ? `--kernaq-font-family: ${theme.fontFamily};`           : '',
    ].filter(Boolean).join(' ')

    // First render: build the full shell
    if (!this.shadow.querySelector('.kq-modal')) {
      this.shadow.innerHTML = `
        <style>${getStyles(theme.mode ?? 'light')}</style>
        <div class="kq-overlay" style="${vars}" role="dialog" aria-modal="true" aria-label="Identity verification">
          <div class="kq-modal">
            <div class="kq-slot-body"></div>
            <div class="kq-slot-footer"></div>
          </div>
        </div>
      `
    }

    // Subsequent renders: patch only the inner content — no flash, no re-animation
    const bodySlot   = this.shadow.querySelector<HTMLElement>('.kq-slot-body')
    const footerSlot = this.shadow.querySelector<HTMLElement>('.kq-slot-footer')
    if (bodySlot)   bodySlot.innerHTML   = this._body()
    if (footerSlot) footerSlot.innerHTML = this._footer()

    this._bind()
    this._reattachStream()
  }

  private _reattachStream() {
    if (!this.stream) return
    const v = this.shadow.querySelector<HTMLVideoElement>('.kq-video')
    if (v && !v.srcObject) {
      v.srcObject = this.stream
      const p = this.shadow.querySelector<HTMLElement>('.kq-cam-prompt')
      v.onloadedmetadata = () => {
        if (p) p.style.display = 'none'
        v.play().catch(() => {})
      }
      if (v.readyState >= 1 && p) p.style.display = 'none'
      v.play().catch(() => {})
    }
  }

  // ── Header ──────────────────────────────────────────────────────────────────
  private _header() {
    return `
      <div class="kq-header">
        <div class="kq-brand">
          <div class="kq-brand-mark">${I.brand}</div>
          <span class="kq-brand-name">Kernaq</span>
        </div>
      </div>`
  }
  private _body() {
    switch (this.step) {
      case 'intro':     return this._intro()
      case 'doc-front': return this._docFront()
      case 'doc-back':  return this._docBack()
      case 'selfie':    return this._selfie()
      case 'liveness':  return this._liveness()
      case 'processing':return this._processing()
      case 'result':    return this._result()
      default: return ''
    }
  }

  // ── Intro ────────────────────────────────────────────────────────────────────
  private _intro() {
    const l = this.locale
    return `
      <div class="kq-body">
        <div class="kq-heading">
          <div class="kq-title">${l.intro_title}</div>
          <div class="kq-subtitle">${l.intro_body}</div>
        </div>
        <div class="kq-hint">${I.lock}<span>Your data is discarded immediately after processing. Nothing is stored.</span></div>
        <button class="kq-btn kq-btn-primary" data-action="start">${l.intro_cta}<span style="margin-left:auto">${I.arrow}</span></button>
      </div>`
  }

  // ── Document front ───────────────────────────────────────────────────────────
  private _docFront() {
    const l = this.locale
    return `
      <div class="kq-body kq-has-camera">
        <div class="kq-heading">
          <div class="kq-title">${l.doc_front_title}</div>
          <div class="kq-subtitle">${l.doc_front_instruction}</div>
        </div>
        ${this._err()}
        ${this._viewport('doc')}
        <div class="kq-hint">${I.info}<span>Hold the camera parallel to the document. Move closer if text is hard to read.</span></div>
        <button class="kq-btn kq-btn-primary" data-action="capture-front">${l.doc_capture_btn}</button>
      </div>`
  }

  // ── Document back ────────────────────────────────────────────────────────────
  private _docBack() {
    const l = this.locale
    return `
      <div class="kq-body kq-has-camera">
        <div class="kq-heading">
          <div class="kq-title">${l.doc_back_title}</div>
          <div class="kq-subtitle">${l.doc_back_instruction}</div>
        </div>
        ${this._err()}
        ${this._capturedThumb(this.capture.docFrontBlob, 'Front captured')}
        ${this._viewport('doc')}
        <div class="kq-hint">${I.flip}<span>Flip the document over and keep it flat inside the frame.</span></div>
        <button class="kq-btn kq-btn-primary" data-action="capture-back">${l.doc_capture_btn}</button>
        <button class="kq-btn kq-btn-ghost" data-action="goto-front" style="margin-top:8px">${l.doc_retake_btn} front</button>
      </div>`
  }

  // ── Selfie ───────────────────────────────────────────────────────────────────
  private _selfie() {
    const l = this.locale
    return `
      <div class="kq-body kq-has-camera">
        <div class="kq-heading">
          <div class="kq-title">${l.selfie_title}</div>
          <div class="kq-subtitle">${l.selfie_instruction}</div>
        </div>
        <div class="kq-viewport">
          <video class="kq-video" playsinline muted autoplay></video>
          <div class="kq-cam-prompt">
            <div class="kq-cam-prompt-icon">${I.face}</div>
            <p>Waiting for camera…</p>
          </div>
          <div class="kq-oval-guide"></div>
          <div class="kq-selfie-pill">Align your face</div>
        </div>
      </div>`
  }

  // ── Liveness ─────────────────────────────────────────────────────────────────
  private _liveness() {
    const l = this.locale
    const currentTask = this.liveTasks[this.liveTaskIdx]
    const taskDone    = this.liveTaskIdx
    const taskTotal   = this.liveTasks.length
    const isActive    = this.liveTaskProgressTimer !== null

    if (this.liveComplete) {
      return `
        <div class="kq-body kq-has-camera">
          <div class="kq-heading">
            <div class="kq-title">${l.liveness_complete}</div>
          </div>
          ${this._viewport('oval')}
        </div>`
    }

    return `
      <div class="kq-body kq-has-camera">
        <div class="kq-heading">
          <div class="kq-title">${l.liveness_title}</div>
          <div class="kq-subtitle">${l.liveness_ready}</div>
        </div>
        ${this._err()}

        <div class="kq-task-dots">
          ${this.liveTasks.map((_, i) => `
            <div class="kq-task-dot ${i < taskDone ? 'done' : i === taskDone ? 'active' : ''}"></div>
          `).join('')}
        </div>

        <div class="kq-viewport">
          <video class="kq-video" playsinline muted autoplay></video>
          <div class="kq-cam-prompt">
            <div class="kq-cam-prompt-icon">${I.eye}</div>
            <p>Waiting for camera…</p>
          </div>
          <div class="kq-oval-guide"></div>

          ${currentTask ? `
            <div class="kq-live-overlay">
              <div class="kq-live-task-pill">
                <span class="kq-live-task-num">${taskDone + 1}/${taskTotal}</span>
                <span class="kq-live-task-text">${currentTask.label}</span>
              </div>
              ${isActive ? `
                <div class="kq-live-bar-wrap">
                  <div class="kq-live-bar-fill" style="width:${this.liveTaskProgress}%"></div>
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>

        ${currentTask && !isActive ? `
          <button class="kq-btn kq-btn-primary" data-action="start-task">
            ${taskDone === 0 ? 'Begin' : 'Next task'}
            <span style="margin-left:auto">${I.arrow}</span>
          </button>
        ` : ''}
      </div>`
  }

  // ── Processing ───────────────────────────────────────────────────────────────
  private _processing() {
    return `
      <div class="kq-processing">
        <div class="kq-spinner"></div>
        <div class="kq-title">${this.locale.processing_title}</div>
        <div class="kq-subtitle">This usually takes under 10 seconds.</div>
      </div>`
  }

  // ── Result ───────────────────────────────────────────────────────────────────
  private _result() {
    const result = (this as any)['_result'] as VerifyResult | null
    const l = this.locale

    if (!result) {
      return `
        <div class="kq-result">
          <div class="kq-result-icon fail">${I.x}</div>
          <div>
            <div class="kq-title">${l.result_fail_title}</div>
            <div class="kq-subtitle" style="margin-top:4px">${this.errorMsg || l.result_fail_body}</div>
          </div>
          <button class="kq-btn kq-btn-primary" data-action="restart" style="margin-top:4px">Try again</button>
        </div>`
    }

    const icn: Record<string, string> = { pass: I.check, fail: I.x, review: I.clock }
    const ttl: Record<string, string> = { pass: l.result_pass_title, fail: l.result_fail_title, review: l.result_review_title }
    const bdy: Record<string, string> = { pass: l.result_pass_body,  fail: l.result_fail_body,  review: l.result_review_body }
    const v = result.verdict

    return `
      <div class="kq-result">
        <div class="kq-result-icon ${v}">${icn[v]}</div>
        <div>
          <div class="kq-title">${ttl[v]}</div>
          <div class="kq-subtitle" style="margin-top:4px">${bdy[v]}</div>
        </div>
        <div class="kq-result-details">
          ${[
            { label: 'Verdict',    value: v.charAt(0).toUpperCase() + v.slice(1), ok: v === 'pass', bad: v === 'fail' },
            { label: 'Risk score', value: String(result.score ?? '—') },
            { label: 'Face match', value: result.faceMatch ? 'Confirmed' : 'Not confirmed', ok: result.faceMatch, bad: !result.faceMatch },
            { label: 'Liveness',   value: result.isLive    ? 'Confirmed' : 'Not confirmed', ok: result.isLive,    bad: !result.isLive },
          ].map(r => `
            <div class="kq-result-row">
              <span class="kq-result-row-label">${r.label}</span>
              <span class="kq-result-row-val ${r.ok ? 'ok' : r.bad ? 'bad' : ''}">${r.value}</span>
            </div>
          `).join('')}
        </div>
        ${v === 'fail'
          ? `<button class="kq-btn kq-btn-primary" data-action="restart" style="margin-top:4px">Try again</button>`
          : '' /* pass/review — developer handles next step via kernaq:complete event */
        }
      </div>`
  }

  // ── Shared UI parts ──────────────────────────────────────────────────────────
  private _viewport(guide: 'doc' | 'oval') {
    const docGuide = `
      <div class="kq-frame-guide">
        <div class="kq-frame-corner tl"></div>
        <div class="kq-frame-corner tr"></div>
        <div class="kq-frame-corner bl"></div>
        <div class="kq-frame-corner br"></div>
      </div>
      <div class="kq-frame-dim"></div>`
    const ovalGuide = `<div class="kq-oval-guide"></div>`
    return `
      <div class="kq-viewport">
        <video class="kq-video" playsinline muted autoplay></video>
        <div class="kq-cam-prompt">
          <div class="kq-cam-prompt-icon">${guide === 'doc' ? I.id : I.face}</div>
          <p>Waiting for camera…</p>
        </div>
        ${guide === 'doc' ? docGuide : ovalGuide}
      </div>`
  }

  private _capturedThumb(blob: Blob | undefined, label: string) {
    if (!blob) return ''
    const url = URL.createObjectURL(blob)
    return `
      <div class="kq-thumb-row">
        <img class="kq-thumb" src="${url}" alt="${label}" />
        <span class="kq-thumb-label">${I.check} ${label}</span>
      </div>`
  }

  private _err() {
    if (!this.errorMsg) return ''
    return `<div class="kq-error" role="alert">${I.alert}<span>${this.errorMsg}</span></div>`
  }

  private _footer() {
    if (this.step === 'processing') return ''
    return `
      <div class="kq-footer">
        ${I.lock}
        <span>Secured by <a href="https://kernaq.com" target="_blank" rel="noopener">Kernaq</a></span>
      </div>`
  }

  // ── Event binding ────────────────────────────────────────────────────────────
  private _bind() {
    this.shadow.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', e => {
        e.stopPropagation()
        this._handle((e.currentTarget as HTMLElement).dataset['action']!)
      })
    })
    // Overlay click intentionally does NOT close — user must complete the flow
  }

  private async _handle(action: string) {
    this.errorMsg = ''

    switch (action) {
      case 'close':
        this._dispatch('kernaq:cancel', undefined)
        this.close()
        break

      case 'start':
        this._goto('doc-front')
        break

      case 'capture-front': {
        const blob = await this._capture()
        if (!blob) return  // blur error already set
        this.capture.docFrontBlob = blob
        this._next('doc-front')
        break
      }

      case 'capture-back': {
        const blob = await this._capture()
        if (!blob) return
        this.capture.docBackBlob = blob
        this._next('doc-back')
        break
      }

      case 'capture-selfie': {
        const blob = await this._capture()
        if (!blob) return
        this.capture.selfieBlob = blob
        this._next('selfie')
        break
      }

      case 'start-task':
        this._startLivenessTask()
        break

      case 'goto-front':
        this.capture.docFrontBlob = undefined
        this._goto('doc-front')
        break

      case 'goto-back':
        this.capture.docBackBlob = undefined
        this._goto('doc-back')
        break

      case 'restart':
        this.capture = { livenessFrames: [] }
        this._goto('intro')
        break
    }
  }

  private _setError(msg: string) {
    this.errorMsg = msg
    this._render()
  }

  private _dispatch<T>(event: string, detail: T) {
    this.dispatchEvent(new CustomEvent(event, { detail, bubbles: true, composed: true }))
  }
}
