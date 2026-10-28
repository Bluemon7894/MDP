import { useMemo } from 'react'
import { INK, makeCharcoalDab } from './DrawingPad'

// 게임 화면 옆 "이렇게 그려요" 그림 예시.
// 사진 소묘가 아니라 게임 안 도구(연필 선 + 목탄 붓)로 실제로 그릴 수 있는 수준의 그림을 보여 준다.

// 버섯 외곽선 (100 x 100 좌표)
const CAP = 'M12 50 C12 18, 88 18, 88 50 C70 55, 30 55, 12 50 Z'
const STEM = 'M40 54 C38 68, 36 80, 37 86 C45 90, 55 90, 63 86 C64 80, 62 68, 60 54'
const SPOTS: [number, number, number][] = [[36, 34, 5], [58, 28, 4], [70, 40, 3.5]]

// 목탄으로 문지른 자리 (빛은 왼쪽 위에서): [지나가는 점들, 붓 반지름, 겹쳐 칠한 횟수]
const SHADES: [[number, number][], number, number][] = [
  [[[64, 30], [74, 37], [77, 44], [63, 47], [46, 48]], 5.5, 3], // 갓 오른쪽 아래 그늘
  [[[22, 49], [50, 51], [78, 49]], 3, 2], // 갓 밑면
  [[[53, 59], [54, 71], [55, 83]], 5, 3], // 기둥 오른쪽
  [[[34, 92], [50, 94], [68, 91]], 4.5, 1], // 바닥 그림자
]

let cached = ''
/** 게임과 같은 목탄 붓으로 칠한 버섯 (한 번만 그려서 재사용) */
function humanMushroom() {
  if (cached) return cached
  const SIZE = 360, k = SIZE / 100
  const c = document.createElement('canvas')
  c.width = c.height = SIZE
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, SIZE, SIZE)

  // 목탄: 게임의 '보통' 진하기로 점 찍듯 이어 칠한다
  SHADES.forEach(([pts, r, passes]) => {
    const rp = Math.round(r * k)
    const dab = makeCharcoalDab(rp)
    for (let pass = 0; pass < passes; pass++) {
      ctx.globalAlpha = 0.1
      pts.slice(1).forEach(([x1, y1], i) => {
        const [x0, y0] = pts[i]
        const steps = Math.max(1, Math.ceil((Math.hypot(x1 - x0, y1 - y0) * k) / (rp * 0.3)))
        for (let s = 0; s <= steps; s++) {
          const jx = (Math.random() - 0.5) * 2, jy = (Math.random() - 0.5) * 2
          ctx.drawImage(dab, (x0 + ((x1 - x0) * s) / steps + jx) * k - rp, (y0 + ((y1 - y0) * s) / steps + jy) * k - rp)
        }
      })
    }
  })
  ctx.globalAlpha = 1

  // 연필 외곽선
  ctx.save()
  ctx.scale(k, k)
  ctx.strokeStyle = INK
  ctx.lineWidth = 0.9
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke(new Path2D(CAP))
  ctx.stroke(new Path2D(STEM))
  SPOTS.forEach(([x, y, r]) => {
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.stroke()
  })
  ctx.restore()

  cached = c.toDataURL('image/png')
  return cached
}

function Frame({ step, caption, children }: { step: string; caption: string; children: React.ReactNode }) {
  return (
    <figure className="flex-1 min-w-0">
      <div className="aspect-square rounded-xl border-2 border-line bg-white overflow-hidden flex items-center justify-center">{children}</div>
      <figcaption className="mt-1.5 text-xs font-bold text-graphite flex items-center gap-1.5">
        <span className="w-4 h-4 shrink-0 rounded-full bg-violet text-white text-[10px] inline-flex items-center justify-center">{step}</span>
        <span className="truncate">{caption}</span>
      </figcaption>
    </figure>
  )
}

/** 혼자·대결·AI: 연필로 외곽선 → 목탄으로 명암 */
export function DrawStepsExample() {
  const shaded = useMemo(humanMushroom, [])
  return (
    <div>
      <div className="text-xs font-bold text-graphite mb-2">그림 예시 · 버섯</div>
      <div className="flex items-start gap-2">
        <Frame step="1" caption="연필 외곽선">
          <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
            <g fill="none" stroke={INK} strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round">
              <path d={CAP} />
              <path d={STEM} />
              {SPOTS.map(([x, y, r]) => (
                <circle key={x} cx={x} cy={y} r={r} />
              ))}
            </g>
          </svg>
        </Frame>
        <svg width="16" height="16" viewBox="0 0 20 20" className="mt-[38%] shrink-0 text-graphite" aria-hidden="true">
          <path d="M4 10h11M10.5 5l5 5-5 5" stroke="currentColor" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <Frame step="2" caption="목탄 명암">
          <img src={shaded} alt="목탄으로 명암을 넣은 버섯" className="w-full h-full object-contain" />
        </Frame>
      </div>
    </div>
  )
}

/** 반쪽 협동: 1P 는 왼쪽, 2P 는 오른쪽 반쪽을 그려 가운데서 잇는다 */
export function HalfExample({ myRole }: { myRole: '1P' | '2P' }) {
  const shaded = useMemo(humanMushroom, [])
  const half = (side: 'left' | 'right'): React.CSSProperties => ({
    backgroundImage: `url(${shaded})`,
    backgroundSize: '200% 100%',
    backgroundPosition: `${side} center`,
  })
  const mine = (side: 'left' | 'right') => (side === 'left') === (myRole === '1P')
  return (
    <div>
      <div className="text-xs font-bold text-graphite mb-2">그림 예시 · 버섯</div>
      <div className="relative aspect-square rounded-xl border-2 border-line bg-white overflow-hidden flex">
        {(['left', 'right'] as const).map(side => (
          <div key={side} className={`relative flex-1 ${mine(side) ? '' : 'opacity-45'}`}>
            <div className="absolute inset-0 bg-no-repeat" style={half(side)} />
            <span
              className={`absolute bottom-1.5 ${side === 'left' ? 'left-1.5' : 'right-1.5'} h-5 px-2 rounded-full text-[10px] font-bold inline-flex items-center ${
                mine(side) ? 'bg-violet text-white' : 'bg-line text-graphite'
              }`}
            >
              {side === 'left' ? '1P 왼쪽' : '2P 오른쪽'}
            </span>
          </div>
        ))}
        <div className="absolute inset-y-0 left-1/2 border-l-2 border-dashed border-violet/60" />
      </div>
      <p className="mt-2 text-xs text-graphite leading-relaxed">가운데 점선에서 두 반쪽이 만나 하나의 그림이 됩니다. 진하게 표시된 쪽이 내 담당입니다.</p>
    </div>
  )
}
