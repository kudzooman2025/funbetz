@echo off
REM ship.cmd — commit, push, and deploy in one step.
REM Usage:  ship "your commit message"
REM         ship                       (uses a default message)

setlocal
cd /d "%~dp0"

set "MSG=%~1"
if "%MSG%"=="" set "MSG=Update"

echo.
echo === Clearing any stale git lock ===
if exist ".git\index.lock" del /f /q ".git\index.lock"

echo === Staging changes ===
git add -A
if errorlevel 1 goto :failed

echo === Committing ===
git commit -m "%MSG%"
if errorlevel 1 (
  echo.
  echo Nothing to commit — skipping straight to deploy.
)

echo === Pushing to GitHub ===
git push origin master
if errorlevel 1 goto :failed

echo === Triggering Vercel deploy ===
curl -s -X POST "https://api.vercel.com/v1/integrations/deploy/prj_bjq1FnwbQK6UlRLtTXNPwDiAJWlr/SG8xaVibld"
echo.
echo.
echo === Done. Build takes about 2 minutes. ===
goto :eof

:failed
echo.
echo *** Something failed above — nothing was deployed. ***
exit /b 1
