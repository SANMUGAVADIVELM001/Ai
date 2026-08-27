@echo off
setlocal

set "ROOT=%~dp0"

echo Starting backend (http://localhost:4100)...
start "PathAI Backend" cmd /k "cd /d "%ROOT%backend" && npm install && npm run dev"

echo Starting frontend (http://localhost:5180)...
start "PathAI Frontend" cmd /k "cd /d "%ROOT%frontend" && npm install && npm run dev"

echo.
echo Both servers are starting in separate windows.
echo Backend:  http://localhost:4100
echo Frontend: http://localhost:5180
echo.
pause
