/**
 * Scoped Shadow DOM styles for <kernaq-verify>.
 * All theming is driven by CSS custom properties set on :host.
 * The dev never sees these classes — they're encapsulated in the shadow root.
 */
export function getStyles(mode: 'light' | 'dark' = 'light'): string {
  const dark = mode === 'dark'
  return `
    :host {
      --kq-accent:      var(--kernaq-accent-color,      #111827);
      --kq-bg:          var(--kernaq-background-color,  ${dark ? '#1a1a2e' : '#ffffff'});
      --kq-text:        var(--kernaq-text-color,        ${dark ? '#f9fafb' : '#111827'});
      --kq-subtext:     ${dark ? '#9ca3af' : '#6b7280'};
      --kq-border:      ${dark ? '#374151' : '#e5e7eb'};
      --kq-card-bg:     ${dark ? '#111827' : '#f9fafb'};
      --kq-radius:      var(--kernaq-border-radius,     12px);
      --kq-font:        var(--kernaq-font-family,       inherit);
      display: block;
      font-family: var(--kq-font);
    }

    /* ── Overlay ── */
    .kq-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      padding: 16px;
      animation: kqFadeIn 0.2s ease;
    }

    @keyframes kqFadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    /* ── Modal ── */
    .kq-modal {
      background: var(--kq-bg);
      border-radius: var(--kq-radius);
      width: 100%;
      max-width: 440px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px rgba(0,0,0,0.25);
      display: flex;
      flex-direction: column;
      animation: kqSlideUp 0.25s ease;
      position: relative;
    }

    @keyframes kqSlideUp {
      from { transform: translateY(20px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }

    /* ── Header ── */
    .kq-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px 0;
    }

    .kq-logo {
      font-size: 14px;
      font-weight: 700;
      color: var(--kq-accent);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .kq-close {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--kq-subtext);
      padding: 4px;
      line-height: 1;
      font-size: 20px;
      border-radius: 6px;
      transition: background 0.15s;
    }
    .kq-close:hover { background: var(--kq-card-bg); }

    /* ── Progress bar ── */
    .kq-progress {
      display: flex;
      gap: 6px;
      padding: 16px 24px 0;
    }
    .kq-progress-dot {
      flex: 1;
      height: 3px;
      border-radius: 999px;
      background: var(--kq-border);
      transition: background 0.3s;
    }
    .kq-progress-dot.active  { background: var(--kq-accent); }
    .kq-progress-dot.done    { background: var(--kq-accent); opacity: 0.4; }

    /* ── Body ── */
    .kq-body {
      padding: 24px;
      flex: 1;
    }

    .kq-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--kq-text);
      margin: 0 0 8px;
    }

    .kq-subtitle {
      font-size: 14px;
      color: var(--kq-subtext);
      margin: 0 0 24px;
      line-height: 1.5;
    }

    /* ── Camera viewport ── */
    .kq-viewport {
      position: relative;
      width: 100%;
      aspect-ratio: 4/3;
      border-radius: calc(var(--kq-radius) - 4px);
      overflow: hidden;
      background: #000;
      margin-bottom: 16px;
    }

    .kq-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    /* Document frame guide */
    .kq-frame-guide {
      position: absolute;
      inset: 8%;
      border: 2px solid rgba(255,255,255,0.6);
      border-radius: 8px;
      pointer-events: none;
      box-shadow: 0 0 0 9999px rgba(0,0,0,0.35);
    }

    /* Selfie oval guide */
    .kq-oval-guide {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 65%;
      aspect-ratio: 3/4;
      border: 2px solid rgba(255,255,255,0.6);
      border-radius: 50%;
      pointer-events: none;
      box-shadow: 0 0 0 9999px rgba(0,0,0,0.35);
    }

    /* Recording indicator */
    .kq-recording-badge {
      position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(220, 38, 38, 0.85);
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 999px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .kq-recording-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #fff;
      animation: kqPulse 1s ease-in-out infinite;
    }
    @keyframes kqPulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.3; }
    }

    /* Liveness countdown ring */
    .kq-countdown {
      position: absolute;
      bottom: 12px;
      left: 50%;
      transform: translateX(-50%);
      width: 52px;
      height: 52px;
    }
    .kq-countdown svg { transform: rotate(-90deg); }
    .kq-countdown circle {
      fill: none;
      stroke: rgba(255,255,255,0.3);
      stroke-width: 4;
    }
    .kq-countdown .progress {
      stroke: #fff;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.1s linear;
    }
    .kq-countdown-text {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 16px;
      font-weight: 700;
    }

    /* Preview captured image */
    .kq-preview {
      width: 100%;
      aspect-ratio: 4/3;
      border-radius: calc(var(--kq-radius) - 4px);
      object-fit: cover;
      margin-bottom: 16px;
      border: 2px solid var(--kq-border);
    }

    /* ── Buttons ── */
    .kq-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 13px 20px;
      border-radius: calc(var(--kq-radius) - 2px);
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: opacity 0.15s, transform 0.1s;
    }
    .kq-btn:active { transform: scale(0.98); }
    .kq-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .kq-btn-primary {
      background: var(--kq-accent);
      color: #fff;
    }
    .kq-btn-primary:hover:not(:disabled) { opacity: 0.88; }

    .kq-btn-secondary {
      background: var(--kq-card-bg);
      color: var(--kq-text);
      border: 1px solid var(--kq-border);
      margin-top: 10px;
    }
    .kq-btn-secondary:hover:not(:disabled) { opacity: 0.75; }

    /* ── Processing spinner ── */
    .kq-spinner-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px 24px;
      gap: 20px;
      text-align: center;
    }
    .kq-spinner {
      width: 48px;
      height: 48px;
      border: 4px solid var(--kq-border);
      border-top-color: var(--kq-accent);
      border-radius: 50%;
      animation: kqSpin 0.8s linear infinite;
    }
    @keyframes kqSpin {
      to { transform: rotate(360deg); }
    }

    /* ── Result screen ── */
    .kq-result {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 24px;
      text-align: center;
      gap: 12px;
    }
    .kq-result-icon {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      margin-bottom: 4px;
    }
    .kq-result-icon.pass   { background: #d1fae5; }
    .kq-result-icon.fail   { background: #fee2e2; }
    .kq-result-icon.review { background: #fef3c7; }

    /* ── Error banner ── */
    .kq-error {
      background: #fee2e2;
      color: #b91c1c;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 13px;
      margin-bottom: 14px;
    }

    /* ── Intro illustration ── */
    .kq-intro-steps {
      display: flex;
      justify-content: center;
      gap: 20px;
      margin-bottom: 28px;
    }
    .kq-intro-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--kq-subtext);
    }
    .kq-intro-step-icon {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      background: var(--kq-card-bg);
      border: 1px solid var(--kq-border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }
  `
}
