#!/bin/bash
echo "🧹 Clearing Metro cache and restarting..."
echo "========================================="

cd "c:\Users\DELL\Desktop\teranggo\Fullstack\terango"

echo "1. Clearing Metro cache..."
npx expo start --clear

echo "✅ Metro cache cleared and app restarted!"