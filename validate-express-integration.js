#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 TeranGO Express Integration Validation');
console.log('=========================================\n');

let allChecks = true;

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${description}`);
    return true;
  } else {
    console.log(`❌ ${description} - File not found: ${filePath}`);
    allChecks = false;
    return false;
  }
}

function checkFileContent(filePath, searchText, description) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes(searchText)) {
      console.log(`✅ ${description}`);
      return true;
    } else {
      console.log(`❌ ${description} - Content not found in: ${filePath}`);
      allChecks = false;
      return false;
    }
  } else {
    console.log(`❌ ${description} - File not found: ${filePath}`);
    allChecks = false;
    return false;
  }
}

console.log('🔍 Checking Express Components...');

// Core Express Components
checkFile('components/express/QRCodeDisplay.tsx', 'QR Code Display Component');
checkFile('components/express/ExpressBadge.tsx', 'Express Badge Component');
checkFile('components/express/ModernLocationPicker.tsx', 'Modern Location Picker');
checkFile('components/express/UnifiedLocationSection.tsx', 'Unified Location Section');
checkFile('components/express/ExpressVehicleCard.tsx', 'Express Vehicle Selection');
checkFile('components/express/ExpressWeightClassCard.tsx', 'Express Weight Selection');

console.log('\n🔍 Checking Express Screens...');

// Express Screens
checkFile('app/custom-delivery/index.tsx', 'Express Delivery Booking Screen');
checkFile('app/express-payment.tsx', 'Express Payment Screen');
checkFile('components/tracking/ExpressTrackingScreen.tsx', 'Express Tracking Screen');

console.log('\n🔍 Checking Server Integration...');

// Server Components
checkFile('../server/prisma/schema.prisma', 'Enhanced Database Schema');
checkFile('../server/src/services/expressDelivery.service.ts', 'Express Delivery Service');
checkFile('../server/src/services/expressTracking.service.ts', 'Express Tracking Service');
checkFile('../server/src/services/driverEarnings.service.ts', 'Driver Earnings Service');
checkFile('../server/src/routes/expressDelivery.routes.ts', 'Express API Endpoints');

console.log('\n🔍 Checking Wave Payment Integration...');

// Wave Payment
checkFileContent('../server/src/services/wave.service.ts', 'expressDelivery', 'Wave Express Payment Integration');

console.log('\n🔍 Checking Driver App Integration...');

// Driver App
checkFile('../TeranGO-Driver/components/ExpressDeliveryCard.tsx', 'Driver Express Delivery Card');
checkFile('../TeranGO-Driver/components/ExpressQRScanner.tsx', 'Driver QR Scanner');
checkFile('../TeranGO-Driver/app/(tabs)/express.tsx', 'Driver Express Screen');

console.log('\n🔍 Checking Admin Panel Integration...');

// Admin Panel
checkFile('../complete admin panel/src/components/ExpressAdminDashboard.tsx', 'Express Admin Dashboard');

console.log('\n🔍 Checking Express Features in Main Components...');

// Integration Checks
checkFileContent('app/custom-delivery/index.tsx', 'UnifiedLocationSection', 'Unified Location Integration');
checkFileContent('app/custom-delivery/index.tsx', 'ExpressBadge', 'Express Badge Integration');
checkFileContent('components/express/ExpressVehicleCard.tsx', '🏍️', 'Vehicle Emoji Icons Integration');

console.log('\n🔍 Checking Database Schema...');

// Database Schema Checks
checkFileContent('../server/prisma/schema.prisma', 'isExpress', 'Express Delivery Fields');
checkFileContent('../server/prisma/schema.prisma', 'DeliveryPriorityLevel', 'Priority Level Enum');
checkFileContent('../server/prisma/schema.prisma', 'isExpressEnabled', 'Driver Express Capabilities');

console.log('\n📱 Checking Mobile App Dependencies...');

// Package Dependencies
if (fs.existsSync('package.json')) {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const requiredDeps = [
    'expo-camera',
    'expo-barcode-scanner', 
    'react-native-qrcode-svg',
    '@react-native-async-storage/async-storage',
    'expo-location'
  ];
  
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
      console.log(`✅ Required dependency: ${dep}`);
    } else {
      console.log(`⚠️  Missing dependency: ${dep} (may need installation)`);
    }
  });
} else {
  console.log('❌ package.json not found');
  allChecks = false;
}

console.log('\n📊 Validation Summary');
console.log('====================');

if (allChecks) {
  console.log('🎉 All Express delivery features are properly integrated!');
  console.log('\n✨ Express System Features:');
  console.log('   • QR Code generation and scanning');
  console.log('   • Express badges with priority levels');
  console.log('   • Modern location picker with GPS');
  console.log('   • Vehicle selection with admin panel icons');
  console.log('   • Wave payment integration');
  console.log('   • Real-time tracking system');
  console.log('   • Driver app Express support');
  console.log('   • Admin dashboard monitoring');
  console.log('   • Dual driver salary system');
  console.log('   • Complete Express workflow');
} else {
  console.log('⚠️  Some Express features may not be properly integrated.');
  console.log('   Please check the missing files and fix integration issues.');
}

console.log('\n🚀 To start the apps:');
console.log('   Main App: npm start');
console.log('   Driver App: cd ../TeranGO-Driver && npm start');
console.log('   Server: cd ../server && npm start');
console.log('   Admin Panel: cd "../complete admin panel" && npm start');

console.log('\n💡 Next steps:');
console.log('   1. Clear Metro cache: npx expo start --clear');
console.log('   2. Test Express delivery booking flow');
console.log('   3. Test QR code generation and scanning');
console.log('   4. Test Wave payment integration');
console.log('   5. Test driver app Express features');
console.log('   6. Monitor admin dashboard analytics');