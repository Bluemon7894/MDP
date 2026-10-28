import { useState, useEffect, useRef } from 'react'
import { ScreenTarget, CabAState, CabBState, ActivePlayer, RankItem, KeywordMap, CustomModalState, BestDrawing, GameMode } from './types'
import { pickRandomKeywords } from './constants/quickdraw'
import { getCachedRankings, fetchRankings, submitRanking, deleteRanking } from './utils/storage'
import { bestScoreIn } from './utils/rankingCore'
import { GalleryItem, postGallery } from './utils/gallery'
import { postArcade, onArcade, onRankingsChanged, ArcadeMessage } from './utils/arcadeSync'

import { CustomAlertModal, ArcadeBackground } from './components/CommonUI'
import { HangulKeyboard } from './components/HangulKeyboard'
import { ModeModal, CountdownOverlay } from './components/Modals'
import { ScreenIdle } from './components/ScreenIdle'
import { ScreenGame } from './components/ScreenGame'
import { ScreenHalf } from './components/ScreenHalf'
import { ScreenPractice } from './components/ScreenPractice'
import ScreenLeaderboard from './components/ScreenLeaderboard'
import { BackButton, Screen, Spinner } from './components/ui'

const AI_NAME = 'AI'
const TOTAL_ROUNDS = 10

export default function App() {
  const getScreenMode = (): ScreenTarget => {
    if (typeof window === 'undefined') return 'a'
    const scr = new URLSearchParams(window.location.search).get('screen')
    if (scr === 'b') return 'b'
    if (scr === 'both') return 'both'
    return 'a'
  }

  const [screenMode, setScreenMode] = useState<ScreenTarget>(getScreenMode)
  const [cabA, setCabA] = useState<CabAState>('idle')
  const [cabB, setCabB] = useState<CabBState>('leaderboard')

  const [isTwoPlayer, setIsTwoPlayer] = useState(false)
  const [isVsAi, setIsVsAi] = useState(false)
  const [isCoop, setIsCoop] = useState(false)
  const [p1Name, setP1Name] = useState('1P')
  const [p2Name, setP2Name] = useState('2P')
  const [activePlayer, setActivePlayer] = useState<ActivePlayer>('1P')
  const [round, setRound] = useState(1)
  const [timeLeft, setTimeLeft] = useState(20)

  const [p1Score, setP1Score] = useState(0)
  const [p2Score, setP2Score] = useState(0)

  const [rankings, setRankings] = useState<RankItem[]>(getCachedRankings)
  const [gameKeywords, setGameKeywords] = useState<KeywordMap[]>(() => pickRandomKeywords(10))
  const [countdown, setCountdown] = useState<number | null>(null)

  const [customModal, setCustomModal] = useState<CustomModalState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert',
  })

  const gameFinishedRef = useRef(false)
  // 게임 중 플레이어별로 가장 점수가 높았던 그림 (랭킹 카드에 띄운다)
  const bestRef = useRef<Record<ActivePlayer, BestDrawing | null>>({ '1P': null, '2P': null })

  // 둘이 대결(동시 플레이): 이번 라운드를 끝낸 사람, 라운드별 점수 (같은 결과가 두 번 와도 한 번만 더해지게)
  const isPvp = isTwoPlayer && !isVsAi && !isCoop
  const [doneRoles, setDoneRoles] = useState<ActivePlayer[]>([])
  const pvpLogRef = useRef<Record<ActivePlayer, Record<number, number>>>({ '1P': {}, '2P': {} })
  const advancedRoundRef = useRef(0)
  const roundRef = useRef(round)
  roundRef.current = round
  const pvpTotal = (p: ActivePlayer) => Object.values(pvpLogRef.current[p]).reduce((a, b) => a + b, 0)
  const resetPvp = () => {
    pvpLogRef.current = { '1P': {}, '2P': {} }
    advancedRoundRef.current = 0
    setDoneRoles([])
  }

  // 홈 화면 갤러리에 올릴 이번 게임 그림. 게임을 끝까지 마쳤을 때만 올리고, 중간에 나가면 버린다
  const pendingGalleryRef = useRef<Omit<GalleryItem, 'id'>[]>([])
  const flushGallery = () => {
    pendingGalleryRef.current.forEach(postGallery)
    pendingGalleryRef.current = []
  }

  const recordBest = (player: ActivePlayer, best: BestDrawing) => {
    const cur = bestRef.current[player]
    if (best.drawing && (!cur || best.score > cur.score)) bestRef.current[player] = best
  }

  // 동시 대결: 한 사람이 라운드를 끝냈다 (내 화면이든 상대 화면이든)
  const applyPvpDone = (player: ActivePlayer, doneRound: number, score: number, best: BestDrawing | null) => {
    pvpLogRef.current[player][doneRound] = score
    if (best) recordBest(player, best)
    setP1Score(pvpTotal('1P'))
    setP2Score(pvpTotal('2P'))
    if (doneRound === roundRef.current) setDoneRoles(prev => (prev.includes(player) ? prev : [...prev, player]))
  }
  const applyPvpDoneRef = useRef(applyPvpDone)
  applyPvpDoneRef.current = applyPvpDone
  const isPlayingGame = cabA === 'inGame' || cabB === 'inGame'

  useEffect(() => {
    const handlePopState = () => setScreenMode(getScreenMode())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // 화면 사이 메시지 (서버 중계라 Chrome 계정·브라우저가 달라도 이어진다)
  useEffect(() => {
    const handleMessage = ({ type, payload }: ArcadeMessage) => {
      if (type === 'REQUEST_2P_MODE') {
        setIsTwoPlayer(true)
        setIsVsAi(false)
        setIsCoop(!!payload.coop)
        setCabA('waiting2P')
        setCabB('nickname2P')
        setGameKeywords(payload.keywords)
        setP1Name(payload.p1Name)
        gameFinishedRef.current = false
      } else if (type === 'P2_READY_TRIGGER') {
        setP2Name(payload.p2Name)
        startSimultaneousCountdown()
      } else if (type === 'START_GAME_NOW') {
        setCabA('inGame')
        setCabB(payload.isTwoPlayer ? 'inGame' : 'leaderboard')
        setCountdown(null)
        setRound(1)
        setTimeLeft(20)
        setP1Score(0)
        setP2Score(0)
        setActivePlayer('1P')
        bestRef.current = { '1P': null, '2P': null }
        resetPvp()
        pendingGalleryRef.current = []
        gameFinishedRef.current = false
      } else if (type === 'NEXT_TURN') {
        setActivePlayer(payload.nextPlayer)
        setRound(payload.nextRound)
        setTimeLeft(20)
        setDoneRoles([])
      } else if (type === 'PVP_ROUND_DONE') {
        applyPvpDoneRef.current(payload.player, payload.round, payload.score, payload.best)
      } else if (type === 'UPDATE_SCORES') {
        setP1Score(payload.p1Score)
        setP2Score(payload.p2Score)
        if (payload.best) recordBest(payload.player, payload.best)
      } else if (type === 'UPDATE_RANKINGS') {
        setRankings(payload.rankings)
      } else if (type === 'GAME_RESULT') {
        // 마지막 라운드를 마친 화면이 보낸 결과를 이 화면에도 띄운다 (이 화면에서 그린 그림도 이제 갤러리에 올린다)
        gameFinishedRef.current = true
        flushGallery()
        setCustomModal({ isOpen: true, type: 'alert', title: payload.title, message: payload.message, onConfirm: () => home() })
      } else if (type === 'GOTO_HOME') {
        pendingGalleryRef.current = []
        setCabA('idle')
        setCabB('leaderboard')
        setIsTwoPlayer(false)
        setIsVsAi(false)
        setIsCoop(false)
        setCountdown(null)
        setCustomModal({ isOpen: false, title: '', message: '', type: 'alert' })
        gameFinishedRef.current = false
      }
    }

    return onArcade(handleMessage)
  }, [isTwoPlayer, activePlayer, p1Score, p2Score])

  // 랭킹은 서버에서 받아 오고, 다른 화면에서 바뀌면 서버가 알려 준다. 창을 다시 볼 때도 새로 읽는다
  useEffect(() => {
    let alive = true
    const reload = () => fetchRankings().then(list => alive && setRankings(list))
    const onVisible = () => {
      if (document.visibilityState === 'visible') reload()
    }
    reload()
    const off = onRankingsChanged(list => setRankings(list))
    window.addEventListener('focus', reload)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      off()
      window.removeEventListener('focus', reload)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const startSimultaneousCountdown = () => {
    // AI 대결은 1P 화면에서만 진행하고 2P 화면은 랭킹을 계속 보여 준다
    const bothScreensPlay = isTwoPlayer && !isVsAi
    setCountdown(3)
    let c = 3
    const interval = setInterval(() => {
      c -= 1
      if (c >= 0) {
        setCountdown(c)
      } else {
        clearInterval(interval)
        setCabA('inGame')
        setCabB(bothScreensPlay ? 'inGame' : 'leaderboard')
        setCountdown(null)
        setRound(1)
        setTimeLeft(20)
        setP1Score(0)
        setP2Score(0)
        setActivePlayer('1P')
        bestRef.current = { '1P': null, '2P': null }
        resetPvp()
        pendingGalleryRef.current = []
        gameFinishedRef.current = false
        postArcade('START_GAME_NOW', { isTwoPlayer: bothScreensPlay })
      }
    }, 1000)
  }

  useEffect(() => {
    const isPlaying = (screenMode === 'a' && cabA === 'inGame') || (screenMode === 'b' && cabB === 'inGame') || (screenMode === 'both' && cabA === 'inGame')
    if (!isPlaying || countdown !== null || timeLeft <= 0) return

    const t = setInterval(() => setTimeLeft(n => Math.max(0, n - 1)), 1000)
    return () => clearInterval(t)
  }, [cabA, cabB, screenMode, countdown, timeLeft])

  const publishRankings = (updated: RankItem[]) => {
    setRankings(updated)
    postArcade('UPDATE_RANKINGS', { rankings: updated })
  }

  // 결과 문구는 지금 보이는 랭킹으로 바로 정하고, 저장은 서버에 순서대로 보낸다
  const saveRecord = (name: string, score: number, mode: GameMode, player: ActivePlayer) => {
    const prevBest = bestScoreIn(rankings, name)
    const best = bestRef.current[player]
    return { item: { name, score, mode, drawing: best?.drawing, keyword: best?.keyword }, prevBest, renewed: prevBest === null || score > prevBest }
  }

  const submitRecords = async (records: ReturnType<typeof saveRecord>[]) => {
    let list = rankings
    for (const r of records) list = await submitRanking(r.item)
    publishRankings(list)
  }

  const recordNote = (name: string, r: { prevBest: number | null; renewed: boolean }) =>
    r.prevBest === null
      ? `${name}님의 기록이 랭킹에 등록되었습니다.`
      : r.renewed
        ? `${name}님의 최고 기록을 ${r.prevBest.toLocaleString()}점에서 갱신했습니다.`
        : `${name}님의 기존 최고 기록 ${r.prevBest.toLocaleString()}점이 유지됩니다.`

  const finishGameAndSaveRanking = (finalP1Score: number, finalP2Score: number) => {
    if (gameFinishedRef.current) return
    gameFinishedRef.current = true
    flushGallery()

    if (!isTwoPlayer) {
      const r1 = saveRecord(p1Name, finalP1Score, 'solo', '1P')
      submitRecords([r1])
      setCustomModal({
        isOpen: true,
        type: 'alert',
        title: `${TOTAL_ROUNDS}라운드 완주`,
        message: `${p1Name}님의 최종 점수는 ${finalP1Score.toLocaleString()}점입니다.
${recordNote(p1Name, r1)}`,
        onConfirm: () => home(),
      })
      return
    }

    if (isVsAi) {
      // AI 점수는 랭킹에 넣지 않는다
      const r1 = saveRecord(p1Name, finalP1Score, 'ai', '1P')
      submitRecords([r1])
      const result = finalP1Score > finalP2Score ? 'AI를 이겼습니다.' : finalP1Score < finalP2Score ? 'AI가 이겼습니다.' : '무승부입니다.'
      setCustomModal({
        isOpen: true,
        type: 'alert',
        title: result,
        message: `${p1Name} ${finalP1Score.toLocaleString()}점 · AI ${finalP2Score.toLocaleString()}점
${recordNote(p1Name, r1)}`,
        onConfirm: () => home(),
      })
      return
    }

    // 두 사람이 같이 한 게임은 결과를 두 화면에 모두 띄운다
    const announce = (title: string, message: string) => {
      setCustomModal({ isOpen: true, type: 'alert', title, message, onConfirm: () => home() })
      postArcade('GAME_RESULT', { title, message })
    }

    if (isCoop) {
      // 반쪽 협동은 팀 이름 하나로 팀 점수만 올린다
      const team = `${p1Name} & ${p2Name}`
      const r = saveRecord(team, finalP1Score, 'coop', '1P')
      submitRecords([r])
      announce('반쪽 협동 완주', `${team} 팀 ${finalP1Score.toLocaleString()}점
${recordNote(team, r)}`)
      return
    }

    const r1 = saveRecord(p1Name, finalP1Score, 'pvp', '1P')
    const r2 = saveRecord(p2Name, finalP2Score, 'pvp', '2P')
    submitRecords([r1, r2])
    const winner = finalP1Score > finalP2Score ? `${p1Name}님 승리` : finalP1Score < finalP2Score ? `${p2Name}님 승리` : '무승부'
    announce(
      winner,
      `${p1Name} ${finalP1Score.toLocaleString()}점 · ${p2Name} ${finalP2Score.toLocaleString()}점
${recordNote(p1Name, r1)}
${recordNote(p2Name, r2)}`,
    )
  }

  // 둘이 대결: 두 사람 모두 이번 라운드를 끝내면 1P 화면이 다음 라운드(또는 게임 끝)로 넘긴다
  useEffect(() => {
    if (!isPvp || screenMode === 'b' || doneRoles.length < 2 || advancedRoundRef.current === round) return
    advancedRoundRef.current = round
    // 결과를 잠깐 보여 준 뒤 넘어간다 (취소하지 않는다: 같은 라운드는 한 번만 진행)
    setTimeout(() => {
      if (round < TOTAL_ROUNDS) {
        setRound(round + 1)
        setTimeLeft(20)
        setDoneRoles([])
        postArcade('NEXT_TURN', { nextPlayer: '1P', nextRound: round + 1 })
      } else {
        finishGameAndSaveRanking(pvpTotal('1P'), pvpTotal('2P'))
      }
    }, 1200)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneRoles, round, isPvp, screenMode])

  const handleRoundComplete = (roundScore: number, snapshot: string, player?: ActivePlayer) => {
    const safeScore = isNaN(roundScore) ? 0 : roundScore
    // 동시 대결은 화면의 주인이, 번갈아 하는 모드는 차례인 사람이 그린 사람
    const who: ActivePlayer = isPvp && player ? player : activePlayer
    const best: BestDrawing | null = snapshot
      ? { score: safeScore, drawing: snapshot, keyword: gameKeywords[(round - 1) % gameKeywords.length]?.ko ?? '' }
      : null
    // 사람이 그린 라운드 그림은 홈 화면 갤러리 후보로 모아 둔다 (AI 그림은 snapshot 이 비어 있다)
    if (best) {
      const drawer = isCoop ? `${p1Name} & ${p2Name}` : who === '1P' ? p1Name : p2Name
      pendingGalleryRef.current.push({ drawing: best.drawing, keyword: best.keyword, name: drawer, score: safeScore })
    }

    // 둘이 대결: 내 결과를 반영하고 상대 화면에 알린다. 둘 다 끝나면 1P 화면이 다음 라운드로 넘긴다
    if (isPvp) {
      applyPvpDone(who, round, safeScore, best)
      postArcade('PVP_ROUND_DONE', { player: who, round, score: safeScore, best })
      return
    }

    if (best) recordBest(activePlayer, best)
    let newP1Score = isNaN(p1Score) ? 0 : p1Score
    let newP2Score = isNaN(p2Score) ? 0 : p2Score

    if (activePlayer === '1P') {
      newP1Score += safeScore
      setP1Score(newP1Score)
    } else {
      newP2Score += safeScore
      setP2Score(newP2Score)
    }

    postArcade('UPDATE_SCORES', { p1Score: newP1Score, p2Score: newP2Score, player: activePlayer, best })

    // 반쪽 협동: 1P 화면이 팀 점수를 쌓고 두 화면을 다음 라운드로 넘긴다
    if (isCoop) {
      if (round < TOTAL_ROUNDS) {
        setRound(round + 1)
        setTimeLeft(20)
        postArcade('NEXT_TURN', { nextPlayer: '1P', nextRound: round + 1 })
      } else {
        finishGameAndSaveRanking(newP1Score, 0)
      }
      return
    }

    if (!isTwoPlayer) {
      if (round < TOTAL_ROUNDS) {
        setRound(r => r + 1)
        setTimeLeft(20)
      } else {
        finishGameAndSaveRanking(newP1Score, newP2Score)
      }
      return
    }

    const nextPlayer: ActivePlayer = activePlayer === '1P' ? '2P' : '1P'
    const nextRound = activePlayer === '2P' ? round + 1 : round

    if (nextRound > TOTAL_ROUNDS) {
      finishGameAndSaveRanking(newP1Score, newP2Score)
      return
    }

    setActivePlayer(nextPlayer)
    setRound(nextRound)
    setTimeLeft(20)

    postArcade('NEXT_TURN', { nextPlayer, nextRound })
  }

  const handleSelect1PMode = () => {
    setIsTwoPlayer(false)
    setIsVsAi(false)
    setIsCoop(false)
    setCabA('nickname1P')
    setCabB('leaderboard')
    gameFinishedRef.current = false
  }

  const handleSelect2PMode = () => {
    setIsTwoPlayer(true)
    setIsVsAi(false)
    setIsCoop(false)
    setCabA('nickname1P')
    gameFinishedRef.current = false
  }

  // 인간 vs AI: 사람 이름을 받은 뒤 2P 자리에 AI를 앉히고 바로 시작
  const handleSelectVsAiMode = () => {
    setIsTwoPlayer(true)
    setIsVsAi(true)
    setIsCoop(false)
    setCabA('nickname1P')
    setCabB('leaderboard')
    gameFinishedRef.current = false
  }

  // 반쪽 협동: 둘이 대결처럼 2P 이름을 받은 뒤 두 화면이 동시에 그린다
  const handleSelectCoopMode = () => {
    setIsTwoPlayer(true)
    setIsVsAi(false)
    setIsCoop(true)
    setCabA('nickname1P')
    gameFinishedRef.current = false
  }

  const handleComplete1PName = (name: string) => {
    setP1Name(name)

    if (isVsAi) {
      setP2Name(AI_NAME)
      setGameKeywords(pickRandomKeywords(TOTAL_ROUNDS))
      startSimultaneousCountdown()
      return
    }

    const newKeywords = pickRandomKeywords(TOTAL_ROUNDS)
    setGameKeywords(newKeywords)

    if (!isTwoPlayer) {
      setCabB('leaderboard')
      startSimultaneousCountdown()
    } else {
      setCabA('waiting2P')
      setCabB('nickname2P')
      postArcade('REQUEST_2P_MODE', { keywords: newKeywords, p1Name: name, coop: isCoop })
    }
  }

  const handleComplete2PName = (name: string) => {
    setP2Name(name)
    postArcade('P2_READY_TRIGGER', { p2Name: name })
    startSimultaneousCountdown()
  }

  const handleDeleteRankingPrompt = (id: string, name: string) => {
    setCustomModal({
      isOpen: true,
      type: 'confirm',
      title: '기록을 삭제할까요?',
      message: `${name}님의 기록을 모두 삭제합니다. 명예의 전당과 전체 기록에서 함께 지워집니다.\n삭제한 기록은 되돌릴 수 없습니다.`,
      onConfirm: () => { deleteRanking(id).then(publishRankings) },
    })
  }

  const home = () => {
    // 게임을 끝내지 않고 나가면 이번 게임 그림은 갤러리에 올리지 않는다
    pendingGalleryRef.current = []
    setCabA('idle')
    setCabB('leaderboard')
    setIsTwoPlayer(false)
    setIsVsAi(false)
    setIsCoop(false)
    setCountdown(null)
    gameFinishedRef.current = false
    postArcade('GOTO_HOME')
  }

  const nameTitle1P = isVsAi ? '이름을 써 주세요' : isTwoPlayer ? '1P 이름을 써 주세요' : '이름을 써 주세요'
  const nameSub1P = isVsAi ? 'AI와 대결한 기록이 이 이름으로 랭킹에 오릅니다.' : '패드에 손글씨로 쓰면 자동으로 읽습니다.'

  const renderGame = (role: '1P' | '2P') =>
    isCoop ? (
      <ScreenHalf
        role={role}
        round={round}
        timeLeft={timeLeft}
        currentKeyword={gameKeywords[(round - 1) % gameKeywords.length]}
        p1Name={p1Name}
        p2Name={p2Name}
        teamScore={p1Score}
        onRoundComplete={handleRoundComplete}
        onHome={home}
      />
    ) : (
    <ScreenGame
      role={role}
      round={round}
      timeLeft={timeLeft}
      currentKeyword={gameKeywords[(round - 1) % gameKeywords.length]}
      p1Name={p1Name}
      p2Name={p2Name}
      p1Score={p1Score}
      p2Score={p2Score}
      activePlayer={activePlayer}
      isTwoPlayer={isTwoPlayer}
      vsAi={isVsAi}
      simultaneous={isPvp}
      doneRoles={doneRoles}
      onRoundComplete={handleRoundComplete}
      onHome={home}
    />
    )

  const waiting2P = (
    <Screen className="flex flex-col">
      <ArcadeBackground />
      <header className="relative px-14 pt-10">
        <BackButton onClick={home}>취소</BackButton>
      </header>
      <main className="relative flex-1 flex flex-col items-center justify-center gap-6 pb-16 text-center">
        <Spinner />
        <h2 className="font-display text-5xl">{p1Name}님 등록 완료</h2>
        <p className="text-lg text-graphite">2P가 옆 화면에서 이름을 쓰고 있습니다.<br />입력이 끝나면 두 화면이 함께 시작합니다.</p>
      </main>
    </Screen>
  )

  const leaderboard = <ScreenLeaderboard rankings={rankings} onDeleteOne={handleDeleteRankingPrompt} onRankings={publishRankings} />

  return (
    <div className="relative h-screen w-screen overflow-hidden select-none font-sans bg-black">
      <CustomAlertModal
        modal={customModal}
        onClose={() => setCustomModal({ isOpen: false, title: '', message: '', type: 'alert' })}
      />

      {/* 개발용 화면 전환: 홈·랭킹 화면에서만 (다른 화면의 버튼과 겹치지 않게) */}
      {!isPlayingGame && (cabA === 'idle' || (screenMode === 'b' && cabB === 'leaderboard')) && (
        <div className="absolute top-3 right-3 z-50 flex gap-1 p-1 rounded-xl bg-white/80 border border-black/5 opacity-30 hover:opacity-100 transition-opacity font-ui">
          {(['a', 'b'] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => { window.location.search = `?screen=${s}` }}
              className={`px-3 h-8 rounded-lg text-xs font-bold ${screenMode === s ? 'bg-[#2B1A40] text-white' : 'text-[#2B1A40]'}`}
            >
              {s === 'a' ? '1P 화면' : '2P · 랭킹 화면'}
            </button>
          ))}
        </div>
      )}

      {countdown !== null && <CountdownOverlay count={countdown} />}

      {/* ── [화면 1] Cabinet A (1P 모니터) ── */}
      {screenMode === 'a' && (
        <div className="w-full h-full bg-white relative">
          {cabA === 'idle' && <ScreenIdle onStart={() => setCabA('modeSelect')} onPractice={() => setCabA('practice')} rankings={rankings} />}
          {cabA === 'practice' && <ScreenPractice onHome={() => setCabA('idle')} />}
          {cabA === 'modeSelect' && (
            <ModeModal onClose={() => setCabA('idle')} on1P={handleSelect1PMode} on2P={handleSelect2PMode} onVsAI={handleSelectVsAiMode} onCoop={handleSelectCoopMode} />
          )}
          {cabA === 'nickname1P' && (
            <HangulKeyboard title={nameTitle1P} subtitle={nameSub1P} onComplete={handleComplete1PName} onCancel={() => setCabA('modeSelect')} />
          )}
          {cabA === 'waiting2P' && waiting2P}
          {cabA === 'inGame' && renderGame('1P')}
        </div>
      )}

      {/* ── [화면 2] Cabinet B (2P 모니터 및 랭킹) ── */}
      {screenMode === 'b' && (
        <div className="w-full h-full bg-white relative">
          {cabB === 'leaderboard' && leaderboard}
          {cabB === 'nickname2P' && (
            <HangulKeyboard title="2P 이름을 써 주세요" subtitle={isCoop ? `${p1Name}님과 한 그림을 반씩 나눠 그립니다.` : `${p1Name}님과 대결합니다.`} onComplete={handleComplete2PName} onCancel={home} />
          )}
          {cabB === 'inGame' && renderGame('2P')}
        </div>
      )}

      {/* ── 개발용 (반반 분할 보기) ── */}
      {screenMode === 'both' && (
        <div className="flex w-full h-full bg-white">
          <div className="w-1/2 h-full border-r-4 border-[#2B1A40] relative">
            {cabA === 'idle' && <ScreenIdle onStart={() => setCabA('modeSelect')} onPractice={() => setCabA('practice')} rankings={rankings} />}
          {cabA === 'practice' && <ScreenPractice onHome={() => setCabA('idle')} />}
            {cabA === 'modeSelect' && (
              <ModeModal onClose={() => setCabA('idle')} on1P={handleSelect1PMode} on2P={handleSelect2PMode} onVsAI={handleSelectVsAiMode} onCoop={handleSelectCoopMode} />
            )}
            {cabA === 'nickname1P' && (
              <HangulKeyboard title={nameTitle1P} subtitle={nameSub1P} onComplete={handleComplete1PName} onCancel={() => setCabA('modeSelect')} />
            )}
            {cabA === 'waiting2P' && waiting2P}
            {cabA === 'inGame' && renderGame('1P')}
          </div>
          <div className="w-1/2 h-full relative">
            {cabB === 'leaderboard' && leaderboard}
            {cabB === 'nickname2P' && (
              <HangulKeyboard title="2P 이름을 써 주세요" subtitle={isCoop ? `${p1Name}님과 한 그림을 반씩 나눠 그립니다.` : `${p1Name}님과 대결합니다.`} onComplete={handleComplete2PName} onCancel={home} />
            )}
            {cabB === 'inGame' && renderGame('2P')}
          </div>
        </div>
      )}
    </div>
  )
}
