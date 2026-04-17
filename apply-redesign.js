#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const projectRoot = __dirname;
const oldFile = path.join(projectRoot, "app", "custom-delivery", "index.tsx");
const newFile = path.join(
  projectRoot,
  "app",
  "custom-delivery",
  "index-new.tsx",
);
const backupFile = path.join(
  projectRoot,
  "app",
  "custom-delivery",
  "index-old-backup.tsx",
);

console.log("🚀 TeranGO Express - Applying Redesign\n");

try {
  // Check if new file exists
  if (!fs.existsSync(newFile)) {
    console.error("❌ Error: index-new.tsx not found!");
    console.error("   Expected at:", newFile);
    process.exit(1);
  }

  // Backup old file
  console.log("📦 Creating backup...");
  fs.copyFileSync(oldFile, backupFile);
  console.log("✅ Backup created: index-old-backup.tsx\n");

  // Replace with new file
  console.log("🔄 Applying new design...");
  fs.copyFileSync(newFile, oldFile);
  console.log("✅ New design applied successfully!\n");

  console.log("📊 Summary:");
  console.log("   • Old file backed up to: index-old-backup.tsx");
  console.log("   • New design is now active: index.tsx");
  console.log("   • Source file preserved: index-new.tsx\n");

  console.log("🎉 Redesign complete! Test your app:");
  console.log("   npm start\n");
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}
