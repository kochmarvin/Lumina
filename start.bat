@echo off
setlocal
cd /d "%~dp0"

echo.
echo Lokaler LLM Chat - Start
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1"
set EXITCODE=%ERRORLEVEL%

if %EXITCODE% neq 0 (
  echo.
  echo Start fehlgeschlagen. Exit-Code: %EXITCODE%
  pause
)

exit /b %EXITCODE%
