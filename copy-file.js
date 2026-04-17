const fs = require("fs");

const source =
  "c:\\Users\\DELL\\Desktop\\teranggo\\Fullstack\\terango\\app\\custom-delivery\\index-new.tsx";
const dest =
  "c:\\Users\\DELL\\Desktop\\teranggo\\Fullstack\\terango\\app\\custom-delivery\\index.tsx";

try {
  fs.copyFileSync(source, dest);
  console.log("✓ File replaced successfully");
  console.log("  index.tsx has been updated with the new design");
} catch (error) {
  console.error("✗ Error copying file:", error.message);
  process.exit(1);
}
