import { promises as fs } from 'fs';
import { dirname, join, resolve } from 'path';

// Config
const paths = {
    modPath: "./mod_example",
    workshopPath: "./mod_example",
    localWorkshopPath: "./mod_example/test_output"
} as const;

const filePatterns = {
    modFile: /\.mod$/,
    nameInMod: /name="(.*?)"/,
    workshopIdInMod: /remote_file_id="(.*?)"/
} as const;

// Utilities
async function copyDir(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = join(src, entry.name);
        const destPath = join(dest, entry.name);

        if (entry.isDirectory()) {
            await copyDir(srcPath, destPath);
        } else {
            await fs.copyFile(srcPath, destPath);
        }
    }
}

function sanitizeFilename(name: string): string {
    return name.replace(/[\\/:*?"<>|]/g, '_');
}

async function getModInfo(modFilePath: string): Promise<{ name: string; workshopId: string; } | null> {
    try {
        const content = await fs.readFile(modFilePath, 'utf-8');
        const nameMatch = content.match(filePatterns.nameInMod);
        const idMatch = content.match(filePatterns.workshopIdInMod);

        if (nameMatch && idMatch) {
            return {
                name: nameMatch[1],
                workshopId: idMatch[1]
            };
        }
        return null;
    } catch {
        return null;
    }
}

function isModFile(filename: string): boolean {
    return filePatterns.modFile.test(filename);
}

// Main functionality
async function processMod(modFilePath: string, localWorkshopPath: string): Promise<void> {
    const modInfo = await getModInfo(modFilePath);
    if (!modInfo) {
        return;
    }

    const sourcePath = join(paths.workshopPath, modInfo.workshopId);
    const safeName = sanitizeFilename(modInfo.name);
    const destPath = join(localWorkshopPath, safeName);

    try {
        await fs.access(sourcePath);
        if (!(await fs.stat(destPath).catch(() => false))) {
            await copyDir(sourcePath, destPath);
        }
    } catch {
        // Skip if source folder not found
    }
}

async function main() {
    try {
        const baseDir = process.cwd();
        const localWorkshopPath = resolve(baseDir, paths.localWorkshopPath);
        
        // Create output directory
        await fs.mkdir(localWorkshopPath, { recursive: true });

        // Process all mod files
        const files = await fs.readdir(paths.modPath);
        for (const file of files) {
            if (isModFile(file)) {
                await processMod(join(paths.modPath, file), localWorkshopPath);
            }
        }
    } catch {
        process.exit(1);
    }
}

main();