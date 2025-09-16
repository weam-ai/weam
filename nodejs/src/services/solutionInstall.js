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
 * @returns {Promise<string>} - Command output
 */
function runCommand(command) {
    return new Promise((resolve, reject) => {
        const child = spawn('sh', ['-c', command], { stdio: 'inherit' });
        
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
 * @returns {Promise<object>} - Merged environment variables
 */
async function mergeEnvironmentFiles(rootEnvPath, localEnvPath, outputPath) {
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

        console.log(`✅ Merge done. Total: ${Object.keys(mergedVars).length}`);
        return mergedVars;
    } catch (err) {
        console.error('❌ Merge failed:', err);
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
        console.log('🧹 Cleaning up existing containers...');
        
        // Stop and remove main container
        await runCommand(`docker rm -f ${config.containerName} || true`);
        
        // Stop containers using additional ports
        if (config.additionalPorts) {
            for (const port of config.additionalPorts) {
                await runCommand(`docker ps -q --filter "publish=${port}" | xargs -r docker stop || true`);
            }
        }
        
        console.log('✅ Existing containers cleaned up');
    } catch (error) {
        console.log('⚠️ Error cleaning up containers:', error.message);
    }
}

/**
 * Installs Docker service (single container)
 * @param {object} config - Solution configuration
 * @param {string} repoPath - Repository path
 * @returns {Promise<void>}
 */
async function installDockerService(config, repoPath) {
    console.log('🐳 Installing Docker service...');
    
    // Setup environment - ensure .env is exactly like .env.example
    if (config.envFile) {
        // await runCommand(`cp ${repoPath}/${config.envFile} ${repoPath}/.env`);
        await runCommand(`find ${repoPath} -name "${config.envFile}" -exec sh -c 'cp "$1" "$(dirname "$1")/.env"' _ {} \\;`);
    }
    
    // Create merged temporary file for build (don't touch original .env)
    const rootEnvPath = '/workspace/.env';
    const localEnvPath = `${repoPath}/.env`;
    const tempEnvPath = `${repoPath}/.env.temp`;
    
    // Create merged temporary file
    await mergeEnvironmentFiles(rootEnvPath, localEnvPath, tempEnvPath);
    
    // Use temporary .env file for build
    await runCommand(`cp ${tempEnvPath} ${localEnvPath}`);
    
    // Build Docker image
    console.log('🔨 Building Docker image...');
    await runCommand(`docker build -t ${config.imageName} ${repoPath}`);
    
    // Run container
    console.log('🚀 Starting container...');
    const networkName = 'weam_app-network';
    await runCommand(`docker run -d --name ${config.containerName} --network ${networkName} -p ${config.port}:${config.port} ${config.imageName}`);
    
    // Restore original .env file (exactly like .env.example) and clean up
    // await runCommand(`cp ${repoPath}/${config.envFile} ${repoPath}/.env`);
    await runCommand(`find ${repoPath} -name "${config.envFile}" -exec sh -c 'cp "$1" "$(dirname "$1")/.env"' _ {} \\;`);
    await runCommand(`rm -f ${tempEnvPath}`);
}

/**
 * Installs Docker Compose service (multiple containers)
 * @param {object} config - Solution configuration
 * @param {string} repoPath - Repository path
 * @returns {Promise<void>}
 */
async function installDockerComposeService(config, repoPath) {
    console.log('🐳 Installing Docker Compose service...');
    
    // Setup environment files - convert env.example to .env based on config
    if (config.envFile) {
        console.log(`📝 Converting ${config.envFile} to .env...`);
        // await runCommand(`cp ${repoPath}/${config.envFile} ${repoPath}/.env`);
        await runCommand(`find ${repoPath} -name "${config.envFile}" -exec sh -c 'cp "$1" "$(dirname "$1")/.env"' _ {} \\;`);
    } else {
        // Fallback: search for any .env.example file
        await runCommand(`find ${repoPath} -name ".env.example" -exec sh -c 'cp "$1" "$(dirname "$1")/.env"' _ {} \\;`);
    }
    
    // Create merged temporary file for build (don't touch original .env)
    const rootEnvPath = '/workspace/.env';
    const localEnvPath = `${repoPath}/.env`;
    const tempEnvPath = `${repoPath}/.env.temp`;
    
    // Create merged temporary file
    await mergeEnvironmentFiles(rootEnvPath, localEnvPath, tempEnvPath);
    
    // Detect repository structure
    const repoStructure = await detectRepoStructure(repoPath);
    
    if (repoStructure.hasDockerCompose) {
        // Use Docker Compose
        console.log(`📦 Using Docker Compose (${repoStructure.composeFile})...`);
        
        // Check if docker-compose is available
        const isComposeAvailable = await isDockerComposeAvailable();
        if (!isComposeAvailable) {
            await installDockerCompose();
        }
        
        // Use temporary .env file for docker-compose
        await runCommand(`cp ${tempEnvPath} ${localEnvPath}`);
        
        // Build and start services
        await runCommand(`cd ${repoPath} && docker-compose up -d --build`);
        
        // Keep the merged .env file (don't restore original .env.example)
        // This ensures all merged variables are preserved for the running container
        await runCommand(`rm -f ${tempEnvPath}`);
        
    } else if (repoStructure.hasDockerfile) {
        // Fallback to Docker
        console.log('📦 Using Dockerfile...');
        await installDockerService(config, repoPath);
        
    } else {
        throw new Error('No Docker configuration found in repository');
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
        
        console.log(`✅ Installing solution: ${solutionType} (${config.installType})`);
        
        const repoPath = `/workspace/${config.repoName}`;
        
        // Step 1: Clean up existing repository
        console.log('🧹 Cleaning up existing repository...');
        await runCommand(`rm -rf ${repoPath}`);
        
        // Step 2: Clone repository
        console.log('📥 Cloning repository...');
        await runCommand(`git clone -b ${config.branchName} ${config.repoUrl} ${repoPath}`);
        
        // Step 3: Clean up existing containers
        await cleanupExistingContainers(config);
        
        // Step 4: Install based on service type
        if (config.installType === 'docker') {
            await installDockerService(config, repoPath);
        } else if (config.installType === 'docker-compose') {
            await installDockerComposeService(config, repoPath);
        } else {
            throw new Error(`Unsupported installation type: ${config.installType}`);
        }
        
        console.log(`✅ Installation completed! Solution running at http://localhost:${config.port}`);
        
        return { success: true, port: config.port, solutionType };
        
    } catch (error) {
        console.error(`❌ Installation failed: ${error.message}`);
        handleError(error, 'Error - solutionInstallWithProgress');
        throw error;
    }
};

module.exports = {
    installWithProgress,
};