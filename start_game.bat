@echo off
echo Starting Rhythm Dodger Server...
echo The game will open in your default browser.
echo Do not close this window while playing!
start "" "http://localhost:3000"
call npm start
pause
