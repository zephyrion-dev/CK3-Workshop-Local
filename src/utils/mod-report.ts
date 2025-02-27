import { promises as fs } from 'fs';
import { join } from 'path';
import { logger } from './logger.js';

interface ModIssue {
    modName: string;
    missingDependencies?: string[];
    missingVersion?: boolean;
    missingGameVersion?: boolean;
}

export class ModReport {
    private issues: ModIssue[] = [];
    private reportPath: string;

    constructor(outputDir: string) {
        this.reportPath = join(outputDir, 'mod-issues.log');
    }

    addIssue(issue: ModIssue): void {
        this.issues.push(issue);
    }

    async generateReport(): Promise<void> {
        if (this.issues.length === 0) {
            await fs.writeFile(this.reportPath, 'No issues found with mods.\n');
            return;
        }

        const reportLines: string[] = ['Mod Issues Report\n==================\n'];
        const timestamp = new Date().toISOString();
        reportLines.push(`Generated: ${timestamp}\n`);

        // Group issues by type
        const missingVersions = this.issues.filter(i => i.missingVersion);
        const missingGameVersions = this.issues.filter(i => i.missingGameVersion);
        const missingDeps = this.issues.filter(i => i.missingDependencies?.length);

        if (missingVersions.length > 0) {
            reportLines.push('\nMods Missing Version Information:');
            reportLines.push('--------------------------------');
            missingVersions.forEach(issue => {
                reportLines.push(`- ${issue.modName}`);
            });
        }

        if (missingGameVersions.length > 0) {
            reportLines.push('\nMods Missing Game Version Information:');
            reportLines.push('-------------------------------------');
            missingGameVersions.forEach(issue => {
                reportLines.push(`- ${issue.modName}`);
            });
        }

        if (missingDeps.length > 0) {
            reportLines.push('\nMods With Missing Dependencies:');
            reportLines.push('-----------------------------');
            missingDeps.forEach(issue => {
                reportLines.push(`\n${issue.modName}:`);
                issue.missingDependencies?.forEach(dep => {
                    reportLines.push(`  - Missing: ${dep}`);
                });
            });
        }

        await fs.writeFile(this.reportPath, reportLines.join('\n') + '\n');
        await logger.info(`Generated mod issues report at ${this.reportPath}`);
    }
}