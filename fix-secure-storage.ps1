# PowerShell script to replace SecureStore with SecureStorage utility
# This ensures web compatibility by using AsyncStorage on web platform

$files = Get-ChildItem -Path "." -Include "*.ts","*.tsx" -Recurse -File |
    Where-Object { $_.FullName -notmatch "node_modules" -and $_.FullName -notmatch "\.expo" }

$replacements = @{
    'import \* as SecureStore from "expo-secure-store";' = 'import { SecureStorage } from "@/utils/secureStorage";'
    "import \* as SecureStore from 'expo-secure-store';" = "import { SecureStorage } from '@/utils/secureStorage';"
    'SecureStore\.getItemAsync\(' = 'SecureStorage.getItem('
    'SecureStore\.setItemAsync\(' = 'SecureStorage.setItem('
    'SecureStore\.deleteItemAsync\(' = 'SecureStorage.deleteItem('
}

$totalChanges = 0

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -Encoding UTF8
    $originalContent = $content
    $fileChanges = 0
    
    foreach ($pattern in $replacements.Keys) {
        $replacement = $replacements[$pattern]
        $matches = [regex]::Matches($content, $pattern)
        if ($matches.Count -gt 0) {
            $content = $content -replace $pattern, $replacement
            $fileChanges += $matches.Count
        }
    }
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        Write-Host "Updated $($file.Name) - $fileChanges changes" -ForegroundColor Green
        $totalChanges += $fileChanges
    }
}

Write-Host ""
Write-Host "Total changes: $totalChanges across $($files.Count) files" -ForegroundColor Cyan
Write-Host "All SecureStore references replaced with SecureStorage utility" -ForegroundColor Green
