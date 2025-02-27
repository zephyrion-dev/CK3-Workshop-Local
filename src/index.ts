import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { loadConfig, setupConfig } from './config.js';
import { logger } from './utils/logger.js';
import { ModValidator } from './utils/mod-validator.js';
import { FileOperations } from './utils/file-operations.js';
import { ModReport } from './utils/mod-report.js';

// Node.js types
import type { WriteStream } from 'fs';
declare const process: {
    stdout: WriteStream;
    cwd: () => string;
    exit: (code: number) => never;
};

class ModProcessor {
    private readonly GAME_VERSION = "1.11.0"; // Current CK3 version
    private outputPath: string;
    private config: Awaited<ReturnType<typeof loadConfig>>;
    private modReport: ModReport;

    constructor(config: Awaited<ReturnType<typeof loadConfig>>) {
        this.config = config;
        this.outputPath = resolve(process.cwd(), config.outputPath);
        this.modReport = new ModReport(this.outputPath);
    }

    async initialize(): Promise<void> {
        await logger.init();
        // Create output directory for processed mods
        await fs.mkdir(this.outputPath, { recursive: true });
        // Create directory for local mods if it doesn't exist
        await fs.mkdir(this.config.localModsPath, { recursive: true });
        await logger.info('ModProcessor initialized successfully');
        await logger.info(`Using output directory: ${this.outputPath}`);
        await logger.info(`Using local mods directory: ${this.config.localModsPath}`);
    }

    private async processSingleModFile(modFilePath: string, sourcePath: string, isLocal: boolean): Promise<boolean> {
        try {
            const modFolderPath = join(sourcePath, modFilePath);
            const metadata = await ModValidator.validateMod(modFilePath, modFolderPath);

            if (!metadata) {
                await logger.warn(`Failed to validate mod: ${modFilePath}`);
                return false;
            }

            // Check for missing version information
            const modIssue = {
                modName: metadata.name,
                missingVersion: !metadata.modVersion,
                missingGameVersion: !metadata.gameVersion,
                missingDependencies: [] as string[]
            };

            // Validate game version compatibility
            const isGameVersionCompatible = await ModValidator.checkGameVersion(metadata, this.GAME_VERSION);
            if (!isGameVersionCompatible) {
                await logger.warn(`Mod ${metadata.name} may not be compatible with game version ${this.GAME_VERSION}`);
            }

            // Check dependencies
            if (metadata.dependencies?.length) {
                for (const dep of metadata.dependencies) {
                    if (!(await ModValidator.validateDependencies(metadata, dep))) {
                        modIssue.missingDependencies.push(dep);
                    }
                }
            }

            // Add to report if there are any issues
            if (modIssue.missingVersion || modIssue.missingGameVersion || modIssue.missingDependencies.length > 0) {
                this.modReport.addIssue(modIssue);
            }

            const versionString = ModValidator.getVersionString(metadata);
            const destName = `${metadata.name} ${versionString}${isLocal ? ' [LOCAL]' : ''}`;
            const safeName = destName.replace(/[\\/:*?"<>|]/g, '_');
            const destPath = join(this.outputPath, safeName);

            await logger.info(`Processing ${isLocal ? 'local' : 'workshop'} mod: ${metadata.name} (${versionString})`);

            // Check if mod already exists
            if (await fs.stat(destPath).catch(() => false)) {
                await logger.info(`Mod already exists: ${safeName}`);
                return true;
            }

            // Create backup of existing files if they exist
            const existingFiles: string[] = await fs.readdir(this.outputPath).catch(() => []);
            for (const file of existingFiles) {
                if (file.startsWith(safeName)) {
                    await FileOperations.createBackup(join(this.outputPath, file));
                }
            }

            // Copy mod files with verification
            const success = await FileOperations.copyDirConcurrent(
                modFolderPath,
                destPath,
                true // enable hash verification
            );

            if (success) {
                await logger.info(`Successfully processed mod: ${safeName}`);
                return true;
            } else {
                await logger.error(`Failed to process mod: ${safeName}`);
                return false;
            }
        } catch (error) {
            await logger.error(`Error processing mod: ${modFilePath}`, error as Error);
            return false;
        }
    }

    private async processModsInDirectory(directory: string, isLocal: boolean): Promise<[number, number]> {
        const files = await fs.readdir(directory);
        const modFiles = files.filter((file: string) => file.endsWith('.mod'));
        
        let processed = 0;
        let successful = 0;

        for (const file of modFiles) {
            if (await this.processSingleModFile(file, directory, isLocal)) {
                successful++;
            }
            processed++;
            process.stdout.write(`\rProcessing ${isLocal ? 'local' : 'workshop'} mods: ${processed}/${modFiles.length}`);
        }

        process.stdout.write('\n');
        return [processed, successful];
    }

    async processAllMods(): Promise<void> {
        try {
            await logger.info('Starting mod processing...');

            // Process Workshop mods
            const [workshopProcessed, workshopSuccessful] = await this.processModsInDirectory(
                this.config.workshopPath,
                false
            );
            await logger.info(`Processed ${workshopSuccessful}/${workshopProcessed} workshop mods`);

            // Process local mods
            const [localProcessed, localSuccessful] = await this.processModsInDirectory(
                this.config.localModsPath,
                true
            );
            await logger.info(`Processed ${localSuccessful}/${localProcessed} local mods`);

            // Generate the mod issues report
            await this.modReport.generateReport();

            // Cleanup old backups and logs
            await FileOperations.cleanup(this.outputPath, 30); // Keep backups for 30 days
            await logger.cleanup(7); // Keep logs for 7 days

            await logger.info('Completed processing all mods');
        } catch (error) {
            await logger.error('Error processing mods', error as Error);
            process.exit(1);
        }
    }
}

async function main() {
    try {
        let config = await loadConfig();
        
        if (!config.workshopPath) {
            config = await setupConfig();
        }

        const processor = new ModProcessor(config);
        await processor.initialize();
        await processor.processAllMods();
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

main();