import { useState } from 'react'
import { ArcadeBackground } from './CommonUI'
import { BackButton, Button, Overlay, Panel } from './ui'

const MODES = [
  {
    key: '1p',
    no: '01',
    title: '혼자 하기',
    meta: '1명 · 10라운드',
    desc: '제시어 10개를 20초씩 그려 AI 판정을 받습니다. 최종 점수가 랭킹에 오릅니다.',
  },
  {
    key: '2p',
    no: '02',
    title: '둘이 대결',
    meta: '2명 · 10라운드',
    desc: '두 화면에서 같은 제시어를 동시에 그립니다. 라운드마다 각자 채점되고 누적 점수가 높은 사람이 이깁니다.',
  },
  {
    key: 'coop',
    no: '03',
    title: '반쪽 협동',
    meta: '2명 · 10라운드',
    desc: '같은 제시어를 왼쪽 반, 오른쪽 반으로 나눠 동시에 그립니다. 서로의 그림은 마지막에 합쳐서 공개됩니다.',
  },
  {
    key: 'ai',
    no: '04',
    title: 'AI와 대결',
    meta: '나 vs AI · 각 10라운드',
    desc: 'AI도 같은 제시어를 연필 소묘로 그리고 같은 기준으로 채점됩니다. 내 점수만 랭킹에 오릅니다.',
  },
] as const

export function ModeModal({
  onClose,
  on1P,
  on2P,
  onVsAI,
  onCoop,
}: {
  onClose: () => void
  on1P: () => void
  on2P: () => void
  onVsAI: () => void
  onCoop: () => void
}) {
  // AI와 대결은 바로 시작하지 않고 하드 모드 경고를 한 번 보여 준다
  const [warnHard, setWarnHard] = useState(false)
  const handlers = { '1p': on1P, '2p': on2P, ai: () => setWarnHard(true), coop: onCoop }
  return (
    <div className="absolute inset-0 z-30 flex flex-col font-ui text-ink select-none overflow-hidden">
      <ArcadeBackground />
      {warnHard && (
        <Overlay>
          <Panel className="w-[560px] p-10">
            <span className="inline-flex items-center h-8 px-3 rounded-full bg-accent text-white text-sm font-bold">하드 모드</span>
            <h3 className="font-display text-4xl mt-4">AI를 이기기는 매우 어렵습니다</h3>
            <ul className="mt-5 flex flex-col gap-2.5 text-graphite leading-relaxed">
              <li>AI는 실제 사진을 옮긴 듯한 연필 소묘를 8~13초 만에 그립니다.</li>
              <li>사람과 같은 기준으로 채점되며, 보통 한 라운드에 800점 넘게 받습니다.</li>
              <li>이기려면 AI가 1순위로 알아볼 형태, 꽉 찬 명암, 빠른 완성을 모두 해내야 합니다.</li>
            </ul>
            <div className="flex gap-3 mt-8 justify-end">
              <Button variant="secondary" onClick={() => setWarnHard(false)}>다른 모드 고르기</Button>
              <Button onClick={onVsAI}>도전하기</Button>
            </div>
          </Panel>
        </Overlay>
      )}
      <header className="relative px-14 pt-10">
        <BackButton onClick={onClose}>처음으로</BackButton>
      </header>
      <main className="relative flex-1 flex flex-col justify-center w-full max-w-7xl mx-auto px-14 pb-16">
        <h1 className="font-display text-6xl">어떻게 플레이할까요?</h1>
        <div className="grid grid-cols-4 gap-6 mt-12">
          {MODES.map(m => {
            const dark = m.key === 'ai'
            return (
              <button
                key={m.key}
                type="button"
                onClick={handlers[m.key]}
                className={`group text-left rounded-3xl p-7 flex flex-col min-h-[340px] border-2 transition-transform hover:-translate-y-1 ${
                  dark
                    ? 'bg-ink text-white border-ink shadow-[0_8px_0_#170c26]'
                    : 'bg-white border-line shadow-[0_8px_0_var(--color-line)]'
                }`}
              >
                <span className="flex items-center justify-between">
                  <span className={`font-display text-xl tabular-nums ${dark ? 'text-accent' : 'text-violet'}`}>{m.no}</span>
                  {dark && <span className="h-7 px-3 inline-flex items-center rounded-full bg-accent text-white text-sm font-bold">하드 모드</span>}
                </span>
                <span className="font-display text-4xl mt-8">{m.title}</span>
                <span className={`mt-4 text-base leading-relaxed ${dark ? 'text-white/70' : 'text-graphite'}`}>{m.desc}</span>
                <span className={`mt-auto pt-8 flex items-center justify-between font-display text-lg ${dark ? 'text-white/80' : 'text-ink'}`}>
                  {m.meta}
                  <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="transition-transform group-hover:translate-x-1">
                    <path d="M4 10h11M10.5 5l5 5-5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>
            )
          })}
        </div>
      </main>
    </div>
  )
}

export function CountdownOverlay({ count }: { count: number }) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-ink text-white font-ui select-none">
      <div className="text-xl font-bold text-white/50">{count > 0 ? '곧 시작합니다' : '시작'}</div>
      <div key={count} className="font-display text-[13rem] leading-none mt-4 animate-fade-up tabular-nums">
        {count > 0 ? count : 'GO'}
      </div>
    </div>
  )
}

// 라운드 결과 창은 ResultModal.tsx (심사 연출 포함)
export { AdvancedAnalysisModal } from './ResultModal'
