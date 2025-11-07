const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

if (os.platform() !== "win32") {
  console.log("⏩ Skipping .NET build: not running on Windows.");
  process.exit(0);
}

const projectDir = path.join(__dirname, "GetBrowserUrlNetTool");

if (!fs.existsSync(projectDir)) {
  process.exit(1);
}

const publishCmd = [
  "dotnet publish",
  "-c Release",
  "-r win-x64",
  "--self-contained true",
  "-p:PublishSingleFile=true",
  "-p:IncludeAllContentForSelfExtract=true",
  "-p:TrimMode=partial",
  "-p:EnableCompressionInSingleFile=true",
  "-p:ReadyToRun=false",
  "-o ./dist"
].join(" ");

try {
  console.log("🚀 Building .NET project...");
  execSync(publishCmd, {
    cwd: projectDir,
    stdio: "inherit" // pipe output to console
  });
  console.log("\n✅ .NET build completed successfully!");
} catch (error) {
  console.error("\n❌ Failed to build .NET project.");
  console.error(error.message);
  process.exit(1);
}