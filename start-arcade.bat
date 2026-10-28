@echo off
chcp 65001 >nul
rem 아케이드 화면 실행 (Chrome 키오스크 전체 화면)
rem
rem   start-arcade.bat                 한 PC 에서 두 화면: 1P 는 모니터 1, 2P/랭킹은 모니터 2
rem   start-arcade.bat a               이 PC 는 1P 화면만 (게임 서버를 돌리는 노트북)
rem   start-arcade.bat b 192.168.0.10  이 PC 는 2P/랭킹 화면만, 서버 노트북 IP 로 접속
rem
rem 랭킹과 게임 진행은 서버 노트북의 개발 서버(5199 포트)를 통해 공유된다.

rem ── 환경에 맞게 고치는 값 ─────────────────────────────────────────
set PORT=5199
rem 한 PC 에서 두 화면을 띄울 때 모니터 2 의 왼쪽 위 좌표
set MONITOR2_POS=1920,0
set CHROME="C:\Program Files\Google\Chrome\Application\chrome.exe"
rem ────────────────────────────────────────────────────────────────

set PROFILE_ROOT=%LOCALAPPDATA%\arcade-chrome
set FLAGS=--kiosk --no-first-run --disable-pinch --overscroll-history-navigation=0

if /i "%~1"=="a" (
  start "" %CHROME% --user-data-dir="%PROFILE_ROOT%\screen1" %FLAGS% "http://localhost:%PORT%/?screen=a"
  goto :eof
)

if /i "%~1"=="b" (
  if "%~2"=="" (
    echo 서버 노트북 IP 를 같이 적어 주세요. 예: start-arcade.bat b 192.168.0.10
    pause
    goto :eof
  )
  start "" %CHROME% --user-data-dir="%PROFILE_ROOT%\screen2" %FLAGS% "http://%~2:%PORT%/?screen=b"
  goto :eof
)

start "" %CHROME% --user-data-dir="%PROFILE_ROOT%\screen1" %FLAGS% --window-position=0,0 "http://localhost:%PORT%/?screen=a"
start "" %CHROME% --user-data-dir="%PROFILE_ROOT%\screen2" %FLAGS% --window-position=%MONITOR2_POS% "http://localhost:%PORT%/?screen=b"
