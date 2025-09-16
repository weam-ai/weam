const fs = require('fs');
const path = require('path');

function validateOllamaEnvironment() {
    console.log('Validating Ollama environment for Weam...\n');

    const envPath = path.join(__dirname, '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf-8');
        console.log('ENV file found');
    } else {
        console.log('ENV file not found');
        console.log('  Create a .env file in the nodejs directory');
    }

    const ollamaUrlRegex = /OLLAMA_URL\s*=\s*(.+)/;
    const match = envContent.match(ollamaUrlRegex);
    
    if (match) {
        const ollamaUrl = match[1].trim();
        console.log(`OLLAMA_URL configured: ${ollamaUrl}`);
        
        if (!ollamaUrl.startsWith('http')) {
            console.log('WARNING: OLLAMA_URL should start with http:// or https://');
        }
    } else {
        console.log('OLLAMA_URL not configured in .env');
        console.log('  Add: OLLAMA_URL=http://localhost:11434');
    }

    const fallbackRegex = /OLLAMA_FALLBACK_ENABLED\s*=\s*(.+)/;
    const fallbackMatch = envContent.match(fallbackRegex);
    
    if (fallbackMatch) {
        console.log(`OLLAMA_FALLBACK_ENABLED configured: ${fallbackMatch[1].trim()}`);
    } else {
        console.log('OLLAMA_FALLBACK_ENABLED not configured (optional)');
        console.log('  Add: OLLAMA_FALLBACK_ENABLED=true for cloud fallback');
    }

    console.log('\nChecking required dependencies...');
    
    const packagePath = path.join(__dirname, 'package.json');
    if (fs.existsSync(packagePath)) {
        const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
        const deps = packageContent.dependencies || {};
        
        if (deps.ollama) {
            console.log(`ollama package installed: ${deps.ollama}`);
        } else {
            console.log('ollama package not installed');
            console.log('  Run: npm install ollama');
        }
        
        if (deps.axios) {
            console.log(`axios package installed: ${deps.axios}`);
        } else {
            console.log('axios package not installed');
            console.log('  Run: npm install axios');
        }
    }

    console.log('\nRecommended next steps:');
    console.log('1. Ensure Ollama is installed on your system');
    console.log('2. Start Ollama service: ollama serve');
    console.log('3. Install at least one model: ollama pull llama3.1:8b');
    console.log('4. Test connectivity: npm run test-ollama');
    console.log('5. Start your Weam server: npm run dev');
}

if (require.main === module) {
    validateOllamaEnvironment();
}

module.exports = validateOllamaEnvironment;
