/**
 * @kernaq/verify — public types
 */

export type VerifyStep = 'intro' | 'doc-front' | 'doc-back' | 'selfie' | 'liveness' | 'processing' | 'result'

/** Liveness challenge tasks shown to the user */
export type LivenessTask = 'blink' | 'turn-left' | 'turn-right' | 'nod' | 'open-mouth'

/**
 * The capture steps the developer wants to include.
 * Default is all three. Pass a subset to run only what you need.
 *
 * 'document' = front + back capture
 * 'selfie'   = auto-captured selfie with quality guidance
 * 'liveness' = randomised action challenges
 *
 * @example steps="selfie,liveness"   // skip document capture
 * @example steps="liveness"          // liveness check only
 * @example steps="document"          // document scan only
 */
export type VerifyStepName = 'document' | 'selfie' | 'liveness'

export type DocumentType =
  | 'national_id'
  | 'passport'
  | 'driver_license'
  | 'alien_card'

export type VerifyVerdict = 'pass' | 'fail' | 'review'

export interface VerifyConfig {
  /**
   * Your Kernaq publishable / test API key.
   * Never use a live secret key here — use a server-side proxy endpoint instead.
   */
  apiKey?: string

  /**
   * URL of your backend proxy that calls Kernaq on your behalf.
   * Required when not using a publishable key directly.
   * POST /verify → forwards to Kernaq Identity API.
   */
  backendUrl?: string

  /** Document types the user can choose. Defaults to ['national_id', 'passport'] */
  documentTypes?: DocumentType[]

  /** Country code for the user's document (ISO 3166-1 alpha-3). e.g. 'KEN' */
  country?: string

  /** Reference ID for this verification — your internal user ID or session ID */
  reference?: string

  /** Enable sandbox mode (uses k_test_ keys, no billing) */
  sandbox?: boolean

  /**
   * Which capture steps to include. Default: all three.
   * Pass a subset when you only need specific captures.
   * @example steps={['selfie', 'liveness']}
   */
  steps?: VerifyStepName[]

  /** Liveness recording duration in milliseconds. Default: 3000 */
  livenessDuration?: number

  /**
   * Number of liveness tasks to present. Default: 2.
   * Tasks are randomly selected from the built-in pool.
   */
  livenessTaskCount?: number

  /** Blur rejection threshold — lower = stricter. Default: 80. Range: 20–200 */
  blurThreshold?: number

  /** Theming */
  theme?: VerifyTheme

  /** Localization — override any displayed string */
  locale?: Partial<VerifyLocale>
}

export interface VerifyTheme {
  /** Primary accent colour. Default: #111827 */
  accentColor?: string
  /** Background colour of the modal. Default: #ffffff */
  backgroundColor?: string
  /** Text colour. Default: #111827 */
  textColor?: string
  /** Border radius for buttons and panels. Default: 12px */
  borderRadius?: string
  /** Font family. Default: inherit */
  fontFamily?: string
  /** 'light' | 'dark'. Overrides background/text if set */
  mode?: 'light' | 'dark'
}

export interface VerifyLocale {
  intro_title: string
  intro_body: string
  intro_cta: string
  doc_front_title: string
  doc_front_instruction: string
  doc_back_title: string
  doc_back_instruction: string
  doc_capture_btn: string
  doc_retake_btn: string
  selfie_title: string
  selfie_instruction: string
  selfie_capture_btn: string
  selfie_retake_btn: string
  liveness_title: string
  liveness_ready: string
  liveness_task_prefix: string
  liveness_complete: string
  processing_title: string
  result_pass_title: string
  result_pass_body: string
  result_fail_title: string
  result_fail_body: string
  result_review_title: string
  result_review_body: string
  error_camera_denied: string
  error_blur: string
  error_quality: string
  error_network: string
}

export interface VerifyResult {
  verificationId: string
  reference: string
  verdict: VerifyVerdict
  score: number
  faceMatch: boolean
  isLive: boolean
  documentFields?: Record<string, string>
}

/** Events dispatched on the <kernaq-verify> element */
export interface VerifyEvents {
  /** User dismissed the widget before completing */
  'kernaq:cancel': CustomEvent<void>
  /** Verification completed successfully */
  'kernaq:complete': CustomEvent<VerifyResult>
  /** An unrecoverable error occurred */
  'kernaq:error': CustomEvent<{ code: string; message: string }>
  /** Step changed */
  'kernaq:step': CustomEvent<{ step: VerifyStep }>
}
