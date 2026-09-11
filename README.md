# @kernaq/verify

Drop-in KYC verification Web Component for [Kernaq Identity](https://kernaq.com). One HTML tag — handles document capture (front + back), auto selfie, and liveness challenges. Works with any framework or plain HTML.

## Install

```bash
npm install @kernaq/verify
```

Or load from CDN (no install needed):

```html
<script src="https://cdn.kernaq.com/verify@2/verify.js"></script>
```

## Quick start

```html
<kernaq-verify
  api-key="k_test_your_key"
  country="KEN"
  reference="user_abc123"
  document-type="national_id"
></kernaq-verify>

<script>
  document.querySelector('kernaq-verify')
    .addEventListener('kernaq:complete', e => {
      console.log(e.detail.verdict)    // 'pass' | 'fail' | 'review'
      console.log(e.detail.score)      // 0–100
      console.log(e.detail.faceMatch)  // boolean
      console.log(e.detail.isLive)     // boolean
    })
</script>
```

Or via JavaScript API:

```js
import '@kernaq/verify'

const widget = document.querySelector('kernaq-verify')
widget.open({
  apiKey: 'k_test_your_key',
  country: 'KEN',
  reference: 'user_abc123',
  documentType: 'national_id',
})
widget.addEventListener('kernaq:complete', e => console.log(e.detail))
```

## HTML attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `api-key` | `string` | — | Your Kernaq API key (`k_test_...` or `k_live_...`) |
| `backend-url` | `string` | — | Backend proxy URL — use this instead of `api-key` in production |
| `document-type` | `string` | `national_id` | Document type the user will scan. One of: `national_id`, `passport`, `driver_license`, `alien_card` |
| `country` | `string` | `KEN` | ISO 3166-1 alpha-3 country code |
| `reference` | `string` | auto | Your internal user or session ID |
| `sandbox` | boolean attr | `false` | Sandbox mode — no billing, test responses |
| `steps` | `string` | `document,selfie,liveness` | Comma-separated subset of steps to run. Any combination of `document`, `selfie`, `liveness` |
| `liveness-tasks` | `number` | `2` | Number of liveness challenges to present (1–5) |
| `blur-threshold` | `number` | `35` | Minimum blur score to accept a capture (lower = more lenient) |
| `theme-mode` | `light` \| `dark` | `light` | Colour scheme |
| `accent-color` | `string` | `#111827` | Primary button and highlight colour |

## JavaScript API

```js
// Open with config override
widget.open({
  apiKey: 'k_test_...',
  country: 'KEN',
  reference: 'user_abc',
  documentType: 'passport',
  steps: ['selfie', 'liveness'],        // run only these steps
  livenessTaskCount: 3,
  blurThreshold: 40,
  theme: {
    mode: 'dark',
    accentColor: '#6366f1',
    backgroundColor: '#0f0f0f',
    borderRadius: '16px',
  },
  locale: {
    intro_title: 'Thibitisha utambulisho wako',
    intro_cta: 'Anza',
  },
})

// Close and reset
widget.close()
```

## Steps — run only what you need

By default all three steps run. Pass `steps` to run a subset:

```html
<!-- Document scan only -->
<kernaq-verify
  api-key="k_test_..."
  document-type="passport"
  steps="document"
></kernaq-verify>

<!-- Selfie + liveness only (no document) -->
<kernaq-verify
  api-key="k_test_..."
  steps="selfie,liveness"
></kernaq-verify>

<!-- Liveness only -->
<kernaq-verify
  api-key="k_test_..."
  steps="liveness"
></kernaq-verify>
```

## Events

```js
const widget = document.querySelector('kernaq-verify')

// Verification completed
widget.addEventListener('kernaq:complete', e => {
  const result = e.detail
  // result.verificationId — string
  // result.reference      — string (your reference)
  // result.verdict        — 'pass' | 'fail' | 'review'
  // result.score          — 0–100 risk score (0 = lowest risk)
  // result.faceMatch      — boolean
  // result.isLive         — boolean
  // result.documentFields — { name, date_of_birth, document_number, ... }
})

// User cancelled (only fires if developer calls widget.close() programmatically)
widget.addEventListener('kernaq:cancel', () => { ... })

// Step changed
widget.addEventListener('kernaq:step', e => {
  console.log(e.detail.step)
  // 'intro' | 'doc-front' | 'doc-back' | 'selfie' | 'liveness' | 'processing' | 'result'
})
```

## Theming

All theme values are CSS custom properties set on the host element:

```html
<kernaq-verify
  api-key="k_test_..."
  theme-mode="dark"
  accent-color="#6366f1"
  style="--kernaq-border-radius: 20px; --kernaq-font-family: 'Inter', sans-serif;"
></kernaq-verify>
```

| CSS variable | Description |
|---|---|
| `--kernaq-accent-color` | Primary colour (buttons, active oval) |
| `--kernaq-background-color` | Modal background |
| `--kernaq-text-color` | Primary text |
| `--kernaq-border-radius` | Corner radius for modal and buttons |
| `--kernaq-font-family` | Font family |

## Localisation

Override any displayed string via the JavaScript API:

```js
widget.open({
  apiKey: 'k_test_...',
  locale: {
    intro_title:         'Thibitisha utambulisho wako',
    intro_body:          'Hii itachukua sekunde 90.',
    intro_cta:           'Anza',
    doc_front_title:     'Hati — mbele',
    doc_back_title:      'Hati — nyuma',
    selfie_title:        'Picha ya uso',
    liveness_title:      'Uthibitisho wa uhai',
    result_pass_title:   'Umefaulu',
    result_fail_title:   'Imeshindwa',
  },
})
```

### All locale keys

| Key | Default |
|---|---|
| `intro_title` | Verify your identity |
| `intro_body` | This takes about 90 seconds… |
| `intro_cta` | Get started |
| `doc_front_title` | Document — front |
| `doc_front_instruction` | Hold the front of your document… |
| `doc_back_title` | Document — back |
| `doc_back_instruction` | Flip your document over… |
| `doc_capture_btn` | Capture |
| `doc_retake_btn` | Retake |
| `selfie_title` | Selfie |
| `selfie_instruction` | Centre your face inside the oval… |
| `liveness_title` | Liveness check |
| `liveness_ready` | Follow the instructions as they appear |
| `liveness_complete` | Hold still… |
| `processing_title` | Verifying… |
| `result_pass_title` | Identity verified |
| `result_pass_body` | Your verification was successful |
| `result_fail_title` | Verification failed |
| `result_fail_body` | We could not verify your identity… |
| `result_review_title` | Under review |
| `result_review_body` | Your submission is being reviewed… |
| `error_camera_denied` | Camera access denied… |
| `error_blur` | Image is too blurry… |
| `error_network` | Network error… |

## Backend proxy (recommended for production)

Never expose a live key in frontend code. Route through your server instead:

```html
<kernaq-verify
  backend-url="https://api.yourapp.com/kyc/verify"
  country="KEN"
  reference="user_abc"
></kernaq-verify>
```

Your endpoint receives `multipart/form-data` with:

| Field | Description |
|---|---|
| `document` | Front of document (JPEG) |
| `document_back` | Back of document (JPEG) |
| `selfie` | Selfie photo (JPEG) |
| `document_type` | `national_id` \| `passport` \| `driver_license` \| `alien_card` |
| `country` | ISO 3166-1 alpha-3 |
| `reference` | Your reference string |
| `sandbox` | `'true'` if sandbox mode |

Forward to `POST https://api.identity.kernaq.com/v1/verify` with your secret key in `X-API-Key`.

## User flow

The widget walks users through these steps in order (configurable via `steps`):

1. **Intro** — privacy notice and get started button
2. **Document front** — camera with corner bracket guides, blur/brightness check before accepting
3. **Document back** — same, shows thumbnail of front as confirmation
4. **Selfie** — auto-captures when face is centred, well-lit, sharp, and no glasses glare. Live guidance pill shows actionable feedback
5. **Liveness** — 2 randomised challenges (blink, turn left/right, nod, open mouth) shown as overlay on the camera feed
6. **Processing** — submits to API
7. **Result** — verdict, risk score, face match, liveness status. On fail: retry option

The user cannot dismiss the widget — the developer controls visibility. On pass/review the `kernaq:complete` event fires and the developer removes or hides the element.

## Browser support

All modern browsers (Chrome 80+, Firefox 78+, Safari 14+, Edge 80+). Requires:
- `getUserMedia` (camera access)
- `MediaRecorder` (liveness video)
- `Shadow DOM` (Web Components)

## Links

- [Dashboard](https://kernaq.com/dashboard)
- [API reference](https://kernaq.com/docs/api)
- [npm](https://www.npmjs.com/package/@kernaq/verify)
