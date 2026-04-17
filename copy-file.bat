@echo off
copy /Y "c:\Users\DELL\Desktop\teranggo\Fullstack\terango\app\custom-delivery\index-new.tsx" "c:\Users\DELL\Desktop\teranggo\Fullstack\terango\app\custom-delivery\index.tsx"
if %ERRORLEVEL% EQU 0 (
    echo File replaced successfully!
) else (
    echo Error copying file
    exit /b 1
)
