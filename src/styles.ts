/**
 * Scoped Shadow DOM styles for <kernaq-verify>.
 * All theming is driven by CSS custom properties set on :host.
 */
export function getStyles(mode: 'light' | 'dark' = 'light'): string {
  const dark = mode === 'dark'
  return `
    :host {
      --kq-accent:       var(--kernaq-accent-color,     ${dark ? '#e5e7eb' : '#111827'});
      --kq-accent-inv:   ${dark ? '#111827' : '#ffffff'};
      --kq-bg:           var(--kernaq-background-color, ${dark ? '#0f0f0f' : '#ffffff'});
      --kq-surface:      ${dark ? '#1a1a1a' : '#f7f7f7'};
      --kq-surface-2:    ${dark ? '#242424' : '#efefef'};
      --kq-text:         var(--kernaq-text-color,       ${dark ? '#f5f5f5' : '#0f0f0f'});
      --kq-text-2:       ${dark ? '#888888' : '#6b7280'};
      --kq-border:       ${dark ? '#2a2a2a' : '#e5e5e5'};
      --kq-error-bg:     ${dark ? 'rgba(239,68,68,0.1)' : '#fef2f2'};
      --kq-error-text:   ${dark ? '#f87171' : '#b91c1c'};
      --kq-error-border: ${dark ? 'rgba(239,68,68,0.25)' : '#fecaca'};
      --kq-radius:       var(--kernaq-border-radius,    14px);
      --kq-font:         var(--kernaq-font-family,      -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif);
      display: block;
      font-family: var(--kq-font);
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    /* ── Overlay ── */
    .kq-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      padding: 16px;
      animation: kqFadeIn 0.18s ease;
    }
    @keyframes kqFadeIn { from { opacity: 0; } to { opacity: 1; } }

    /* ── Modal — fixed 600px, never grows or shrinks ── */
    .kq-modal {
      background: var(--kq-bg);
      border: 1px solid var(--kq-border);
      border-radius: var(--kq-radius);
      width: 420px;
      height: 600px;
      overflow: hidden;
      box-shadow: 0 24px 60px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.04);
      display: flex;
      flex-direction: column;
    }
    /* No slide-up animation — modal shell is persistent, only content swaps */

    /* ── Header — hidden. Footer "Secured by Kernaq" handles branding ── */
    .kq-header { display: none; }

    /* Content slots — fade in on swap */
    .kq-slot-body, .kq-slot-footer {
      display: contents;
    }

    /* ── Body ── */
    .kq-body {
      padding: 32px 24px 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    /* Camera-mode body: stretches to fill so viewport takes remaining space */
    .kq-body.kq-has-camera {
      flex: 1;
      min-height: 0;
      padding-bottom: 16px;
      overflow: hidden;
    }

    /* ── Text — centred on intro + camera steps ── */
    .kq-heading {
      text-align: center;
      margin-bottom: 4px;
    }
    .kq-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--kq-text);
      line-height: 1.2;
      letter-spacing: -0.025em;
    }
    .kq-subtitle {
      font-size: 13.5px;
      color: var(--kq-text-2);
      line-height: 1.55;
      margin-top: 6px;
    }

    /* ── Camera viewport ── */
    .kq-viewport {
      position: relative;
      width: 100%;
      flex: 1;
      min-height: 200px;
      border-radius: calc(var(--kq-radius) - 4px);
      overflow: hidden;
      background: #000;
    }
    .kq-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    /* Camera permission request overlay */
    .kq-cam-prompt {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: ${dark ? '#141414' : '#111'};
    }
    .kq-cam-prompt-icon { color: #555; }
    .kq-cam-prompt p { font-size: 12px; color: #555; }

    /* Document corner guides */
    .kq-frame-guide {
      position: absolute;
      inset: 8% 6%;
      pointer-events: none;
    }
    .kq-frame-corner {
      position: absolute;
      width: 20px;
      height: 20px;
      border-color: rgba(255,255,255,0.9);
      border-style: solid;
    }
    .kq-frame-corner.tl { top: 0; left: 0; border-width: 2px 0 0 2px; border-radius: 3px 0 0 0; }
    .kq-frame-corner.tr { top: 0; right: 0; border-width: 2px 2px 0 0; border-radius: 0 3px 0 0; }
    .kq-frame-corner.bl { bottom: 0; left: 0; border-width: 0 0 2px 2px; border-radius: 0 0 0 3px; }
    .kq-frame-corner.br { bottom: 0; right: 0; border-width: 0 2px 2px 0; border-radius: 0 0 3px 0; }
    .kq-frame-dim {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.35);
      clip-path: polygon(
        0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
        6% 8%, 6% 92%, 94% 92%, 94% 8%, 6% 8%
      );
      pointer-events: none;
    }

    /* Selfie oval guide */
    .kq-oval-guide {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -52%);
      width: 60%;
      aspect-ratio: 3/4;
      border: 2px solid rgba(255,255,255,0.75);
      border-radius: 50%;
      pointer-events: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .kq-oval-guide.kq-oval-guide-ok {
      border-color: #4ade80;
      box-shadow: 0 0 0 2px rgba(74,222,128,0.3);
    }

    /* Live selfie instruction pill */
    .kq-selfie-pill {
      position: absolute;
      bottom: 14px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.65);
      backdrop-filter: blur(6px);
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      padding: 7px 18px;
      border-radius: 999px;
      border: 1.5px solid rgba(255,255,255,0.15);
      white-space: nowrap;
      pointer-events: none;
      transition: background 0.2s, border-color 0.2s;
    }
    .kq-selfie-pill.kq-selfie-pill-ok {
      background: rgba(22,163,74,0.8);
      border-color: rgba(134,239,172,0.5);
    }

    /* Recording badge */
    .kq-rec-badge {
      position: absolute;
      top: 10px;
      left: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(0,0,0,0.65);
      border: 1px solid rgba(239,68,68,0.5);
      color: #ef4444;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      padding: 4px 9px;
      border-radius: 5px;
    }
    .kq-rec-dot {
      width: 7px; height: 7px;
      border-radius: 50%;
      background: #ef4444;
      animation: kqBlink 1.1s ease-in-out infinite;
    }
    @keyframes kqBlink { 0%,100%{ opacity:1; } 50%{ opacity:0.2; } }

    /* Liveness in-video overlay */
    .kq-live-overlay {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      padding: 10px 14px 12px;
      background: linear-gradient(transparent, rgba(0,0,0,0.75));
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .kq-live-task-pill {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .kq-live-task-num {
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: rgba(255,255,255,0.55);
      text-transform: uppercase;
      white-space: nowrap;
    }
    .kq-live-task-text {
      font-size: 15px;
      font-weight: 700;
      color: #fff;
      line-height: 1.2;
    }
    .kq-live-bar-wrap {
      height: 3px;
      background: rgba(255,255,255,0.2);
      border-radius: 999px;
      overflow: hidden;
    }
    .kq-live-bar-fill {
      height: 100%;
      background: #fff;
      border-radius: 999px;
      transition: width 0.08s linear;
    }

    /* Liveness task dots */
    .kq-task-dots {
      display: flex;
      gap: 6px;
    }
    .kq-task-dot {
      flex: 1;
      height: 2.5px;
      border-radius: 999px;
      background: var(--kq-border);
    }
    .kq-task-dot.done   { background: var(--kq-accent); opacity: 0.35; }
    .kq-task-dot.active { background: var(--kq-accent); }

    /* Captured thumbnail row */
    .kq-thumb-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 7px 10px;
      background: var(--kq-surface);
      border: 1px solid var(--kq-border);
      border-radius: 8px;
      flex-shrink: 0;
    }
    .kq-thumb {
      width: 48px;
      height: 32px;
      object-fit: cover;
      border-radius: 5px;
      border: 1px solid var(--kq-border);
      flex-shrink: 0;
    }
    .kq-thumb-label {
      font-size: 12px;
      color: var(--kq-text-2);
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .kq-thumb-label svg { color: #16a34a; flex-shrink: 0; }

    /* ── Hint strip ── */
    .kq-hint {
      display: flex;
      align-items: flex-start;
      gap: 7px;
      padding: 9px 11px;
      background: var(--kq-surface);
      border: 1px solid var(--kq-border);
      border-radius: 8px;
      font-size: 12px;
      color: var(--kq-text-2);
      line-height: 1.45;
      flex-shrink: 0;
    }
    .kq-hint svg { flex-shrink: 0; margin-top: 1px; }

    /* ── Buttons ── */
    .kq-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 12px 18px;
      border-radius: calc(var(--kq-radius) - 4px);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: opacity 0.12s, transform 0.08s;
      letter-spacing: -0.01em;
      flex-shrink: 0;
    }
    .kq-btn:active:not(:disabled) { transform: scale(0.985); }
    .kq-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    .kq-btn-primary { background: var(--kq-accent); color: var(--kq-accent-inv); }
    .kq-btn-primary:hover:not(:disabled) { opacity: 0.86; }

    .kq-btn-ghost {
      background: transparent;
      color: var(--kq-text-2);
      border: 1px solid var(--kq-border);
    }
    .kq-btn-ghost:hover:not(:disabled) { background: var(--kq-surface); color: var(--kq-text); }

    /* ── Processing ── */
    .kq-processing {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      min-height: 0;
      padding: 32px 24px;
      gap: 16px;
      text-align: center;
    }
    .kq-spinner {
      width: 38px; height: 38px;
      border: 2.5px solid var(--kq-border);
      border-top-color: var(--kq-accent);
      border-radius: 50%;
      animation: kqSpin 0.75s linear infinite;
    }
    @keyframes kqSpin { to { transform: rotate(360deg); } }
    .kq-processing .kq-title { font-size: 16px; text-align: center; }
    .kq-processing .kq-subtitle { text-align: center; }

    /* ── Result ── */
    .kq-result {
      display: flex;
      flex-direction: column;
      padding: 28px 24px 20px;
      gap: 14px;
      align-items: center;
      text-align: center;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
    .kq-result-icon {
      width: 52px; height: 52px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 4px;
    }
    .kq-result-icon.pass   { background: ${dark ? 'rgba(34,197,94,0.12)' : '#dcfce7'}; color: #16a34a; }
    .kq-result-icon.fail   { background: ${dark ? 'rgba(239,68,68,0.12)' : '#fee2e2'}; color: #dc2626; }
    .kq-result-icon.review { background: ${dark ? 'rgba(245,158,11,0.12)' : '#fef9c3'}; color: #ca8a04; }
    .kq-result-details {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .kq-result-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 9px 12px;
      background: var(--kq-surface);
      border-radius: 8px;
      font-size: 12.5px;
      text-align: left;
    }
    .kq-result-row-label { color: var(--kq-text-2); }
    .kq-result-row-val   { color: var(--kq-text); font-weight: 600; }
    .kq-result-row-val.ok  { color: #16a34a; }
    .kq-result-row-val.bad { color: #dc2626; }

    /* ── Error banner ── */
    .kq-error {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      background: var(--kq-error-bg);
      color: var(--kq-error-text);
      border: 1px solid var(--kq-error-border);
      border-radius: 8px;
      padding: 9px 11px;
      font-size: 12.5px;
      line-height: 1.45;
      flex-shrink: 0;
    }
    .kq-error svg { flex-shrink: 0; margin-top: 1px; }

    /* ── Footer ── */
    .kq-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      padding: 10px 20px 14px;
      border-top: 1px solid var(--kq-border);
      font-size: 11px;
      color: var(--kq-text-2);
      flex-shrink: 0;
    }
    .kq-footer a {
      color: var(--kq-text-2);
      text-decoration: none;
      font-weight: 500;
    }
    .kq-footer a:hover { color: var(--kq-text); }
  `
}
