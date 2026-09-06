import resolve from '@rollup/plugin-node-resolve'
import swc from '@rollup/plugin-swc'
import dts from 'rollup-plugin-dts'

const swcPlugin = swc({
  swc: {
    jsc: {
      target: 'es2020',
      parser: { syntax: 'typescript', decorators: false },
    },
    sourceMaps: true,
  },
})

const src = 'src/index.ts'

export default [
  // CJS build
  {
    input: src,
    output: { file: 'dist/index.js', format: 'cjs', sourcemap: true },
    plugins: [resolve({ extensions: ['.ts', '.js'] }), swcPlugin],
  },
  // ESM build
  {
    input: src,
    output: { file: 'dist/index.esm.js', format: 'esm', sourcemap: true },
    plugins: [resolve({ extensions: ['.ts', '.js'] }), swcPlugin],
  },
  // Types bundle — still uses tsc via dts plugin (type-checking only, no emit)
  {
    input: src,
    output: { file: 'dist/index.d.ts', format: 'esm' },
    plugins: [dts()],
  },
]
