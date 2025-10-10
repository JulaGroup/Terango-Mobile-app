# 🚀 Accessibility & Performance Enhancement Script
# Run this script to install recommended packages

Write-Host "📦 Installing performance and image optimization packages..." -ForegroundColor Cyan
Write-Host ""

# Install expo-image for better image performance
Write-Host "1️⃣ Installing expo-image..." -ForegroundColor Yellow
npx expo install expo-image

# Install expo-image-manipulator for image compression
Write-Host ""
Write-Host "2️⃣ Installing expo-image-manipulator..." -ForegroundColor Yellow
npx expo install expo-image-manipulator

Write-Host ""
Write-Host "✅ Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Next steps:" -ForegroundColor Cyan
Write-Host "1. Replace 'react-native' Image imports with expo-image"
Write-Host "2. Add image compression before Cloudinary upload"
Write-Host "3. See ACCESSIBILITY_PERFORMANCE_GUIDE.md for implementation details"
Write-Host ""
Write-Host "🎉 Your app will be even faster!" -ForegroundColor Green
