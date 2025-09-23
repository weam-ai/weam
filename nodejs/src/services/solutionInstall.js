const { handleError } = require('../utils/helper');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const SOLUTION_CONFIGS = require('../config/solutionconfig');

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Executes bash commands with console output
 * @param {string} command - The bash command to execute
 * @param {string} repoName - Repository name for logging prefix (optional)
 * @returns {Promise<string>} - Command output
 */
function runCommand(command, repoName = null) {
    return new Promise((resolve, reject) => {
        const child = spawn('sh', ['-c', command], { 
            stdio: repoName ? 'pipe' : 'inherit' 
        });
        
        if (repoName) {
            // Capture and prefix output when repoName is provided
            child.stdout.on('data', (data) => {
                const lines = data.toString().split('\n');
                lines.forEach(line => {
                    if (line.trim()) {
                        console.log(`[${repoName}] ${line}`);
                    }
                });
            });
            
            child.stderr.on('data', (data) => {
                const lines = data.toString().split('\n');
                lines.forEach(line => {
                    if (line.trim()) {
                        console.log(`[${repoName}] ${line}`);
                    }
                });
            });
        }
        
        child.on('close', (code) => {
            if (code === 0) {
                resolve('success');
            } else {
                reject(new Error(`Command failed: ${command}`));
            }
        });
        
        child.on('error', (error) => {
            reject(error);
        });
    });
}

/**
 * Advanced environment file merger using Object.assign and spread operator
 * Dynamically merges any .env files without hardcoded variables
 * @param {string} rootEnvPath - Path to root .env file
 * @param {string} localEnvPath - Path to local .env file
 * @param {string} outputPath - Path where to write the merged .env file
 * @param {string} repoName - Repository name for logging
 * @returns {Promise<object>} - Merged environment variables
 */
async function mergeEnvironmentFiles(rootEnvPath, localEnvPath, outputPath, repoName) {
    try {
        const parseEnvFile = (filePath) => {
            if (!fs.existsSync(filePath)) return {};

            return fs.readFileSync(filePath, 'utf8')
                .split(/\r?\n/) // Windows + Linux दोनों के लिए
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#') && line.includes('='))
                .reduce((acc, line) => {
                    const idx = line.indexOf('=');
                    const key = line.substring(0, idx).trim();
                    const value = line.substring(idx + 1).trim();

                    // अगर duplicate key आया और old value empty थी तो नया overwrite करे
                    if (!(key in acc) || (acc[key] === '' && value !== '')) {
                        acc[key] = value;
                    }
                    return acc;
                }, {});
        };

        const rootVars = parseEnvFile(rootEnvPath);
        const localVars = parseEnvFile(localEnvPath);

        // Advanced merge: Root values take precedence, but local values override if they're not empty
        const mergedVars = { ...rootVars };

        Object.keys(localVars).forEach(key => {
            const localVal = localVars[key];
            const rootVal = rootVars[key];

            // If local value is not empty, use it (local overrides root)
            if (localVal && localVal.trim() !== '') {
                mergedVars[key] = localVal;
            }
            // If local value is empty but root has value, keep root value
            else if (rootVal && rootVal.trim() !== '') {
                mergedVars[key] = rootVal;
            }
            // If both are empty, keep empty
            else {
                mergedVars[key] = localVal || rootVal || '';
            }
        });

        const tempFile = outputPath + '.temp';
        const envContent = Object.entries(mergedVars)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        fs.writeFileSync(tempFile, envContent);
        fs.renameSync(tempFile, outputPath);

        console.log(`[${repoName}] ✅ Merge done. Total: ${Object.keys(mergedVars).length}`);
        return mergedVars;
    } catch (err) {
        console.error(`[${repoName}] ❌ Merge failed:`, err);
        throw err;
    }
}




/**
 * Detects if Docker Compose is available
 * @returns {Promise<boolean>} - True if docker-compose is available
 */
async function isDockerComposeAvailable() {
    try {
        await runCommand('docker-compose --version');
        return true;
    } catch (error) {
        try {
            await runCommand('docker compose version');
            return true;
        } catch (error) {
            return false;
        }
    }
}

/**
 * Installs Docker Compose if not available
 * @returns {Promise<void>}
 */
async function installDockerCompose() {
    try {
        console.log('📦 Installing Docker Compose...');
        await runCommand('wget -O /usr/local/bin/docker-compose "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" && chmod +x /usr/local/bin/docker-compose');
        console.log('✅ Docker Compose installed successfully');
    } catch (error) {
        console.log('⚠️ Docker Compose installation failed, continuing with fallback...');
    }
}

/**
 * Detects repository structure and determines installation method
 * @param {string} repoPath - Path to repository
 * @returns {Promise<object>} - Repository structure info
 */
async function detectRepoStructure(repoPath) {
    const structure = {
        hasDockerCompose: false,
        hasDockerfile: false,
        composeFile: null
    };
    
    try {
        // Check for docker-compose files
        const composeFiles = ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'];
        for (const file of composeFiles) {
            if (fs.existsSync(path.join(repoPath, file))) {
                structure.hasDockerCompose = true;
                structure.composeFile = file;
                break;
            }
        }
        
        // Check for Dockerfile
        if (fs.existsSync(path.join(repoPath, 'Dockerfile'))) {
            structure.hasDockerfile = true;
        }
        
        return structure;
    } catch (error) {
        console.error('❌ Error detecting repository structure:', error);
        return structure;
    }
}

/**
 * Stops and removes existing containers
 * @param {object} config - Solution configuration
 * @returns {Promise<void>}
 */
async function cleanupExistingContainers(config) {
    try {
        console.log(`[${config.repoName}] 🧹 Cleaning up existing containers...`);
        
        // Stop and remove main container
        await runCommand(`docker rm -f ${config.containerName} || true`, config.repoName);
        
        console.log(`[${config.repoName}] ✅ Existing containers cleaned up`);
    } catch (error) {
        console.log(`[${config.repoName}] ⚠️ Error cleaning up containers:`, error.message);
    }
}


/**
 * Installs Docker Compose service (multiple containers)
 * @param {object} config - Solution configuration
 * @param {string} repoPath - Repository path
 * @returns {Promise<void>}
 */
async function installDockerComposeService(config, repoPath) {
    console.log(`[${config.repoName}] 🐳 Installing Docker Compose service...`);
    
    // Setup environment files - convert env.example to .env based on config
    if (config.envFile) {
        console.log(`[${config.repoName}] 📝 Converting ${config.envFile} to .env...`);
        // await runCommand(`cp ${repoPath}/${config.envFile} ${repoPath}/.env`);
        await runCommand(`find ${repoPath} -name "${config.envFile}" -exec sh -c 'cp "$1" "$(dirname "$1")/.env"' _ {} \\;`, config.repoName);
    } else {
        // Fallback: search for any .env.example file
        console.log(`[${config.repoName}] 📝 Searching for .env.example file...`);
        await runCommand(`find ${repoPath} -name ".env.example" -exec sh -c 'cp "$1" "$(dirname "$1")/.env"' _ {} \\;`, config.repoName);
    }
    
    // Create merged temporary file for build (don't touch original .env)
    const rootEnvPath = '/workspace/.env';
    const localEnvPath = `${repoPath}/.env`;
    const tempEnvPath = `${repoPath}/.env.temp`;
    
    // Create merged temporary file
    await mergeEnvironmentFiles(rootEnvPath, localEnvPath, tempEnvPath, config.repoName);
    
    // Detect repository structure
    const repoStructure = await detectRepoStructure(repoPath);
    
    if (repoStructure.hasDockerCompose) {
        // Use Docker Compose
        console.log(`[${config.repoName}] 📦 Using Docker Compose (${repoStructure.composeFile})...`);
        
        // Check if docker-compose is available
        const isComposeAvailable = await isDockerComposeAvailable();
        if (!isComposeAvailable) {
            console.log(`[${config.repoName}] 📦 Installing Docker Compose...`);
            await installDockerCompose();
        }
        
        // Use temporary .env file for docker-compose
        await runCommand(`cp ${tempEnvPath} ${localEnvPath}`, config.repoName);
        
        // Build and start services
        console.log(`[${config.repoName}] 🚀 Building and starting services...`);
        await runCommand(`cd ${repoPath} && docker-compose up -d --build`, config.repoName);
        
        // Keep the merged .env file (don't restore original .env.example)
        // This ensures all merged variables are preserved for the running container
        await runCommand(`rm -f ${tempEnvPath}`, config.repoName);
        
    } else {
        throw new Error(`[${config.repoName}] No Docker Compose configuration found in repository`);
    }
}

// ============================================================================
// MAIN INSTALLATION FUNCTION
// ============================================================================

const installWithProgress = async (req, res) => {
    try {
        const solutionType = req.body?.solutionType;
        
        if (!solutionType) {
            throw new Error('Solution type is required');
        }
        
        const config = SOLUTION_CONFIGS[solutionType];
        if (!config) {
            throw new Error(`Unknown solution type: ${solutionType}`);
        }
        
        console.log(`[${config.repoName}] ✅ Installing solution: ${solutionType}`);
        
        const repoPath = `/workspace/${config.repoName}`;
        
        // Step 1: Clean up existing repository
        console.log(`[${config.repoName}] 🧹 Cleaning up existing repository...`);
        await runCommand(`rm -rf ${repoPath}`, config.repoName);
        
        // Step 2: Clone repository
        console.log(`[${config.repoName}] 📥 Cloning repository...`);
        await runCommand(`git clone -b ${config.branchName} ${config.repoUrl} ${repoPath}`, config.repoName);
        
        // Step 3: Clean up existing containers
        await cleanupExistingContainers(config);
        
        // Step 4: Install using Docker Compose
        await installDockerComposeService(config, repoPath);
        
        console.log(`[${config.repoName}] ✅ Installation completed successfully!`);
        
        return { success: true, solutionType, repoName: config.repoName };
        
    } catch (error) {
        console.error(`[${config.repoName}] ❌ Installation failed: ${error.message}`);
        handleError(error, 'Error - solutionInstallWithProgress');
        throw error;
    }
};

module.exports = {
    installWithProgress,
};