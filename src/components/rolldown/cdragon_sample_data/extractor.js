#!/usr/bin/env node
/**
 * NOTE: Supercedes split-explort.js. This extractor keeps on the data we found to be useful.
 * TFT Data Extractor - Extracts specific sets and items from CommunityDragon TFT JSON
 * 
 * Usage: node tft-extract.js [options]
 * 
 * Options:
 *   --input <file>       Input JSON file (default: downloads from CommunityDragon)
 *   --output <dir>       Output directory (default: ./tft-data)
 *   --filter-sets <n,n>  Extract specific TFT sets (comma-separated, e.g., "13,14")
 *   --help               Show this help message
 */

const fs = require('fs');
const path = require('path');

const TFT_DATA_URL = 'https://raw.communitydragon.org/latest/cdragon/tft/en_us.json';

class TFTDataExtractor {
    constructor(options = {}) {
        this.options = {
            inputFile: options.inputFile || null,
            outputDir: options.outputDir || './src/components/rolldown/cdragon_sample_data/tft-data',
            filterSets: options.filterSets || [],
            ...options
        };
        
        this.data = null;
        this.ensureOutputDir();
    }

    ensureOutputDir() {
        if (!fs.existsSync(this.options.outputDir)) {
            fs.mkdirSync(this.options.outputDir, { recursive: true });
            console.log(`📁 Created directory: ${this.options.outputDir}`);
        }
    }

    async loadData() {
        if (this.options.inputFile && fs.existsSync(this.options.inputFile)) {
            console.log(`📂 Loading data from: ${this.options.inputFile}`);
            try {
                const fileContent = fs.readFileSync(this.options.inputFile, 'utf8');
                this.data = JSON.parse(fileContent);
                console.log(`✅ Loaded local file with ${Object.keys(this.data).length} top-level keys`);
            } catch (error) {
                console.error(`❌ Error reading local file: ${error.message}`);
                return false;
            }
        } else {
            console.log('⬇️  Downloading TFT data from CommunityDragon...');
            try {
                const response = await fetch(TFT_DATA_URL);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                this.data = await response.json();
                console.log(`✅ Downloaded data with ${Object.keys(this.data).length} top-level keys`);
            } catch (error) {
                console.error(`❌ Error downloading data: ${error.message}`);
                return false;
            }
        }
        return true;
    }

    getDataSize(obj) {
        return Buffer.byteLength(JSON.stringify(obj), 'utf8');
    }

    formatSize(bytes) {
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    }

    writeFile(filename, data, description) {
        const filePath = path.join(this.options.outputDir, filename);
        const size = this.getDataSize(data);
        
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        
        const relativePath = path.relative(process.cwd(), filePath);
        console.log(`✅ ${description}: ${relativePath} (${this.formatSize(size)})`);
        
        return { filename, filePath: relativePath, size, description };
    }

    findSetByNumber(setNumber) {
        if (!this.data.setData || !Array.isArray(this.data.setData)) {
            return null;
        }

        return this.data.setData.find(set => 
            set.number === setNumber.toString() || 
            set.number === setNumber ||
            set.mutator === `TFTSet${setNumber}` ||
            set.name === `Set${setNumber}`
        );
    }

    extractSets() {
        if (!this.options.filterSets || this.options.filterSets.length === 0) {
            console.log('⚠️  No sets specified for extraction. Use --filter-sets to specify sets.');
            return [];
        }

        console.log('\n🎯 EXTRACTING SETS');
        console.log('='.repeat(50));

        const extractedFiles = [];

        for (const setNumber of this.options.filterSets) {
            console.log(`🔍 Looking for Set ${setNumber}...`);
            
            const setData = this.findSetByNumber(setNumber);
            
            if (setData) {
                console.log(`   Found: ${setData.name || `Set ${setNumber}`}`);
                
                const filename = `setData-${setNumber}.json`;
                const description = `Set ${setNumber} data (${setData.name || 'Unknown'})`;
                
                extractedFiles.push(this.writeFile(filename, setData, description));
            } else {
                console.log(`   ❌ Set ${setNumber} not found`);
            }
        }

        return extractedFiles;
    }

    extractItems() {
        if (!this.data.items) {
            console.log('⚠️  No items data found');
            return null;
        }

        console.log('\n📦 EXTRACTING ITEMS');
        console.log('='.repeat(50));

        const itemsCount = Array.isArray(this.data.items) ? this.data.items.length : Object.keys(this.data.items).length;
        console.log(`📋 Processing ${itemsCount} items...`);

        return this.writeFile('items.json', this.data.items, 'All items data');
    }

    generateSummary(extractedFiles) {
        const summary = {
            metadata: {
                generatedAt: new Date().toISOString(),
                extractedSets: this.options.filterSets,
                totalFiles: extractedFiles.length,
                outputDirectory: path.relative(process.cwd(), this.options.outputDir)
            },
            files: extractedFiles.map(file => ({
                filename: file.filename,
                filePath: file.filePath,
                size: this.formatSize(file.size),
                description: file.description
            }))
        };

        this.writeFile('summary.json', summary, 'Extraction summary');
        return summary;
    }

    async extract() {
        console.log('🚀 Starting TFT Data Extraction');
        console.log('='.repeat(50));
        console.log(`Target sets: ${this.options.filterSets.join(', ') || 'none'}`);
        console.log(`Output directory: ${this.options.outputDir}`);

        // Load data
        const loaded = await this.loadData();
        if (!loaded) {
            console.log('❌ Failed to load data. Exiting.');
            return;
        }

        const extractedFiles = [];

        // Extract sets
        extractedFiles.push(...this.extractSets());

        // Extract items
        const itemsFile = this.extractItems();
        if (itemsFile) {
            extractedFiles.push(itemsFile);
        }

        // Generate summary
        const summary = this.generateSummary(extractedFiles);

        console.log('\n🎉 EXTRACTION COMPLETE');
        console.log('='.repeat(50));
        console.log(`📁 Output directory: ${path.relative(process.cwd(), this.options.outputDir)}`);
        console.log(`📦 Files created: ${extractedFiles.length}`);
        console.log(`📋 Summary: ${path.relative(process.cwd(), path.join(this.options.outputDir, 'summary.json'))}`);

        if (extractedFiles.length > 0) {
            console.log('\n📄 EXTRACTED FILES:');
            extractedFiles.forEach(file => {
                console.log(`   • ${file.filePath}`);
            });
        }
    }
}

// Command line argument parsing
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {};
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--input':
                options.inputFile = args[++i];
                break;
            case '--output':
                options.outputDir = args[++i];
                break;
            case '--filter-sets':
                const setsArg = args[++i];
                options.filterSets = setsArg.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
                break;
            case '--help':
                console.log(`
TFT Data Extractor - Extract specific sets and items from CommunityDragon TFT JSON

Usage: node tft-extract.js [options]

Options:
  --input <file>       Input JSON file (default: downloads from CommunityDragon)
  --output <dir>       Output directory (default: ./tft-data)
  --filter-sets <n,n>  Extract specific TFT sets (comma-separated, e.g., "13,14")
  --help               Show this help message

Examples:
  node tft-extract.js --filter-sets 14
  node tft-extract.js --filter-sets 13,14 --output ./my-tft-data
  node tft-extract.js --input ./tft_data_cache.json --filter-sets 14
`);
                process.exit(0);
                break;
        }
    }
    
    return options;
}

// Run if called directly
if (require.main === module) {
    const options = parseArgs();
    const extractor = new TFTDataExtractor(options);
    extractor.extract().catch(console.error);
}

module.exports = TFTDataExtractor;