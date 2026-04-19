// scripts/build-script.ts
import { build } from 'esbuild'
import { mkdirSync } from 'fs'

mkdirSync('public', { recursive: true })

await build({
  entryPoints: ['src-script/index.ts'],
  bundle: true,
  minify: true,
  outfile: 'public/refkit.js',
  target: ['es2017'],
  format: 'iife',
})

console.log('✓ Built public/refkit.js')
