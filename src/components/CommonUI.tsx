import React, { useState } from 'react'
import { BtnColor, CustomModalState } from '../types'
import { Button, Overlay, Panel } from './ui'
import { SketchbookBackground } from './SketchbookBackground'

const BTNS: Record<BtnColor, { bg: string; sh: string; tx: string; inset: string }> = {
  coral:  { bg: '#FF6B6B', sh: '#D93838', tx: '#FFFFFF', inset: 'rgba(255,255,255,0.4)' },
  mint:   { bg: '#20C997', sh: '#0CA678', tx: '#FFFFFF', inset: 'rgba(255,255,255,0.4)' },
  yellow: { bg: '#FFD43B', sh: '#E67700', tx: '#495057', inset: 'rgba(255,255,255,0.6)' },
  sky:    { bg: '#339AF0', sh: '#1C7ED6', tx: '#FFFFFF', inset: 'rgba(255,255,255,0.4)' },
  purple: { bg: '#845EF7', sh: '#5F3DC4', tx: '#FFFFFF', inset: 'rgba(255,255,255,0.4)' },
}

export function ClayBtn({
  children, color = 'coral', onClick, pulse = false, size = 'md', className = '',
}: { children: React.ReactNode; color?: BtnColor; onClick?: () => void; pulse?: boolean; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const [pressed, setPressed] = useState(false)
  const c = BTNS[color]
  const pad: Record<string, string> = {
    xs: 'px-4 py-2 text-sm', sm: 'px-6 py-3 text-base', md: 'px-8 py-4 text-xl', lg: 'px-12 py-5 text-2xl', xl: 'px-16 py-6 text-3xl',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      className={`rounded-[2rem] font-black tracking-wide select-none transition-all duration-100 ${pulse ? 'animate-pulse' : ''} ${pad[size]} ${className}`}
      style={{
        background: c.bg, color: c.tx, fontFamily: 'Jua, sans-serif',
        boxShadow: pressed ? `0 0 0 transparent, inset 0 6px 12px rgba(0,0,0,0.15)` : `0 10px 0 ${c.sh}, 0 20px 25px rgba(0,0,0,0.15), inset 0 5px 0 ${c.inset}`,
        transform: pressed ? 'translateY(10px)' : 'none',
      }}
    >
      {children}
    </button>
  )
}

// 홈·모드 선택·이름 입력·랭킹 화면 공통 배경: 낙서가 그려지는 스케치북
export function ArcadeBackground() {
  return <SketchbookBackground />
}

// 홈 로고: 다른 화면과 같은 납작한 면 + 잉크 선 + 아래로 떨어지는 단색 그림자
export function ArcadePaletteArt() {
  const INK = '#2B1A40'
  const PALETTE = 'M 100 25 C 145 25 180 55 175 105 C 170 145 135 175 95 175 C 65 175 35 155 30 125 C 25 90 55 25 100 25 Z'
  return (
    <div className="relative w-52 h-52 flex items-center justify-center">
      <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible" aria-hidden="true">
        {/* 단색 그림자 */}
        <path d={PALETTE} fill="#ECE4F2" transform="translate(0 9)" />
        <path d={PALETTE} fill="#FFFFFF" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <ellipse cx="65" cy="120" rx="13" ry="17" fill="#FDF9F1" stroke={INK} strokeWidth="4" />

        <circle cx="95" cy="57" r="13" fill="#FF6B6B" stroke={INK} strokeWidth="4" />
        <circle cx="134" cy="72" r="12" fill="#FFD43B" stroke={INK} strokeWidth="4" />
        <circle cx="149" cy="111" r="12" fill="#12B886" stroke={INK} strokeWidth="4" />
        <circle cx="124" cy="145" r="11" fill="#845EF7" stroke={INK} strokeWidth="4" />

        {/* 연필 */}
        <g transform="rotate(32 100 100)">
          <rect x="93" y="22" width="14" height="104" rx="3" fill="#FFD43B" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          <rect x="93" y="22" width="14" height="16" rx="3" fill="#FF8787" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          <path d="M 93 126 L 100 150 L 107 126 Z" fill="#F4E3C8" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
          <path d="M 97.6 142 L 100 150 L 102.4 142 Z" fill={INK} />
        </g>
      </svg>
    </div>
  )
}

export function CustomAlertModal({ modal, onClose }: { modal: CustomModalState; onClose: () => void }) {
  if (!modal.isOpen) return null

  return (
    <Overlay>
      <Panel className="p-10 w-[480px] text-center">
        <h3 className="font-display text-3xl">{modal.title}</h3>
        <p className="mt-4 text-lg text-graphite whitespace-pre-line leading-relaxed">{modal.message}</p>
        <div className="flex gap-3 mt-8 justify-center">
          {modal.type === 'confirm' && (
            <Button
              variant="secondary"
              onClick={() => {
                modal.onCancel?.()
                onClose()
              }}
            >
              취소
            </Button>
          )}
          <Button
            onClick={() => {
              modal.onConfirm?.()
              onClose()
            }}
          >
            확인
          </Button>
        </div>
      </Panel>
    </Overlay>
  )
}
