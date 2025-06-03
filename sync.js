const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs-extra');

const SOURCE = path.join(__dirname, 'source');
const DEST = path.join(__dirname, 'destination');
const TRASH = path.join(__dirname, 'trash');

// Ensure required directories exist
fs.ensureDirSync(SOURCE);
fs.ensureDirSync(DEST);
fs.ensureDirSync(TRASH);

// Helpers
const getDestPath = (srcPath) => srcPath.replace(SOURCE, DEST);
const getTrashPath = (destPath) => path.join(TRASH, path.relative(DEST, destPath));

// Copy file or directory
const copy = async (srcPath) => {
    const destPath = getDestPath(srcPath);
    try {
        const exists = await fs.pathExists(srcPath);
        if (!exists) {
            console.warn(`⚠️ Skipped (no longer exists): ${srcPath}`);
            return;
        }

        await fs.copy(srcPath, destPath, { overwrite: true, errorOnExist: false });
        console.log(`✅ Copied: ${path.relative(__dirname, srcPath)} -> ${path.relative(__dirname, destPath)}`);
    } catch (err) {
        console.error(`❌ Copy failed for ${srcPath}:`, err.message);
    }
};

// Move to trash
const safeRemove = async (srcPath) => {
    const destPath = getDestPath(srcPath);
    const trashPath = getTrashPath(destPath);

    try {
        const exists = await fs.pathExists(destPath);
        if (!exists) {
            console.warn(`⚠️ Skipped removal (not found): ${destPath}`);
            return;
        }

        await fs.ensureDir(path.dirname(trashPath));
        await fs.move(destPath, trashPath, { overwrite: true });
        console.log(`🗃️ Moved to trash: ${path.relative(__dirname, destPath)} -> ${path.relative(__dirname, trashPath)}`);
    } catch (err) {
        console.error(`❌ Failed to move to trash: ${destPath}`, err.message);
    }
};

// Set up chokidar watcher
const watcher = chokidar.watch(SOURCE, {
    ignoreInitial: false,
    persistent: true,
    awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100
    },
    followSymlinks: false,
    ignored: [DEST, TRASH]
});

// Events
watcher
    .on('add', copy)
    .on('change', copy)
    .on('addDir', copy)
    .on('unlink', safeRemove)
    .on('unlinkDir', safeRemove)
    .on('error', error => console.error('🚨 Watcher error:', error));

console.log('📡 Real-time folder sync started...');
console.log(`🔁 Watching: ${SOURCE}`);
