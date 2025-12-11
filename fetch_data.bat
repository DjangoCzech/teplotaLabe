@echo off
REM Automatic data fetch for Teplota Labe
REM This script runs fetch_data.php to download new measurements from CHMU

cd /d "%~dp0"
"C:\xampp\php\php.exe" fetch_data.php

REM Optional: Uncomment to see output (useful for testing)
REM pause
