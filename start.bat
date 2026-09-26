@echo off
rem Uruchamia Slowika lokalnie i otwiera go w przegladarce.
cd /d "%~dp0"
rem Najpierw wczytuje aktualne slowka z ..\Angielski\slowka.md (po kazdej lekcji).
node tools\import-slowka.js
start "" http://localhost:8765
python -m http.server 8765 --bind 127.0.0.1
