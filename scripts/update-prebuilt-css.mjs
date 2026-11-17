// 라즈베리 파이(ARM Linux)는 Tailwind 를 직접 돌리면 멈춰서, vite.config.ts 가 .prebuilt/index.css 를 대신 쓴다.
// 화면 코드에 새 Tailwind 클래스를 쓰면 이 파일도 다시 만들어야 파이에 스타일이 반영된다.
//   사용: (PC 에서) pnpm css:prebuilt  → .prebuilt/index.css 갱신 후 커밋·푸시
import { build } from 'vite'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'catio-css-'))

await build({ root, logLevel: 'warn', build: { outDir, emptyOutDir: true } })

const assets = path.join(outDir, 'assets')
const css = fs.readdirSync(assets).filter(f => f.endsWith('.css'))
if (css.length !== 1) throw new Error(`CSS 파일이 하나가 아닙니다: ${css.join(', ')}`)

const target = path.join(root, '.prebuilt', 'index.css')
fs.mkdirSync(path.dirname(target), { recursive: true })
fs.copyFileSync(path.join(assets, css[0]), target)
fs.rmSync(outDir, { recursive: true, force: true })
console.log(`.prebuilt/index.css 갱신 완료 (${(fs.statSync(target).size / 1024).toFixed(1)} KB)`)
