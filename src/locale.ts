import type { VerifyLocale } from './types'

export const DEFAULT_LOCALE: VerifyLocale = {
  intro_title:            'Verify your identity',
  intro_body:             'This takes about 90 seconds. You\'ll need your ID document and a clear view of your face.',
  intro_cta:              'Get started',

  doc_front_title:        'Document — front',
  doc_front_instruction:  'Hold the front of your document flat inside the frame. Ensure all four corners are visible and there is no glare.',
  doc_back_title:         'Document — back',
  doc_back_instruction:   'Flip your document over and hold the back inside the frame.',
  doc_capture_btn:        'Capture',
  doc_retake_btn:         'Retake',

  selfie_title:           'Selfie',
  selfie_instruction:     'Centre your face inside the oval. Look directly at the camera.',
  selfie_capture_btn:     'Capture selfie',
  selfie_retake_btn:      'Retake',

  liveness_title:         'Liveness check',
  liveness_ready:         'Follow the instructions as they appear.',
  liveness_task_prefix:   'Please',
  liveness_complete:      'Hold still…',

  processing_title:       'Verifying…',

  result_pass_title:      'Identity verified',
  result_pass_body:       'Your verification was successful.',
  result_fail_title:      'Verification failed',
  result_fail_body:       'We could not verify your identity. Please try again with better lighting.',
  result_review_title:    'Under review',
  result_review_body:     'Your submission is being manually reviewed. This usually takes a few minutes.',

  error_camera_denied:    'Camera access denied. Allow camera permissions and try again.',
  error_blur:             'Image is too blurry — hold steady and ensure good lighting.',
  error_quality:          'Image quality too low. Try better lighting or a steadier hand.',
  error_network:          'Network error. Check your connection and try again.',
}
