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

// Optimized build configuration - NO TRIMMING to preserve UI Automation
const publishCmd = [
  "dotnet publish",
  "-c Release",
  "-r win-x64",
  "--self-contained true",
  "-p:PublishSingleFile=true",
  "-p:PublishTrimmed=false",  // DISABLED: Trimming breaks UI Automation
  "-p:IncludeAllContentForSelfExtract=true",
  "-p:EnableCompressionInSingleFile=true",
  "-p:DebugType=none",
  "-p:DebugSymbols=false",
  "-p:PublishReadyToRun=false",
  "-p:EventSourceSupport=false",
  "-p:HttpActivityPropagationSupport=false",
  "-p:MetadataUpdaterSupport=false",
  "-p:UseSystemResourceKeys=true",
  "-o ./dist"
].join(" ");

const checkIsExeAvailable = () => {
  const source_fold_dest = path.join(__dirname, "native");
  const source_exe_dest = path.join(source_fold_dest, "GetBrowserUrlNetTool.exe");
  const build_source_path = path.join(__dirname, "GetBrowserUrlNetTool", "dist", "GetBrowserUrlNetTool.exe");

  if (!fs.existsSync(build_source_path)) {
    console.error("❌ Build failed: executable not found");
    process.exit(1);
  }

  const stats = fs.statSync(build_source_path);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`\n📦 Build size: ${sizeMB} MB`);

  fs.mkdirSync(source_fold_dest, { recursive: true });
  
  if (fs.existsSync(source_exe_dest)) {
    fs.unlinkSync(source_exe_dest);
  }
  
  fs.renameSync(build_source_path, source_exe_dest);
  console.log(`✅ Moved to: native/GetBrowserUrlNetTool.exe`);
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