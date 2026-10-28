import { defineConfig, type HtmlTagDescriptor, type Plugin, type Connect } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import fs from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'

import siteConfiguration from './.figma/make/site.json'
import { dedupeRankings, generateUniqueId, sanitizeRecords } from './src/utils/rankingCore'
import type { RankItem } from './src/types'


// Vite config — https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // .figma/make/deploy-preview passes `--mode development` for cached-preview builds.
  const emitSourcemaps = mode === 'development'

  return {
    base: process.env.FIGMA_PUBLIC_URL ? `${process.env.FIGMA_PUBLIC_URL}/` : '/',
    build: {
      sourcemap: emitSourcemaps ? 'inline' : false,
      minify: !emitSourcemaps,
    },
    plugins: [
react(),
      tailwindcss(),
      figmaSiteConfiguration(siteConfiguration),
      figmaErrorOverlayReplay(),
      figmaReactRefreshBoundaryFallback(),
      figmaMakeKitPlugin({ storiesGlob: '/src/**/*.stories.{ts,tsx,js,jsx}' }),
      arcadeServer(path.resolve(__dirname, 'data')),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: process.env.FIGMA_DEV_SERVER_HOST || '0.0.0.0',
      port: parseInt(process.env.PORT || '8443'),
      strictPort: true,
      watch: {
        ignored: [
          '**/.figma/**',
          '**/data/**',
],
      },
    },
    preview: {
      host: process.env.FIGMA_DEV_SERVER_HOST || '0.0.0.0',
      port: parseInt(process.env.PORT || '8443'),
    },
  }
})

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

type FigmaSiteConfiguration = {
  title?: string
  description?: string
  language?: string
  robots?: {
    index?: boolean
  }
  icons?: {
    icon?: string
  }
  openGraph?: {
    image?: string
  }
  analytics?: {
    googleAnalyticsId?: string
  }
  customScripts?: {
    headStart?: string
    headEnd?: string
    bodyStart?: string
    bodyEnd?: string
  }
  accessibility?: {
    addBypassLinks?: boolean
  }
}

/** Applies /.figma/make/site.json to the generated document shell. */
function figmaSiteConfiguration(config: FigmaSiteConfiguration): Plugin {
  function sanitizeHtmlValue(value: string | undefined): string {
    return value?.replace(/[^a-zA-Z0-9_-]/g, '') || ''
  }
  function escapeHtmlText(value: string): string {
    return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }
  function replaceHtmlCommentSlot(html: string, slotName: string, content: string): string {
    return html.replace(`<!-- ${slotName} -->`, content)
  }

  const title = config.title ?? "cat.io"
  const description = config.description ?? ''
  const favicon = config.icons?.icon ?? ''
  const socialImage = config.openGraph?.image ?? ''
  const language = sanitizeHtmlValue(config.language) || 'en'
  const googleAnalyticsId = sanitizeHtmlValue(config.analytics?.googleAnalyticsId)
  const headStart = config.customScripts?.headStart ?? ''
  const headEnd = config.customScripts?.headEnd ?? ''
  const bodyStart = config.customScripts?.bodyStart ?? ''
  const bodyEnd = config.customScripts?.bodyEnd ?? ''
  const robotsTxt = config.robots?.index === false ? 'User-agent: *\nDisallow: /\n' : ''

  return {
    name: 'figma-site-configuration',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!robotsTxt || req.url?.split('?')[0] !== '/robots.txt') return next()

        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.end(robotsTxt)
      })
    },
    generateBundle() {
      if (!robotsTxt) return

      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: robotsTxt,
      })
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        let result = html
        result = replaceHtmlCommentSlot(result, 'figma:lang', language)
        result = replaceHtmlCommentSlot(result, 'figma:title', escapeHtmlText(title))
        result = replaceHtmlCommentSlot(result, 'figma:head-start', headStart)
        result = replaceHtmlCommentSlot(result, 'figma:head-end', headEnd)
        result = replaceHtmlCommentSlot(result, 'figma:body-start', bodyStart)
        result = replaceHtmlCommentSlot(result, 'figma:body-end', bodyEnd)

        const tags: HtmlTagDescriptor[] = []
        if (description) {
          tags.push({ tag: 'meta', attrs: { name: 'description', content: description }, injectTo: 'head' })
        }
        if (config.robots?.index === false) {
          tags.push({ tag: 'meta', attrs: { name: 'robots', content: 'noindex, nofollow' }, injectTo: 'head' })
        }
        if (favicon) {
          tags.push({ tag: 'link', attrs: { rel: 'icon', href: favicon }, injectTo: 'head' })
        }
        if (title) {
          tags.push({ tag: 'meta', attrs: { property: 'og:title', content: title }, injectTo: 'head' })
        }
        if (description) {
          tags.push({ tag: 'meta', attrs: { property: 'og:description', content: description }, injectTo: 'head' })
        }
        if (socialImage) {
          tags.push(
            { tag: 'meta', attrs: { property: 'og:image', content: socialImage }, injectTo: 'head' },
            { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' }, injectTo: 'head' },
            { tag: 'meta', attrs: { name: 'twitter:image', content: socialImage }, injectTo: 'head' },
          )
        }

        if (googleAnalyticsId) {
          tags.push(
            {
              tag: 'script',
              attrs: {
                async: true,
                src: `https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`,
              },
              injectTo: 'head',
            },
            {
              tag: 'script',
              children: `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', ${JSON.stringify(googleAnalyticsId)});
`,
              injectTo: 'head',
            },
          )
        }

        if (config.accessibility?.addBypassLinks) {
          tags.push(
            {
              tag: 'style',
              children: `
  .figma-bypass-link {
    position: fixed;
    top: 8px;
    left: 8px;
    z-index: 2147483647;
    transform: translateY(-150%);
    border-radius: 6px;
    background: #111827;
    color: #fff;
    padding: 8px 12px;
    font: 600 14px/1.2 system-ui, sans-serif;
    text-decoration: none;
  }
  .figma-bypass-link:focus {
    transform: translateY(0);
  }
`,
              injectTo: 'head',
            },
            {
              tag: 'a',
              attrs: { class: 'figma-bypass-link', href: '#root' },
              children: 'Skip to content',
              injectTo: 'body-prepend',
            },
          )
        }

        return {
          html: result,
          tags,
        }
      },
    },
  }
}

/**
 * Replay the most recent build error to clients that connect after
 * it was first broadcast. Vite buffers an error payload only while
 * no clients are connected and clears the buffer on the first
 * reconnect (see `bufferedMessage` in `createWebSocketServer`), so
 * if the preview iframe reloads after Vite already delivered an
 * error to a live socket, the new socket misses the payload and
 * the overlay stays hidden even though the build is still broken.
 * We intercept `ws.send` to remember the latest error and replay
 * it on every new connection; the cache clears on a successful
 * `update` or `full-reload` so a stale overlay can't survive a
 * fixed build.
 */
function figmaErrorOverlayReplay(): Plugin {
  return {
    name: 'figma-error-overlay-replay',
    apply: 'serve',
    configureServer(server) {
      let lastError: object | null = null

      const origSend = server.ws.send.bind(server.ws) as (...args: any[]) => void
      server.ws.send = ((...args: any[]) => {
        const payload = args[0]
        if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
          const type = (payload as { type?: string }).type
          if (type === 'error') {
            lastError = payload as object
          } else if (type === 'update' || type === 'full-reload') {
            lastError = null
          }
        }
        return origSend(...args)
      }) as typeof server.ws.send

      server.ws.on('connection', (socket) => {
        if (lastError !== null) {
          socket.send(JSON.stringify(lastError))
        }
      })
    },
  }
}

/**
 * Reload when a module that previously defined a React Refresh boundary stops
 * defining one. This happens when an agent moves a component into a new file
 * and replaces the old module with a re-export:
 *
 *   export { default } from './app/App'
 *
 * Vite otherwise accepts the update using the previous module's HMR boundary,
 * but the re-export-only transform no longer registers a replacement for the
 * mounted component family. React reports a successful refresh while leaving
 * the old tree mounted until the page is reloaded.
 */
function figmaReactRefreshBoundaryFallback(): Plugin {
  const hadRefreshBoundary = new Map<string, boolean>()
  let sendFullReload: (() => void) | null = null

  return {
    name: 'figma-react-refresh-boundary-fallback',
    apply: 'serve',
    enforce: 'post',
    configureServer(server) {
      sendFullReload = () => server.ws.send({ type: 'full-reload', path: '*' })
    },
    transform(code, id) {
      if (!/\.[jt]sx?(?:\?|$)/.test(id) || id.includes('/node_modules/')) return null

      const moduleId = id.split('?')[0] ?? id
      const hasRefreshBoundary = code.includes('registerExportsForReactRefresh')
      const previousHadRefreshBoundary = hadRefreshBoundary.get(moduleId)
      hadRefreshBoundary.set(moduleId, hasRefreshBoundary)

      if (previousHadRefreshBoundary && !hasRefreshBoundary) {
        queueMicrotask(() => sendFullReload?.())
      }

      return null
    },
  }
}

/**
 * Serves a blank render-target page at /.figma/make/kit.html that
 * the Figma preview script drives directly. The page exposes a
 * registry of every file matching `storiesGlob` on
 * window.__FIGMA__.stories so the design surface can dynamically
 * import + mount each entry into its own grid view.
 *
 * Dev-only: `apply: 'serve'` gates the plugin to `vite dev`. Prod
 * builds (`vite build`) skip it entirely so the route doesn't leak
 * into shipped bundles.
 */
function figmaMakeKitPlugin(options: { storiesGlob: string | string[] }): Plugin {
  const storiesGlob = Array.isArray(options.storiesGlob) ? options.storiesGlob : [options.storiesGlob]
  const ROUTE = '/.figma/make/kit.html'
  const VIRTUAL_ID = 'virtual:figma-stories'
  const RESOLVED_ID = '\0' + VIRTUAL_ID
  const STORIES_MODULE = `export const stories = import.meta.glob(${JSON.stringify(storiesGlob)})`
  const HTML_BOOTSTRAP = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body>
<div id="figma-make-kit-root"></div>
<script type="module">
  import { stories } from 'virtual:figma-stories'
  window.__FIGMA__ = Object.assign(window.__FIGMA__ ?? {}, { stories })
  window.dispatchEvent(new CustomEvent('figma.ready'))
</script>
</body>
</html>`

  return {
    name: 'figma-make-kit',
    apply: 'serve',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID
      return null
    },
    load(id) {
      if (id !== RESOLVED_ID) return null
      return STORIES_MODULE
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || ''
        if (url.split('?')[0] !== ROUTE) return next()

        try {
          res.setHeader('Content-Type', 'text/html')
          res.end(await server.transformIndexHtml(url, HTML_BOOTSTRAP))
        } catch (err) {
          next(err as Error)
        }
      })
    },
  }
}
