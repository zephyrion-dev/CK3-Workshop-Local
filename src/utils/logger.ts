import { promises as fs } from 'fs';
import { join } from 'path';

export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR'
}

export class Logger {
    private logDir: string;
    private currentLogFile: string;

    constructor(logDir: string = '.log') {
        this.logDir = logDir;
        this.currentLogFile = join(this.logDir, `ck3-workshop-${new Date().toISOString().split('T')[0]}.log`);
    }

    async init(): Promise<void> {
        await fs.mkdir(this.logDir, { recursive: true });
    }

    private formatMessage(level: LogLevel, message: string): string {
        return `[${new Date().toISOString()}] ${level}: ${message}`;
    }

    async log(level: LogLevel, message: string): Promise<void> {
        const formattedMessage = this.formatMessage(level, message);
        console.log(formattedMessage);
        
        try {
            await fs.appendFile(this.currentLogFile, formattedMessage + '\n');
        } catch (error) {
            console.error(`Failed to write to log file: ${error}`);
        }
    }

    async debug(message: string): Promise<void> {
        await this.log(LogLevel.DEBUG, message);
    }

    async info(message: string): Promise<void> {
        await this.log(LogLevel.INFO, message);
    }

    async warn(message: string): Promise<void> {
        await this.log(LogLevel.WARN, message);
    }

    async error(message: string, error?: Error): Promise<void> {
        const errorMessage = error ? 
            `${message}\nStack trace:\n${error.stack}` :
            message;
        await this.log(LogLevel.ERROR, errorMessage);
    }

    async cleanup(retainDays: number = 7): Promise<void> {
        try {
            const files = await fs.readdir(this.logDir);
            const now = new Date();

            for (const file of files) {
                const filePath = join(this.logDir, file);
                const stats = await fs.stat(filePath);
                const diffDays = (now.getTime() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

                if (diffDays > retainDays) {
                    await fs.unlink(filePath);
                }
            }
        } catch (error) {
            console.error(`Failed to cleanup log files: ${error}`);
        }
    }
}

export const logger = new Logger();