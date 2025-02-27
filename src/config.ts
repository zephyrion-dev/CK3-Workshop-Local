import { promises as fs } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline/promises';

interface Config {
    modPath: string;
    workshopPath: string;
    localModsPath: string;
    outputPath: string;
}

const DEFAULT_CONFIG: Config = {
    modPath: "",
    workshopPath: "",
    localModsPath: "./mod_local",
    outputPath: "./local_mods"
};

const CONFIG_PATH = 'config.json';

export async function loadConfig(): Promise<Config> {
    try {
        const configContent = await fs.readFile(CONFIG_PATH, 'utf-8');
        return { ...DEFAULT_CONFIG, ...JSON.parse(configContent) };
    } catch {
        return DEFAULT_CONFIG;
    }
}

export async function saveConfig(config: Config): Promise<void> {
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export async function setupConfig(): Promise<Config> {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log('CK3 Workshop Local Setup');
    console.log('=======================');

    const config = await loadConfig();

    const workshopPath = await rl.question(
        'Enter your CK3 Steam Workshop mods directory\n' +
        '(e.g., C:/Program Files (x86)/Steam/steamapps/workshop/content/1158310):\n> '
    );

    console.log('\nSetting up directories...');

    // Setup paths
    config.modPath = workshopPath;
    config.workshopPath = workshopPath;
    
    // Ensure local mods directory exists
    try {
        await fs.mkdir(config.localModsPath, { recursive: true });
        console.log(`Created local mods directory: ${config.localModsPath}`);
    } catch (error) {
        console.error(`Failed to create local mods directory: ${error}`);
        process.exit(1);
    }

    // Ensure output directory exists
    try {
        await fs.mkdir(config.outputPath, { recursive: true });
        console.log(`Created output directory: ${config.outputPath}`);
    } catch (error) {
        console.error(`Failed to create output directory: ${error}`);
        process.exit(1);
    }

    await saveConfig(config);
    
    rl.close();
    
    console.log('\nConfiguration and directories setup successfully!');
    return config;
}