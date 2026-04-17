@echo off
echo.
echo ========================================
echo TeranGO Express - Applying Redesign
echo ========================================
echo.

REM Check if new file exists
if not exist "app\custom-delivery\index-new.tsx" (
    echo [ERROR] index-new.tsx not found!
    echo Expected at: app\custom-delivery\index-new.tsx
    pause
    exit /b 1
)

REM Backup old file
echo [1/2] Creating backup...
copy /Y "app\custom-delivery\index.tsx" "app\custom-delivery\index-old-backup.tsx" >nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to create backup
    pause
    exit /b 1
)
echo [OK] Backup created: index-old-backup.tsx

REM Apply new design
echo [2/2] Applying new design...
copy /Y "app\custom-delivery\index-new.tsx" "app\custom-delivery\index.tsx" >nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to apply new design
    pause
    exit /b 1
)
echo [OK] New design applied: index.tsx

echo.
echo ========================================
echo SUCCESS! Redesign Complete
echo ========================================
echo.
echo Summary:
echo   - Old file backed up to: index-old-backup.tsx
echo   - New design is now active: index.tsx
echo   - Source file preserved: index-new.tsx
echo.
echo Next steps:
echo   1. Test your app: npm start
echo   2. Review: EXPRESS_REDESIGN_COMPLETE.md
echo.
pause
