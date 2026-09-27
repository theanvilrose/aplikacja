@echo off
rem Uruchamia Slowika lokalnie i otwiera go w przegladarce.
cd /d "%~dp0"
rem Najpierw wczytuje aktualne slowka z ..\Angielski\(slownik.md, zwroty.md, czesci_mowy.md).
node tools\import-slowka.js
start "" http://localhost:8765
rem Serwer aplikacji + panel dewelopera (ikony slowek przez OpenRouter; klucz czyta tylko ten serwer, lokalnie).
node tools\server.js
