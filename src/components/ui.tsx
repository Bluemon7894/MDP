import React from 'react'

// 게임 화면 공용 UI. 홈 화면의 클레이 버튼·크림 배경 톤을 따르되 장식은 덜어낸다.

type ButtonVariant = 'primary' | 'violet' | 'secondary' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white shadow-[0_5px_0_var(--color-accent-deep)] active:translate-y-[5px] active:shadow-none',
  violet: 'bg-violet text-white shadow-[0_5px_0_var(--color-violet-deep)] active:translate-y-[5px] active:shadow-none',
  secondary: 'bg-white text-ink border-2 border-line shadow-[0_4px_0_var(--color-line)] hover:border-violet/40 active:translate-y-[4px] active:shadow-none',
  ghost: 'text-graphite hover:text-ink',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-11 px-5 text-base',
  md: 'h-14 px-7 text-lg',
  lg: 'h-16 px-10 text-2xl',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 shrink-0 whitespace-nowrap rounded-2xl font-display transition-[transform,box-shadow,border-color,color] duration-75 disabled:opacity-35 disabled:pointer-events-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  )
}

export function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white border-2 border-line rounded-3xl ${className}`}>{children}</div>
}

export function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-sm font-bold text-graphite ${className}`}>{children}</div>
}

export function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-ink/55 p-6 font-ui text-ink animate-fade-up">
      {children}
    </div>
  )
}

export function Screen({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`relative h-full w-full bg-paper font-ui text-ink select-none overflow-hidden ${className}`}>{children}</div>
}

export function BackButton({ onClick, children = '돌아가기' }: { onClick: () => void; children?: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-2 h-11 text-lg font-display text-graphite hover:text-ink transition-colors">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M12.5 4.5L7 10l5.5 5.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {children}
    </button>
  )
}

export function Spinner() {
  return <div className="w-10 h-10 rounded-full border-[3px] border-line border-t-violet animate-spin" />
}

/** 제시어: 한글 뒤에 영어를 괄호로 붙여 동음이의어(배·다리 등)를 구분한다 */
export function KeywordTitle({ ko, en }: { ko: string; en: string }) {
  return (
    <>
      {ko}
      <span className="ml-2 font-ui text-[0.42em] font-bold text-graphite align-middle">({en})</span>
    </>
  )
}
