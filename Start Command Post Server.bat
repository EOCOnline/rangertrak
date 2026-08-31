@echo off
REM RangerTrak Command Post Server - double-click launcher (Windows).
REM
REM Raised live 2026-08-31: "anything to simplify creation or admin?" - before this, starting
REM the server meant knowing what a terminal is, what npm is, and typing a command correctly.
REM This exists so a non-technical coordinator can just double-click a file instead. It does
REM NOT replace `npm run command-post` for anyone comfortable with a terminal - both run the
REM exact same tools\command-post-server.js.
REM
REM %~dp0 is this .bat file's own folder, with a trailing backslash - used instead of assuming
REM the double-click starts in any particular folder, which Windows does not guarantee.
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo RangerTrak Command Post Server needs Node.js, which isn't installed on this
  echo computer ^(or isn't on its PATH^).
  echo.
  echo Install it from https://nodejs.org, then double-click this file again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo.
  echo First-time setup needed before this will run: open a command prompt in this
  echo folder and run "npm install" once ^(needs internet access^), then double-click
  echo this file again. This only has to be done one time, ideally before you leave
  echo for the field.
  echo.
  pause
  exit /b 1
)

node tools\command-post-server.js

echo.
echo Server stopped. Close this window, or double-click this file again to restart it.
pause
