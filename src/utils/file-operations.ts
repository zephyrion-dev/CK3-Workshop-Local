import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import { createHash } from 'crypto';
import { logger } from './logger.js';

interface CopyJob {
    src: string;
    dest: string;
    computeHash?: boolean;
}

export class FileOperations {
    private static readonly MAX_WORKERS = 4;
    private static activeWorkers = 0;

    static async copyWithVerification(src: string, dest: string): Promise<boolean> {
        try {
            const srcHash = await this.computeFileHash(src);
            await this.ensureDir(dirname(dest));
            await fs.copyFile(src, dest);
            const destHash = await this.computeFileHash(dest);

            if (srcHash !== destHash) {
                await logger.error(`Hash mismatch after copying ${src} to ${dest}`);
                return false;
            }

            return true;
        } catch (error) {
            await logger.error(`Error copying file ${src} to ${dest}`, error as Error);
            return false;
        }
    }

    static async computeFileHash(filePath: string): Promise<string> {
        const hash = createHash('sha256');
        const content = await fs.readFile(filePath);
        hash.update(content);
        return hash.digest('hex');
    }

    static async ensureDir(dir: string): Promise<void> {
        await fs.mkdir(dir, { recursive: true });
    }

    static async copyDirConcurrent(src: string, dest: string, computeHash = false): Promise<boolean> {
        try {
            await this.ensureDir(dest);
            const entries = await fs.readdir(src, { withFileTypes: true });
            const jobs: CopyJob[] = [];

            // Create copy jobs
            for (const entry of entries) {
                const srcPath = join(src, entry.name);
                const destPath = join(dest, entry.name);

                if (entry.isDirectory()) {
                    await this.ensureDir(destPath);
                    await this.copyDirConcurrent(srcPath, destPath, computeHash);
                } else {
                    jobs.push({ src: srcPath, dest: destPath, computeHash });
                }
            }

            if (jobs.length === 0) return true;

            // Process jobs with worker pool
            const results = await Promise.all(
                jobs.map(job => this.processFileInWorker(job))
            );

            return results.every(result => result);
        } catch (error) {
            await logger.error(`Error copying directory ${src} to ${dest}`, error as Error);
            return false;
        }
    }

    private static async processFileInWorker(job: CopyJob): Promise<boolean> {
        if (!isMainThread) {
            throw new Error('This method should only be called from the main thread');
        }

        return new Promise((resolve) => {
            const worker = new Worker(__filename, {
                workerData: job
            });

            worker.on('message', resolve);
            worker.on('error', async (error) => {
                await logger.error(`Worker error processing ${job.src}`, error as Error);
                resolve(false);
            });
        });
    }

    static async createBackup(path: string): Promise<string | null> {
        try {
            const backupPath = `${path}.backup-${Date.now()}`;
            await fs.copyFile(path, backupPath);
            await logger.info(`Created backup at ${backupPath}`);
            return backupPath;
        } catch (error) {
            await logger.error(`Failed to create backup of ${path}`, error as Error);
            return null;
        }
    }

    static async cleanup(directory: string, olderThanDays: number): Promise<void> {
        try {
            const files = await fs.readdir(directory);
            const now = Date.now();
            const maxAge = olderThanDays * 24 * 60 * 60 * 1000;

            for (const file of files) {
                const filePath = join(directory, file);
                const stats = await fs.stat(filePath);

                if (now - stats.mtimeMs > maxAge) {
                    if (stats.isDirectory()) {
                        await fs.rm(filePath, { recursive: true });
                    } else {
                        await fs.unlink(filePath);
                    }
                    await logger.info(`Cleaned up old file/directory: ${filePath}`);
                }
            }
        } catch (error) {
            await logger.error(`Error during cleanup of ${directory}`, error as Error);
        }
    }
}

// Worker thread code
if (!isMainThread) {
    const job = workerData as CopyJob;
    
    async function handleJob(): Promise<boolean> {
        try {
            await fs.mkdir(dirname(job.dest), { recursive: true });
            
            if (job.computeHash) {
                return FileOperations.copyWithVerification(job.src, job.dest);
            } else {
                await fs.copyFile(job.src, job.dest);
                return true;
            }
        } catch (error) {
            return false;
        }
    }

    handleJob().then(result => {
        parentPort?.postMessage(result);
    });
}