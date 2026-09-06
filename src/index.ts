/**
 * @kernaq/verify
 *
 * Drop-in KYC verification Web Component.
 *
 * HTML usage:
 *   <script src="https://cdn.kernaq.com/verify@1/verify.js"></script>
 *   <kernaq-verify api-key="k_test_..." country="KEN" reference="user_abc"></kernaq-verify>
 *
 * NPM usage:
 *   import '@kernaq/verify'
 *   // <kernaq-verify> is now registered and ready to use
 *
 * JS usage:
 *   import { KernaqVerify } from '@kernaq/verify'
 *   const el = document.querySelector('kernaq-verify')
 *   el.open({ apiKey: 'k_test_...', country: 'KEN' })
 *   el.addEventListener('kernaq:complete', e => console.log(e.detail))
 */

export { KernaqVerify } from './component'
export type { VerifyConfig, VerifyTheme, VerifyLocale, VerifyResult, VerifyStep, DocumentType } from './types'

// Auto-register the custom element when this module is imported
import { KernaqVerify } from './component'
if (!customElements.get('kernaq-verify')) {
  customElements.define('kernaq-verify', KernaqVerify)
}
