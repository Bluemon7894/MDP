@echo off
chcp 65001 >nul
title cat.io Arcade Server

echo ========================================================
echo   cat.io 아케이드 서버를 시작합니다...
echo ========================================================
echo.

cd /d "%~dp0"

:: node_modules 확인 및 자동 설치
if not exist "node_modules" (
    echo [알림] 필수 패키지가 없습니다. 설치를 진행합니다...
    where pnpm >nul 2>&1
    if %errorlevel% equ 0 (
        call pnpm install
    ) else (
        where npm >nul 2>&1
        if %errorlevel% equ 0 (
            call npm install
        ) else (
            echo [오류] Node.js 가 설치되어 있지 않습니다!
            echo https://nodejs.org 에서 Node.js를 설치해 주세요.
            pause
            exit /b 1
        )
    )
    echo.
)

:: 안내 문구
echo ========================================================
echo   [아케이드 서버 실행 중]
echo   - 1P 화면:   http://localhost:5199/?screen=a
echo   - 2P/랭킹:   http://localhost:5199/?screen=b
echo.
echo   다른 기기(노트북/태블릿)에서 접속할 때는:
echo   http://[이 컴퓨터 IP]:5199/?screen=a
echo ========================================================
echo.

:: 서버 실행 (pnpm 우선, 없으면 npm 사용)
where pnpm >nul 2>&1
if %errorlevel% equ 0 (
    pnpm dev --port 5199 --host 0.0.0.0
) else (
    npm run dev -- --port 5199 --host 0.0.0.0
)

pause
