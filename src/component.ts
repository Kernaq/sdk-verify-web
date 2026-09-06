/**
 * <kernaq-verify> — drop-in verification Web Component.
 *
 * Usage:
 *   <kernaq-verify
 *     api-key="k_test_..."
 *     country="KEN"
 *     reference="user_abc"
 *   ></kernaq-verify>
 *
 *   document.querySelector('kernaq-verify').addEventListener('kernaq:complete', e => {
 *     console.log(e.detail) // VerifyResult
 *   })
 */
import type { VerifyConfig, VerifyStep, VerifyResult, DocumentType, VerifyLocale } from './types'
import { getStyles } from './styles'
import { DEFAULT_LOCALE } from './locale'

type CaptureState = {
  documentBlob?: Blob
  selfieBlob?: Blob
  videoBlob?: Blob
}

export class KernaqVerify extends HTMLElement {
  // Observed attributes map directly to VerifyConfig fields
  static get observedAttributes() {
    return [
      'api-key', 'backend-url', 'country', 'reference',
      'sandbox', 'liveness-duration', 'document-types',
      'accent-color', 'theme-mode',
    ]
  }

  private shadow: ShadowRoot
  private config: VerifyConfig = {}
  private locale: VerifyLocale = { ...DEFAULT_LOCALE }
  private step: VerifyStep = 'intro'
  private capture: CaptureState = {}
  private stream: MediaStream | null = null
  private recorder: MediaRecorder | null = null
  private recorderChunks: Blob[] = []
  private livenesTimer: ReturnType<typeof setInterval> | null = null
  private livenessRemaining = 3
  private errorMsg = ''

  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: 'open' })
  }

  connectedCallback() {
    this._syncConfig()
    this._render()
  }

  disconnectedCallback() {
    this._stopCamera()
  }

  attributeChangedCallback() {
    this._syncConfig()
    this._render()
  }

  // ── Public JS API ─────────────────────────────────────────────────────────

  /** Programmatically open the widget */
  open(cfg?: VerifyConfig) {
    if (cfg) this.config = { ...this.config, ...cfg }
    if (cfg?.locale) this.locale = { ...DEFAULT_LOCALE, ...cfg.locale }
    this._goto('intro')
  }

  /** Programmatically close / reset the widget */
  close() {
    this._stopCamera()
    this.step = 'intro'
    this.capture = {}
    this.errorMsg = ''
    this._render()
  }

  // ── Config sync ───────────────────────────────────────────────────────────

  private _syncConfig() {
    const get = (a: string) => this.getAttribute(a)
    this.config = {
      apiKey:           get('api-key')          ?? this.config.apiKey,
      backendUrl:       get('backend-url')       ?? this.config.backendUrl,
      country:          get('country')           ?? this.config.country ?? 'KEN',
      reference:        get('reference')         ?? this.config.reference ?? `kq_${Date.now()}`,
      sandbox:          this.hasAttribute('sandbox'),
      livenessDuration: parseInt(get('liveness-duration') ?? '3000', 10),
      documentTypes:    (get('document-types')?.split(',') as DocumentType[]) ?? ['national_id', 'passport'],
      theme: {
        ...this.config.theme,
        accentColor: get('accent-color') ?? this.config.theme?.accentColor,
        mode:        (get('theme-mode') as 'light' | 'dark') ?? this.config.theme?.mode ?? 'light',
      },
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  private _goto(step: VerifyStep) {
    this._stopCamera()
    this.step = step
    this.errorMsg = ''
    this._render()
    this._dispatch('kernaq:step', { step })
    if (step === 'document' || step === 'selfie' || step === 'liveness') {
      this._startCamera(step)
    }
    if (step === 'processing') {
      this._submit()
    }
  }

  // ── Camera ────────────────────────────────────────────────────────────────

  private async _startCamera(step: VerifyStep) {
    const facingMode = step === 'document' ? 'environment' : 'user'
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      const video = this.shadow.querySelector<HTMLVideoElement>('.kq-video')
      if (video) {
        video.srcObject = this.stream
        await video.play()
      }
    } catch (err) {
      const e = err as Error
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        this._setError(this.locale.error_camera_denied)
      } else {
        this._setError(this.locale.error_network)
      }
    }
  }

  private _stopCamera() {
    if (this.livenesTimer) { clearInterval(this.livenesTimer); this.livenesTimer = null }
    this.recorder?.stop()
    this.recorder = null
    this.stream?.getTracks().forEach(t => t.stop())
    this.stream = null
  }

  // ── Capture ───────────────────────────────────────────────────────────────

  private async _capturePhoto(): Promise<Blob | null> {
    const video = this.shadow.querySelector<HTMLVideoElement>('.kq-video')
    if (!video || !this.stream) return null

    const canvas = document.createElement('canvas')
    canvas.width  = video.videoWidth  || 1280
    canvas.height = video.videoHeight || 720
    canvas.getContext('2d')!.drawImage(video, 0, 0)

    return new Promise(resolve =>
      canvas.toBlob(b => resolve(b), 'image/jpeg', 0.92)
    )
  }

  private _startLivenessRecording() {
    if (!this.stream) return
    const dur = (this.config.livenessDuration ?? 3000) / 1000
    this.livenessRemaining = dur
    let mime = 'video/webm;codecs=vp9'
    if (!MediaRecorder.isTypeSupported(mime)) mime = 'video/webm'
    this.recorderChunks = []
    this.recorder = new MediaRecorder(this.stream, { mimeType: mime })
    this.recorder.ondataavailable = e => { if (e.data.size > 0) this.recorderChunks.push(e.data) }
    this.recorder.onstop = () => {
      this.capture.videoBlob = new Blob(this.recorderChunks, { type: mime })
      this._goto('processing')
    }
    this.recorder.start(100)

    // Countdown UI
    this.livenesTimer = setInterval(() => {
      this.livenessRemaining -= 0.1
      this._updateCountdown()
      if (this.livenessRemaining <= 0) {
        if (this.livenesTimer) clearInterval(this.livenesTimer)
        this.recorder?.stop()
      }
    }, 100)

    this._render()
  }

  private _updateCountdown() {
    const dur = (this.config.livenessDuration ?? 3000) / 1000
    const pct = Math.max(0, this.livenessRemaining / dur)
    const r = 22
    const circ = 2 * Math.PI * r
    const offset = circ * (1 - pct)
    const circle = this.shadow.querySelector<SVGCircleElement>('.kq-countdown .progress')
    const text   = this.shadow.querySelector<HTMLElement>('.kq-countdown-text')
    if (circle) { circle.style.strokeDasharray = `${circ}`; circle.style.strokeDashoffset = `${offset}` }
    if (text) text.textContent = Math.ceil(this.livenessRemaining).toString()
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  private async _submit() {
    const { documentBlob, selfieBlob, videoBlob } = this.capture
    if (!documentBlob || !selfieBlob) {
      this._setError('Missing captures — please restart.')
      this._goto('intro')
      return
    }

    const base = (this.config.backendUrl ?? 'https://api.identity.kernaq.com/v1').replace(/\/$/, '')
    const form = new FormData()
    form.append('document',      documentBlob,       'document.jpg')
    form.append('selfie',        selfieBlob,         'selfie.jpg')
    if (videoBlob) form.append('video', videoBlob,   'liveness.webm')
    form.append('document_type', this.config.documentTypes?.[0] ?? 'national_id')
    form.append('country',       this.config.country ?? 'KEN')
    form.append('reference',     this.config.reference ?? `kq_${Date.now()}`)
    if (this.config.sandbox) form.append('sandbox', 'true')

    const headers: HeadersInit = {}
    if (this.config.apiKey) headers['X-API-Key'] = this.config.apiKey

    try {
      const res  = await fetch(`${base}/verify`, { method: 'POST', headers, body: form })
      const body = await res.json() as Record<string, unknown>
      if (!res.ok) throw new Error((body['message'] as string) ?? `HTTP ${res.status}`)

      const result: VerifyResult = {
        verificationId: body['verification_id'] as string,
        reference:      body['reference']       as string,
        verdict:        body['verdict']         as 'pass' | 'fail' | 'review',
        score:          body['score']           as number ?? 0,
        faceMatch:      body['face_match']      as boolean ?? false,
        isLive:         body['is_live']         as boolean ?? false,
        documentFields: body['document_fields'] as Record<string, string> | undefined,
      }

      this._dispatch('kernaq:complete', result)
      this._goto('result')
      ;(this as unknown as Record<string, unknown>)['_lastResult'] = result
    } catch (err) {
      this._setError(this.locale.error_network + ' ' + (err as Error).message)
      this._goto('result')
      ;(this as unknown as Record<string, unknown>)['_lastResult'] = null
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  private _render() {
    const theme = this.config.theme ?? {}
    const vars  = [
      theme.accentColor     ? `--kernaq-accent-color: ${theme.accentColor};`          : '',
      theme.backgroundColor ? `--kernaq-background-color: ${theme.backgroundColor};`  : '',
      theme.textColor       ? `--kernaq-text-color: ${theme.textColor};`              : '',
      theme.borderRadius    ? `--kernaq-border-radius: ${theme.borderRadius};`        : '',
      theme.fontFamily      ? `--kernaq-font-family: ${theme.fontFamily};`            : '',
    ].filter(Boolean).join(' ')

    this.shadow.innerHTML = `
      <style>${getStyles(theme.mode ?? 'light')}</style>
      <div class="kq-overlay" style="${vars}" role="dialog" aria-modal="true" aria-label="Identity verification">
        <div class="kq-modal">
          ${this._renderHeader()}
          ${this._renderProgress()}
          ${this._renderBody()}
        </div>
      </div>
    `
    this._bindEvents()
  }

  private _renderHeader(): string {
    const showClose = this.step !== 'processing'
    return `
      <div class="kq-header">
        <span class="kq-logo">Kernaq</span>
        ${showClose ? '<button class="kq-close" aria-label="Close" data-action="close">✕</button>' : ''}
      </div>
    `
  }

  private _renderProgress(): string {
    const steps: VerifyStep[] = ['document', 'selfie', 'liveness', 'processing']
    const idx = steps.indexOf(this.step)
    if (idx < 0) return ''
    return `
      <div class="kq-progress" role="progressbar" aria-valuenow="${idx + 1}" aria-valuemax="${steps.length}">
        ${steps.map((_, i) => `
          <div class="kq-progress-dot ${i < idx ? 'done' : i === idx ? 'active' : ''}"></div>
        `).join('')}
      </div>
    `
  }

  private _renderBody(): string {
    const { step, locale, errorMsg } = this
    const err = errorMsg ? `<div class="kq-error" role="alert">${errorMsg}</div>` : ''

    switch (step) {
      case 'intro': return this._renderIntro()
      case 'document': return `
        <div class="kq-body">
          <h2 class="kq-title">${locale.doc_title}</h2>
          <p class="kq-subtitle">${locale.doc_instruction}</p>
          ${err}
          <div class="kq-viewport">
            <video class="kq-video" playsinline muted autoplay></video>
            <div class="kq-frame-guide"></div>
          </div>
          <button class="kq-btn kq-btn-primary" data-action="capture-doc">${locale.doc_capture_btn}</button>
        </div>`

      case 'selfie': return `
        <div class="kq-body">
          <h2 class="kq-title">${locale.selfie_title}</h2>
          <p class="kq-subtitle">${locale.selfie_instruction}</p>
          ${err}
          ${this.capture.documentBlob ? this._renderPreview(this.capture.documentBlob) : ''}
          <div class="kq-viewport">
            <video class="kq-video" playsinline muted autoplay></video>
            <div class="kq-oval-guide"></div>
          </div>
          <button class="kq-btn kq-btn-primary" data-action="capture-selfie">${locale.selfie_capture_btn}</button>
          <button class="kq-btn kq-btn-secondary" data-action="goto-doc">${locale.doc_retake_btn}</button>
        </div>`

      case 'liveness': {
        const isRecording = !!this.recorder
        const r = 22, circ = 2 * Math.PI * r
        return `
          <div class="kq-body">
            <h2 class="kq-title">${locale.liveness_title}</h2>
            <p class="kq-subtitle">${isRecording ? locale.liveness_recording : locale.liveness_instruction}</p>
            ${err}
            <div class="kq-viewport">
              <video class="kq-video" playsinline muted autoplay></video>
              <div class="kq-oval-guide"></div>
              ${isRecording ? `
                <div class="kq-recording-badge">
                  <div class="kq-recording-dot"></div> REC
                </div>
                <div class="kq-countdown">
                  <svg viewBox="0 0 52 52">
                    <circle cx="26" cy="26" r="${r}"/>
                    <circle class="progress" cx="26" cy="26" r="${r}"
                      stroke-dasharray="${circ}" stroke-dashoffset="0"/>
                  </svg>
                  <div class="kq-countdown-text">${Math.ceil(this.livenessRemaining)}</div>
                </div>` : ''}
            </div>
            ${!isRecording ? `
              <button class="kq-btn kq-btn-primary" data-action="start-liveness">${locale.liveness_start_btn}</button>
              <button class="kq-btn kq-btn-secondary" data-action="goto-selfie">${locale.selfie_retake_btn}</button>
            ` : ''}
          </div>`
      }

      case 'processing': return `
        <div class="kq-spinner-wrap">
          <div class="kq-spinner" role="status" aria-label="Processing"></div>
          <p class="kq-title">${locale.processing_title}</p>
        </div>`

      case 'result': return this._renderResult()

      default: return ''
    }
  }

  private _renderIntro(): string {
    const l = this.locale
    return `
      <div class="kq-body">
        <h2 class="kq-title">${l.intro_title}</h2>
        <p class="kq-subtitle">${l.intro_body}</p>
        <div class="kq-intro-steps">
          <div class="kq-intro-step">
            <div class="kq-intro-step-icon">🪪</div>
            <span>Document</span>
          </div>
          <div class="kq-intro-step">
            <div class="kq-intro-step-icon">🤳</div>
            <span>Selfie</span>
          </div>
          <div class="kq-intro-step">
            <div class="kq-intro-step-icon">👁️</div>
            <span>Liveness</span>
          </div>
        </div>
        <button class="kq-btn kq-btn-primary" data-action="start">${l.intro_cta}</button>
      </div>`
  }

  private _renderPreview(blob: Blob): string {
    const url = URL.createObjectURL(blob)
    return `<img class="kq-preview" src="${url}" alt="Captured document" />`
  }

  private _renderResult(): string {
    const result = (this as unknown as Record<string, unknown>)['_lastResult'] as VerifyResult | null
    const l = this.locale
    if (!result) {
      return `
        <div class="kq-result">
          <div class="kq-result-icon fail">❌</div>
          <h2 class="kq-title">${l.result_fail_title}</h2>
          <p class="kq-subtitle">${this.errorMsg || l.result_fail_body}</p>
          <button class="kq-btn kq-btn-primary" data-action="restart">Try again</button>
        </div>`
    }

    const icons:  Record<string, string> = { pass: '✅', fail: '❌', review: '⏳' }
    const titles: Record<string, string> = {
      pass:   l.result_pass_title,
      fail:   l.result_fail_title,
      review: l.result_review_title,
    }
    const bodies: Record<string, string> = {
      pass:   l.result_pass_body,
      fail:   l.result_fail_body,
      review: l.result_review_body,
    }

    return `
      <div class="kq-result">
        <div class="kq-result-icon ${result.verdict}">${icons[result.verdict]}</div>
        <h2 class="kq-title">${titles[result.verdict]}</h2>
        <p class="kq-subtitle">${bodies[result.verdict]}</p>
        ${result.verdict === 'fail'
          ? `<button class="kq-btn kq-btn-primary" data-action="restart">Try again</button>`
          : ''}
      </div>`
  }

  // ── Event binding ─────────────────────────────────────────────────────────

  private _bindEvents() {
    this.shadow.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', async (e) => {
        const action = (e.currentTarget as HTMLElement).dataset['action']!
        await this._handleAction(action)
      })
    })

    // Close on overlay click
    this.shadow.querySelector('.kq-overlay')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).classList.contains('kq-overlay')) {
        this._handleAction('close')
      }
    })
  }

  private async _handleAction(action: string) {
    switch (action) {
      case 'close':
        this._dispatch('kernaq:cancel', undefined)
        this.close()
        break

      case 'start':
        this._goto('document')
        break

      case 'capture-doc': {
        const blob = await this._capturePhoto()
        if (!blob) return
        this.capture.documentBlob = blob
        this._goto('selfie')
        break
      }

      case 'capture-selfie': {
        const blob = await this._capturePhoto()
        if (!blob) return
        this.capture.selfieBlob = blob
        this._goto('liveness')
        break
      }

      case 'start-liveness':
        this._startLivenessRecording()
        break

      case 'goto-doc':
        this.capture.documentBlob = undefined
        this._goto('document')
        break

      case 'goto-selfie':
        this.capture.selfieBlob = undefined
        this._goto('selfie')
        break

      case 'restart':
        this.capture = {}
        this._goto('intro')
        break
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private _setError(msg: string) {
    this.errorMsg = msg
    this._render()
  }

  private _dispatch<T>(event: string, detail: T) {
    this.dispatchEvent(new CustomEvent(event, { detail, bubbles: true, composed: true }))
  }
}
