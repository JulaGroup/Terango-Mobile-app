#!/bin/bash

# 🚀 Accessibility & Performance Enhancement Script
# Run this script to install recommended packages

echo "📦 Installing performance and image optimization packages..."
echo ""

# Install expo-image for better image performance
echo "1️⃣ Installing expo-image..."
npx expo install expo-image

# Install expo-image-manipulator for image compression
echo ""
echo "2️⃣ Installing expo-image-manipulator..."
npx expo install expo-image-manipulator

echo ""
echo "✅ Installation complete!"
echo ""
echo "📚 Next steps:"
echo "1. Replace 'react-native' Image imports with expo-image"
echo "2. Add image compression before Cloudinary upload"
echo "3. See ACCESSIBILITY_PERFORMANCE_GUIDE.md for implementation details"
echo ""
echo "🎉 Your app will be even faster!"
