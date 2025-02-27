import { promises as fs } from 'fs';
import { join } from 'path';
import { logger } from './logger.js';

interface ModMetadata {
    name: string;
    modVersion?: string;   // Changed from version to modVersion for clarity
    gameVersion?: string;  // Changed from supportedGameVersion for clarity
    dependencies?: string[];
    workshopId: string;
    tags?: string[];
}

interface ModVersionInfo {
    modVersion: string;    // Will be "mv1.0.0" format
    gameVersion: string;   // Will be "gv1.0.0" format
}

export class ModValidator {
    private static versionPattern = /version\s*=\s*"?([^"\s}]+)"?/;
    private static gameVersionPattern = /supported_version\s*=\s*"?([^"\s}]+)"?/;
    private static dependencyPattern = /dependencies\s*=\s*\{([^}]+)\}/;
    private static tagPattern = /tags\s*=\s*\{([^}]+)\}/;

    private static formatModVersion(version: string): string {
        return version ? `mv${version.replace(/^v/i, '')}` : 'mvUnknown';
    }

    private static formatGameVersion(version: string): string {
        return version ? `gv${version.replace(/^v/i, '')}` : 'gvUnknown';
    }

    static async validateMod(modFilePath: string, modFolderPath: string): Promise<ModMetadata | null> {
        try {
            const content = await fs.readFile(modFilePath, 'utf-8');
            const metadata = await this.extractMetadata(content);
            
            if (!metadata) {
                await logger.warn(`Failed to extract metadata from ${modFilePath}`);
                return null;
            }

            // Validate mod folder exists
            try {
                await fs.access(modFolderPath);
            } catch {
                await logger.error(`Mod folder not found: ${modFolderPath}`);
                return null;
            }

            // Validate descriptor.mod exists in mod folder
            const descriptorPath = join(modFolderPath, 'descriptor.mod');
            try {
                await fs.access(descriptorPath);
            } catch {
                await logger.warn(`descriptor.mod not found in ${modFolderPath}`);
            }

            return metadata;
        } catch (error) {
            await logger.error(`Error validating mod: ${modFilePath}`, error as Error);
            return null;
        }
    }

    private static async extractMetadata(content: string): Promise<ModMetadata | null> {
        const nameMatch = content.match(/name="([^"]+)"|name=(\S+)/);
        const workshopIdMatch = content.match(/remote_file_id="([^"]+)"|remote_file_id=(\S+)/);

        if (!nameMatch || !workshopIdMatch) {
            return null;
        }

        const metadata: ModMetadata = {
            name: nameMatch[1] || nameMatch[2],
            workshopId: workshopIdMatch[1] || workshopIdMatch[2]
        };

        // Extract and format mod version
        const versionMatch = content.match(this.versionPattern);
        if (versionMatch) {
            const rawVersion = versionMatch[1];
            metadata.modVersion = this.formatModVersion(rawVersion);
        }

        // Extract and format game version
        const gameVersionMatch = content.match(this.gameVersionPattern);
        if (gameVersionMatch) {
            const rawGameVersion = gameVersionMatch[1];
            metadata.gameVersion = this.formatGameVersion(rawGameVersion);
        }

        // Log version information
        if (metadata.modVersion) {
            await logger.info(`Mod version detected: ${metadata.modVersion}`);
        }
        if (metadata.gameVersion) {
            await logger.info(`Game version detected: ${metadata.gameVersion}`);
        }

        // Extract dependencies
        const dependencyMatch = content.match(this.dependencyPattern);
        if (dependencyMatch) {
            metadata.dependencies = dependencyMatch[1]
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);
        }

        // Extract tags
        const tagMatch = content.match(this.tagPattern);
        if (tagMatch) {
            metadata.tags = tagMatch[1]
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);
        }

        return metadata;
    }

    static async validateDependencies(metadata: ModMetadata, modBasePath: string): Promise<boolean> {
        if (!metadata.dependencies || metadata.dependencies.length === 0) {
            return true;
        }

        for (const dependency of metadata.dependencies) {
            const dependencyPath = join(modBasePath, dependency);
            try {
                await fs.access(dependencyPath);
            } catch {
                await logger.warn(`Missing dependency for ${metadata.name}: ${dependency}`);
                return false;
            }
        }

        return true;
    }

    static async checkGameVersion(metadata: ModMetadata, requiredVersion: string): Promise<boolean> {
        if (!metadata.gameVersion) {
            await logger.warn(`No game version specified for mod: ${metadata.name}`);
            return false;
        }

        const requiredFormatted = this.formatGameVersion(requiredVersion);
        return metadata.gameVersion === requiredFormatted;
    }

    static getVersionString(metadata: ModMetadata): string {
        const gameVer = metadata.gameVersion || 'gvUnknown';
        const modVer = metadata.modVersion || 'mvUnknown';
        return `[${gameVer}][${modVer}]`;
    }
}