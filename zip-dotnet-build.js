const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

const projectDir = path.join(__dirname, "GetBrowserUrlNetTool");
const distDir = path.join(projectDir, "dist");
const exeName = "GetBrowserUrlNetTool.exe";
const exePath = path.join(distDir, exeName);
const zipOutputPath = path.join(__dirname, "GetBrowserUrlNetTool.zip");

// Check if EXE exists
if (!fs.existsSync(exePath)) {
  console.error("❌ Error: EXE not found. Make sure to run build-dotnet.js first!");
  process.exit(1);
}

// Create output stream
const output = fs.createWriteStream(zipOutputPath);
const archive = archiver("zip", { zlib: { level: 9 } }); // max compression

output.on("close", () => {
  console.log(`✅ Created ZIP: ${zipOutputPath} (${archive.pointer()} bytes)`);
});

archive.on("error", (err) => {
  console.error("❌ Zip creation failed:", err);
  process.exit(1);
});

archive.pipe(output);

// Add the EXE to the ZIP
archive.file(exePath, { name: exeName });

// Finalize ZIP
archive.finalize();