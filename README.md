# CK3 Workshop Mod Copier

A tool to create local copies of ALL your Crusader Kings III Steam Workshop mods with readable names and version numbers in a single operation.

## Installation

1. Download or clone this repository
2. Make sure you have Node.js installed on your system
3. Install dependencies:
```bash
npm install
```
4. Build the TypeScript code:
```bash
npm run build
```

## Requirements

- Active Steam Workshop subscriptions to the CK3 mods you want to copy
- Steam Workshop folder with downloaded mod files (usually located at `steamapps/workshop/content/1158310/`)

## What it Does

1. Creates a "Workshop Mods" folder in the script directory (not in your CK3 mod folder)
2. Automatically locates your CK3 Steam Workshop directory
3. Scans all workshop mod files (matching "ugc_*.mod")
4. For each workshop mod:
   - Reads the mod name and version from its .mod file
   - Creates a copy in "Workshop Mods" using the format: "Mod Name v1.2.3"
   - Copies both the mod folder and its .mod file
   - Preserves original workshop files
5. Creates detailed logs in the .log directory with timestamps
6. Provides real-time console output of the copying process

## Usage

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

### Features

- **Safe Operation**:
  - Original workshop files are never modified
  - The tool can be run multiple times safely - it will only copy new or missing mods
  - Existing copies in "Workshop Mods" will be skipped
  - Creates backups of both mod folders and .mod files

- **Smart Processing**:
  - Automatic Steam Workshop directory detection
  - Asynchronous file operations for better performance
  - TypeScript type safety and error handling
  - Handles mods with missing version info (marked as "unknown")

- **Logging System**:
  - Automatic log directory creation and management
  - Structured logging with timestamps
  - Log rotation (new log file for each run)
  - Detailed console output during operation

## Troubleshooting

### Common Issues

1. **Steam Workshop Directory Not Found**
   - Verify your CK3 installation in Steam
   - Check if mods are properly downloaded in Steam Workshop

2. **Permission Issues**
   - Run the script with appropriate permissions
   - Ensure you have write access to the script directory

3. **Mod Copying Failures**
   - Check the .log directory for detailed error messages
   - Verify the mod is properly subscribed and downloaded in Steam
   - Try unsubscribing and resubscribing to the mod in Steam Workshop

### Getting Help

- Review the latest log file in the .log directory for detailed operation information
- Each log file is timestamped for easy tracking
- If issues persist, file a bug report with the contents of your log file