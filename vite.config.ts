import { defineConfig, type Plugin, type Connect } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import fs from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'

import { dedupeRankings, generateUniqueId, sanitizeRecords } from './src/utils/rankingCore.ts'
import type { RankItem } from './src/types.ts'

export default defineConfig(({ mode }) => {
  const emitSourcemaps = mode === 'development'
  const rootDir = import.meta.dirname ?? path.resolve('.')
  const prebuiltCss = path.join(rootDir, '.prebuilt', 'index.css')
  const usePrebuiltCss =
    fs.existsSync(prebuiltCss) &&
    (process.env.SKIP_TAILWIND === '1' || (process.platform === 'linux' && (process.arch === 'arm64' || process.arch === 'arm')))

  return {
    base: '/',
    build: {
      sourcemap: emitSourcemaps ? 'inline' : false,
      minify: !emitSourcemaps,
    },
    plugins: [
      react(),
      usePrebuiltCss ? prebuiltCssFallback(prebuiltCss) : tailwindcss(),
      arcadeServer(path.resolve(rootDir, 'data')),
    ],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: parseInt(process.env.PORT || '5199'),
      strictPort: true,
      watch: {
        ignored: [
          '**/data/**',
          '**/candy_dispenser/**',
          '**/.prebuilt/**',
],
      },
    },
    preview: {
      host: '0.0.0.0',
      port: parseInt(process.env.PORT || '5199'),
    },
  }
})

function prebuiltCssFallback(prebuiltFile: string): Plugin {
  return {
    name: 'prebuilt-css-fallback',
    enforce: 'pre',
    load(id) {
      const clean = id.split('?')[0].replace(/\\/g, '/')
      if (clean.endsWith('/src/index.css')) {
        return fs.readFileSync(prebuiltFile, 'utf-8')
      }
      return null
    },
  }
}

/**
 * 아케이드 공용 서버. 랭킹과 두 화면 사이 메시지를 브라우저가 아니라 이 서버에 둬서
 * Chrome 계정·브라우저·기기가 달라도 같은 기록과 같은 게임 진행을 보게 한다.
 * 모든 게임 기록은 history.json 에 그대로 쌓고, 명예의 전당(이름마다 최고 기록 Top 10)은 거기서 뽑는다.
 *  - GET    /api/rankings          명예의 전당
 *  - POST   /api/rankings          게임 기록 추가
 *  - POST   /api/rankings/import   예전 브라우저 저장 기록 합치기
 *  - DELETE /api/rankings/:id      명예의 전당에서 삭제 = 그 이름의 기록 전부 삭제
 *  - GET    /api/records           모든 게임 기록 (최신순)
 *  - PATCH  /api/records/:id       기록 이름 고치기 { name }
 *  - DELETE /api/records/:id       기록 한 건 삭제
 *  - DELETE /api/records           모든 기록 삭제 (본문 { confirm: '전체 삭제' } 필요)
 *  - GET    /api/gallery           사람들이 그린 최근 그림 (홈 화면에 무작위로 띄운다)
 *  - POST   /api/gallery           라운드 그림 한 장 추가 (최근 GALLERY_MAX 장만 보관)
 *  - ws 'arcade:msg'               화면 사이 게임 메시지 중계 (dev 서버)
 *  - ws 'arcade:rankings'          기록이 바뀌면 모든 화면에 명예의 전당을 알림 (dev 서버)
 */
function arcadeServer(dataDir: string): Plugin {
  const legacyFile = path.join(dataDir, 'rankings.json')
  const historyFile = path.join(dataDir, 'history.json')
  const galleryFile = path.join(dataDir, 'gallery.json')
  const GALLERY_MAX = 120
  const HISTORY_MAX = 3000

  const readJson = (f: string): unknown => {
    try {
      return JSON.parse(fs.readFileSync(f, 'utf-8'))
    } catch {
      return null
    }
  }
  // 모든 게임 기록. 처음에는 예전 명예의 전당 파일로 채운다
  const readHistory = () => {
    if (!fs.existsSync(historyFile)) return sanitizeRecords(readJson(legacyFile))
    return sanitizeRecords(readJson(historyFile))
  }
  const writeHistory = (list: ReturnType<typeof readHistory>) => {
    fs.mkdirSync(dataDir, { recursive: true })
    fs.writeFileSync(historyFile, JSON.stringify(list.slice(0, HISTORY_MAX)), 'utf-8')
  }
  const readGallery = (): unknown[] => {
    const list = readJson(galleryFile)
    return Array.isArray(list) ? list : []
  }
  const readBody = (req: IncomingMessage) =>
    new Promise<unknown>((resolve, reject) => {
      let raw = ''
      req.setEncoding('utf-8')
      req.on('data', chunk => {
        raw += chunk
        if (raw.length > 2_000_000) req.destroy()
      })
      req.on('end', () => {
        try {
          resolve(raw ? JSON.parse(raw) : null)
        } catch (e) {
          reject(e)
        }
      })
      req.on('error', reject)
    })
  const writeGallery = (list: unknown[]) => {
    fs.mkdirSync(dataDir, { recursive: true })
    fs.writeFileSync(galleryFile, JSON.stringify(list), 'utf-8')
  }
  const galleryName = (it: unknown) => String((it as { name?: string })?.name ?? '')
  // 홈 화면 그림은 기록이 남아 있는 이름의 것만 둔다 (랭킹·전체 기록에서 지우면 그림도 사라지게)
  const pruneGallery = (history: RankItem[]) => {
    const names = new Set(history.map(h => nameKey(h.name)))
    const list = readGallery()
    const kept = list.filter(it => names.has(nameKey(galleryName(it))))
    if (kept.length !== list.length) writeGallery(kept)
  }
  const renameGallery = (from: string, to: string) => {
    writeGallery(readGallery().map(it => (nameKey(galleryName(it)) === nameKey(from) ? { ...(it as object), name: to } : it)))
  }
  const sendJson = (res: ServerResponse, status: number, body: unknown) => {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    res.end(JSON.stringify(body))
  }
  const nameKey = (n: string) => n.trim().toLowerCase()

  const api = (onChange: (rankings: RankItem[]) => void): Connect.NextHandleFunction =>
    async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
      const url = (req.url || '').split('?')[0]
      const isRankings = url.startsWith('/api/rankings')
      const isRecords = url.startsWith('/api/records')
      if (!isRankings && !isRecords) return next()
      const send = (status: number, body: unknown) => sendJson(res, status, body)
      try {
        if (req.method === 'GET' && url === '/api/rankings') return send(200, dedupeRankings(readHistory()))
        if (req.method === 'GET' && url === '/api/records') return send(200, readHistory())
        // 본문을 다 받은 뒤에 파일을 읽어야 동시에 들어온 요청끼리 덮어쓰지 않는다
        const body = req.method === 'POST' || req.method === 'PATCH' || req.method === 'DELETE' ? await readBody(req) : null
        let history = readHistory()
        const rec = (body ?? {}) as Record<string, unknown>

        if (req.method === 'POST' && url === '/api/rankings') {
          if (typeof rec.name !== 'string' || isNaN(Number(rec.score))) return send(400, { error: 'name, score 필요' })
          history = [
            {
              id: generateUniqueId(),
              // 이름 길이는 화면에서 제한하지 않는다. 저장 파일 보호용 상한만 둔다 (협동 팀 이름은 두 이름을 합친다)
              name: rec.name.slice(0, 60),
              score: Number(rec.score),
              mode: rec.mode === 'solo' || rec.mode === 'pvp' || rec.mode === 'ai' || rec.mode === 'coop' ? rec.mode : undefined,
              drawing: typeof rec.drawing === 'string' && rec.drawing.startsWith('data:image/') ? rec.drawing : undefined,
              keyword: typeof rec.keyword === 'string' ? rec.keyword.slice(0, 30) : undefined,
              at: Date.now(),
            },
            ...history,
          ]
        } else if (req.method === 'POST' && url === '/api/rankings/import') {
          const have = new Set(history.map(h => h.id))
          history = sanitizeRecords([...history, ...sanitizeRecords(body).filter(r => !have.has(r.id))])
        } else if (req.method === 'DELETE' && url.startsWith('/api/rankings/')) {
          // 명예의 전당에서 지우면 그 사람이 다시 다른 기록으로 올라오지 않게 이름 단위로 지운다
          const id = decodeURIComponent(url.slice('/api/rankings/'.length))
          const target = history.find(h => h.id === id)
          if (target) history = history.filter(h => nameKey(h.name) !== nameKey(target.name))
        } else if (req.method === 'PATCH' && url.startsWith('/api/records/')) {
          const id = decodeURIComponent(url.slice('/api/records/'.length))
          if (typeof rec.name !== 'string' || !rec.name.trim()) return send(400, { error: 'name 필요' })
          const target = history.find(h => h.id === id)
          const newName = (rec.name as string).trim().slice(0, 60)
          history = history.map(h => (h.id === id ? { ...h, name: newName } : h))
          // 그 이름의 기록이 더는 없으면 홈 화면 그림의 이름도 같이 바꾼다
          if (target && !history.some(h => nameKey(h.name) === nameKey(target.name))) renameGallery(target.name, newName)
        } else if (req.method === 'DELETE' && url.startsWith('/api/records/')) {
          const id = decodeURIComponent(url.slice('/api/records/'.length))
          history = history.filter(h => h.id !== id)
        } else if (req.method === 'DELETE' && url === '/api/records') {
          if (rec.confirm !== '전체 삭제') return send(400, { error: "본문에 { confirm: '전체 삭제' } 가 필요합니다" })
          history = []
        } else {
          return send(404, { error: 'not found' })
        }
        writeHistory(history)
        // 지울 때만 정리한다 (게임이 끝날 때는 그림이 기록보다 먼저 도착할 수 있다)
        if (req.method === 'DELETE') pruneGallery(history)
        const rankings = dedupeRankings(history)
        onChange(rankings)
        return send(200, isRecords ? { records: history, rankings } : rankings)
      } catch (e) {
        return send(500, { error: String(e) })
      }
    }

  const gallery: Connect.NextHandleFunction = async (req, res, next) => {
    const url = (req.url || '').split('?')[0]
    if (url !== '/api/gallery') return next()
    const send = (status: number, body: unknown) => {
      res.statusCode = status
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      res.end(JSON.stringify(body))
    }
    try {
      if (req.method === 'GET') return send(200, readGallery())
      if (req.method !== 'POST') return send(404, { error: 'not found' })
      const rec = (await readBody(req)) as Record<string, unknown> | null
      const drawing = rec?.drawing
      if (typeof drawing !== 'string' || !drawing.startsWith('data:image/') || drawing.length > 400_000) return send(400, { error: 'drawing 필요' })
      const item = {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        drawing,
        keyword: typeof rec!.keyword === 'string' ? rec!.keyword.slice(0, 30) : '',
        name: typeof rec!.name === 'string' ? rec!.name.slice(0, 60) : '',
        score: Number(rec!.score) || 0,
        at: Date.now(),
      }
      const list = [item, ...readGallery()].slice(0, GALLERY_MAX)
      fs.mkdirSync(dataDir, { recursive: true })
      fs.writeFileSync(galleryFile, JSON.stringify(list), 'utf-8')
      return send(200, { ok: true })
    } catch (e) {
      return send(500, { error: String(e) })
    }
  }

  return {
    name: 'arcade-server',
    configureServer(server) {
      server.middlewares.use(api(list => server.ws.send('arcade:rankings', list)))
      server.middlewares.use(gallery)
      server.ws.on('arcade:msg', data => server.ws.send('arcade:msg', data))
    },
    configurePreviewServer(server) {
      server.middlewares.use(api(() => {}))
      server.middlewares.use(gallery)
    },
  }
}
