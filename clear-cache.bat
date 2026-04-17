@echo off
echo ==========================================
echo TeranGO Express - Fixed Import Issues ✅
echo ==========================================
echo.
echo Fixed imports:
echo - @/utils/apiClient → @/lib/apiClient
echo.
echo Clearing React Native Metro cache...
cd /d "c:\Users\DELL\Desktop\teranggo\Fullstack\terango"

echo Removing node_modules cache...
if exist node_modules\.cache rd /s /q node_modules\.cache

echo Starting with clear cache...
call npx expo start --clear

pause