# CK3 Workshop Mod Copier

A tool to create local copies of ALL your Crusader Kings III Steam Workshop mods with readable names and version numbers in a single operation.

## Setup

1. Make sure you have Node.js installed on your system
2. Install dependencies:
```bash
npm install
```
3. Build the TypeScript code:
```bash
npm run build
```

## Usage

### Basic Usage

Run the tool using:
```bash
npm run dev
```

Or if you've already built it:
```bash
npm start
```

The script will:
- Copy mods to a "Workshop Mods" folder in the script's directory
- Create a log file in the .log directory for the operation
- Skip any mods that have already been copied

### What it Does

1. Creates a "Workshop Mods" folder in the script directory (not in your CK3 mod folder)
2. Scans all workshop mod files (matching "ugc_*.mod")
3. For each workshop mod:
   - Reads the mod name and version from its .mod file
   - Creates a copy in "Workshop Mods" using the format: "Mod Name v1.2.3"
   - Copies both the mod folder and its .mod file
   - Preserves original workshop files
4. Creates detailed logs in the .log directory with timestamps
5. Provides real-time console output of the copying process

### Features

- Automatic log directory creation and management
- Structured logging with timestamps
- Better error handling with TypeScript type safety
- Asynchronous file operations for better performance
- Log rotation (new log file for each run)
- Original workshop files are not modified
- Existing copies in "Workshop Mods" will be skipped
- The tool can be run multiple times safely - it will only copy new or missing mods
- If a mod's version cannot be found, it will be marked as "unknown"

## Troubleshooting

- Check the generated log files in the .log directory for detailed information about each run
- Each log file is timestamped for easy tracking
- The script creates backups of both mod folders and .mod files, so your original files are always safe