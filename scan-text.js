// scan-text-errors.js
const fs = require("fs");
const path = require("path");

const targetExtensions = [".js", ".jsx", ".ts", ".tsx"];
const suspiciousPatterns = [
  /&&\s*<\w/, // condition && <Component />
  />\s+<\w/, // spaces between tags: <View> <Text>
  /<\w+>\s*['"`].*['"`]\s*<\/\w+>/, // inline string inside JSX without wrapping properly
  /<\w+\s*\/>\s*[\w.;]/, // stray chars after self-closing tag
  /\/\/.*<\/?\w/, // // comments inside JSX
  />\s*;\s*<\/\w/, // semicolon inside JSX
  /\{.*&&\s*['"`0-9].*\}/, // condition && string/number directly
  /\{[^}]*&&[^}]*[a-zA-Z0-9_]+[^}]*\}/, // condition && variable directly
];

function scanDir(dir) {
  fs.readdirSync(dir).forEach((file) => {
    if (file.startsWith(".") || file === "node_modules") return; // skip hidden and node_modules
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      scanDir(filePath);
    } else if (targetExtensions.includes(path.extname(file))) {
      const content = fs.readFileSync(filePath, "utf8").split("\n");
      let found = false;
      content.forEach((line, idx) => {
        suspiciousPatterns.forEach((pattern) => {
          if (pattern.test(line)) {
            found = true;
            // Print 2 lines before and after for context
            const start = Math.max(0, idx - 2);
            const end = Math.min(content.length, idx + 3);
            console.log(
              `\n[${filePath}:${idx + 1}] Possible conditional render issue:`
            );
            for (let i = start; i < end; i++) {
              const marker = i === idx ? ">" : " ";
              console.log(`${marker} ${i + 1}: ${content[i]}`);
            }
          }
        });
      });
      if (found) {
        console.log(`\n--- End of issues in ${filePath} ---\n`);
      }
    }
  });
}

// Start scanning from project root (or pass as CLI arg)
const root = process.argv[2] || process.cwd();
scanDir(root);
