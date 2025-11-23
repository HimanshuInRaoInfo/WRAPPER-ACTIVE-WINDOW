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

const checkIsExeAvailable = () => {
  const source_fold_dest = path.join(__dirname, "native");
  const source_exe_dest = path.join(source_fold_dest, "GetBrowserUrlNetTool.exe")
  const build_source_path = path.join(__dirname, "GetBrowserUrlNetTool", "dist", "GetBrowserUrlNetTool.exe")

  if (!fs.existsSync(source_exe_dest)) {
    fs.mkdirSync(source_fold_dest, { recursive: true });
    fs.renameSync(build_source_path, source_exe_dest)
    return;
  }
}

try {
  console.log("🚀 Building .NET project...");
  execSync(publishCmd, {
    cwd: projectDir,
    stdio: "inherit" // pipe output to console
  });
  checkIsExeAvailable();
  console.log("\n✅ .NET build completed successfully!");
} catch (error) {
  console.error("\n❌ Failed to build .NET project.");
  console.error(error.message);
  process.exit(1);
}