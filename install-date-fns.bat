@echo off
echo ========================================
echo   TeranGO - Fixing Dependencies
echo ========================================
echo.
echo Installing all missing dependencies...
echo.
cd "C:\Users\DELL\Desktop\terango main files\terango"
call npm install
echo.
echo ========================================
echo   Installation Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Run: npm start
echo 2. Press 'r' to reload the app
echo.
echo date-fns and all other dependencies are now installed.
echo.
pause
