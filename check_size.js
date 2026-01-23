const fs = require('fs');
const path = require('path');

function getSize(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats.size;
    } catch (e) {
        return 0;
    }
}

function getFolderSize(folderPath) {
    let totalSize = 0;
    try {
        const files = fs.readdirSync(folderPath);
        files.forEach(file => {
            const filePath = path.join(folderPath, file);
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
                totalSize += getFolderSize(filePath);
            } else {
                totalSize += stats.size;
            }
        });
    } catch (e) {
        // Ignore errors
    }
    return totalSize;
}

console.log('\n=== FINAL PROJECT SIZE ===\n');

// .NET Executable
const exePath = path.join(__dirname, 'native', 'GetBrowserUrlNetTool.exe');
const exeSize = getSize(exePath);
console.log('.NET Executable:');
if (exeSize > 0) {
    console.log(`  Size: ${(exeSize / 1024 / 1024).toFixed(2)} MB`);
} else {
    console.log('  Not found');
}

console.log('');

// node_modules
const nodeModulesPath = path.join(__dirname, 'node_modules');
const nodeSize = getFolderSize(nodeModulesPath);
console.log('node_modules:');
if (nodeSize > 0) {
    console.log(`  Size: ${(nodeSize / 1024 / 1024).toFixed(2)} MB`);
} else {
    console.log('  Not found');
}

console.log('');

// Source code
const srcPath = path.join(__dirname, 'src');
const srcSize = getFolderSize(srcPath);
console.log('Source Code (src folder):');
console.log(`  Size: ${(srcSize / 1024).toFixed(2)} KB`);

console.log('');

// Project files
const projectFiles = ['package.json', 'index.js', 'build-dotnet.js', 'README.md', 'README_DEVELOPER.md', 'README_SETUP.md'];
let projectFilesSize = 0;
projectFiles.forEach(file => {
    projectFilesSize += getSize(path.join(__dirname, file));
});
console.log('Project Files:');
console.log(`  Size: ${(projectFilesSize / 1024).toFixed(2)} KB`);

console.log('');
console.log('=== SIZE COMPARISON ===');
console.log('Before optimization: ~45 MB (unoptimized .NET exe)');
console.log(`After optimization:  ${(exeSize / 1024 / 1024).toFixed(2)} MB (.NET exe)`);
const reduction = ((45 - (exeSize / 1024 / 1024)) / 45 * 100).toFixed(0);
console.log(`Reduction:           ${reduction}% (saved ~${(45 - (exeSize / 1024 / 1024)).toFixed(2)} MB)`);
console.log('');
console.log('Total Distributable Size:');
console.log(`  ${((exeSize + srcSize + projectFilesSize) / 1024 / 1024).toFixed(2)} MB (exe + source + config)`);
console.log('');
