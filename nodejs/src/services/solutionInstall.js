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
        
        // Get list of running containers
        const { exec } = require('child_process');
        const containerList = await new Promise((resolve, reject) => {
            exec('docker ps --format "{{.Names}}"', (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(stdout.trim().split('\n').filter(name => name.trim()));
                }
            });
        });
        
        // Find containers that match this solution
        const solutionContainers = containerList.filter(containerName => {
            const patterns = getSolutionPatterns(config.repoName);
            return patterns.some(pattern => 
                containerName.toLowerCase().includes(pattern.toLowerCase())
            );
        });
        
        console.log(`[${config.repoName}] Found containers to remove:`, solutionContainers);
        
        // Remove each container
        for (const containerName of solutionContainers) {
            try {
                console.log(`[${config.repoName}] 🛑 Removing container: ${containerName}`);
                await runCommand(`docker rm -f ${containerName}`, config.repoName);
            } catch (error) {
                console.log(`[${config.repoName}] ⚠️ Failed to remove container ${containerName}:`, error.message);
            }
        }
        
        // Also try to stop and remove using docker-compose if repository exists
        const repoPath = `/workspace/${config.repoName}`;
        if (require('fs').existsSync(repoPath)) {
            try {
                console.log(`[${config.repoName}] 🛑 Trying docker-compose cleanup...`);
                await runCommand(`cd ${repoPath} && docker-compose down -v --remove-orphans`, config.repoName);
            } catch (error) {
                console.log(`[${config.repoName}] ⚠️ Docker compose cleanup failed (expected if not using compose):`, error.message);
            }
        }
        
        console.log(`[${config.repoName}] ✅ Existing containers cleaned up`);
    } catch (error) {
        console.log(`[${config.repoName}] ⚠️ Error cleaning up containers:`, error.message);
    }
}

/**
 * Uninstalls a solution by stopping and removing containers and cleaning up repository
 * @param {object} config - Solution configuration
 * @param {string} repoPath - Repository path
 * @returns {Promise<void>}
 */
async function uninstallSolution(config, repoPath) {
    try {
        console.log(`[${config.repoName}] 🗑️ Starting uninstallation process...`);
        
        // Step 1: Find and remove ALL containers (running and stopped)
        console.log(`[${config.repoName}] 🔍 Finding all containers (running and stopped)...`);
        
        // Get list of ALL containers (running and stopped)
        const { exec } = require('child_process');
        const containerList = await new Promise((resolve, reject) => {
            exec('docker ps -a --format "{{.Names}}"', (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(stdout.trim().split('\n').filter(name => name.trim()));
                }
            });
        });
        
        // Find containers that match this solution
        const patterns = getSolutionPatterns(config.repoName);
        console.log(`[${config.repoName}] Generated patterns for uninstall:`, patterns);
        console.log(`[${config.repoName}] All containers (running and stopped):`, containerList);
        
        const solutionContainers = containerList.filter(containerName => {
            const matches = patterns.some(pattern => 
                pattern && typeof pattern === 'string' && containerName.toLowerCase().includes(pattern.toLowerCase())
            );
            if (matches) {
                console.log(`[${config.repoName}] Container '${containerName}' matches patterns:`, patterns);
            }
            return matches;
        });
        
        console.log(`[${config.repoName}] Found containers to remove:`, solutionContainers);
        
        // Remove each container
        for (const containerName of solutionContainers) {
            try {
                console.log(`[${config.repoName}] 🛑 Removing container: ${containerName}`);
                await runCommand(`docker rm -f ${containerName}`, config.repoName);
            } catch (error) {
                console.log(`[${config.repoName}] ⚠️ Failed to remove container ${containerName}:`, error.message);
            }
        }
        
        // Step 2: Try docker-compose cleanup if repository exists
        if (require('fs').existsSync(repoPath)) {
            try {
                console.log(`[${config.repoName}] 🛑 Trying docker-compose cleanup...`);
                await runCommand(`cd ${repoPath} && docker-compose down -v --remove-orphans`, config.repoName);
            } catch (error) {
                console.log(`[${config.repoName}] ⚠️ Docker compose cleanup failed (expected if not using compose):`, error.message);
            }
        }
        
        // Step 3: Remove images
        console.log(`[${config.repoName}] 🗑️ Removing images...`);
        try {
            // Handle both single image and array of images
            const imagesToRemove = Array.isArray(config.imageName) ? config.imageName : [config.imageName];
            
            for (const imageName of imagesToRemove) {
                try {
                    console.log(`[${config.repoName}] 🗑️ Removing image: ${imageName}`);
                    await runCommand(`docker rmi -f ${imageName} || true`, config.repoName);
                } catch (error) {
                    console.log(`[${config.repoName}] ⚠️ Failed to remove image ${imageName}:`, error.message);
                }
            }
            
            // Also try to remove any dangling images related to this solution
            try {
                console.log(`[${config.repoName}] 🗑️ Removing dangling images...`);
                await runCommand(`docker image prune -f`, config.repoName);
            } catch (error) {
                console.log(`[${config.repoName}] ⚠️ Dangling image cleanup failed:`, error.message);
            }
        } catch (error) {
            console.log(`[${config.repoName}] ⚠️ Image removal failed (may not exist):`, error.message);
        }
        
        // Step 4: Clean up repository directory
        console.log(`[${config.repoName}] 🧹 Cleaning up repository directory...`);
        await runCommand(`rm -rf ${repoPath}`, config.repoName);
        
        // Step 5: Clean up any remaining volumes
        console.log(`[${config.repoName}] 🧹 Cleaning up volumes...`);
        try {
            await runCommand(`docker volume prune -f`, config.repoName);
        } catch (error) {
            console.log(`[${config.repoName}] ⚠️ Volume cleanup failed:`, error.message);
        }
        
        console.log(`[${config.repoName}] ✅ Uninstallation completed successfully!`);
        
    } catch (error) {
        console.error(`[${config.repoName}] ❌ Uninstallation failed:`, error.message);
        throw error;
    }
}

// Helper function to get solution patterns dynamically from config
function getSolutionPatterns(repoName) {
    const config = SOLUTION_CONFIGS[repoName];
    if (!config) {
        return [repoName];
    }
    
    // Combine container names and repo name for pattern matching
    const patterns = [repoName];
    
    // Add container names from config
    if (config.containerName && Array.isArray(config.containerName)) {
        patterns.push(...config.containerName);
    } else if (config.containerName) {
        patterns.push(config.containerName);
    }
    
    // Add image names from config
    if (config.imageName && Array.isArray(config.imageName)) {
        patterns.push(...config.imageName);
    } else if (config.imageName) {
        patterns.push(config.imageName);
    }
    
    return patterns;
}


/**
 * Generates docker-compose.yml for n8n using official Docker image
 * @param {string} repoPath - Repository path
 * @param {object} config - Solution configuration
 * @returns {Promise<void>}
 */
async function generateN8nDockerCompose(repoPath, config) {
    // Read root .env to get domain information
    const rootEnvPath = '/workspace/.env';
    let domainName = 'weam.local';
    let protocol = 'https';
    
    if (fs.existsSync(rootEnvPath)) {
        const envContent = fs.readFileSync(rootEnvPath, 'utf8');
        const domainMatch = envContent.match(/NEXT_PUBLIC_DOMAIN_URL=(.+)/);
        if (domainMatch) {
            const domainUrl = domainMatch[1].trim();
            domainName = domainUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
            protocol = domainUrl.startsWith('https') ? 'https' : 'http';
        }
    }
    
    const composeContent = `

    services:
    n8n:
        image: docker.n8n.io/n8nio/n8n:latest
        container_name: ${config.containerName[0]}
        restart: unless-stopped
        ports:
        - "5678:5678"
        environment:
        - GENERIC_TIMEZONE=\${GENERIC_TIMEZONE:-UTC}
        - TZ=\${TZ:-UTC}
        - N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true
        - N8N_RUNNERS_ENABLED=true
        - N8N_PATH=\${N8N_PATH:-/n8n}
        - WEBHOOK_URL=\${WEBHOOK_URL:-${protocol}://${domainName}/n8n/}
        - N8N_HOST=\${N8N_HOST:-${domainName}}
        - N8N_PORT=\${N8N_PORT:-5678}
        - N8N_PROTOCOL=\${N8N_PROTOCOL:-${protocol}}
        - N8N_METRICS=true
        volumes:
        - n8n_data:/home/node/.n8n
        networks:
        - app-network

    volumes:
    n8n_data:

    networks:
    app-network:
        external:
        name: weam-open-source-mongo_app-network
    `;

    const composePath = path.join(repoPath, 'docker-compose.yml');
    fs.writeFileSync(composePath, composeContent);
    console.log(`[${config.repoName}] ✅ Generated docker-compose.yml for n8n with domain: ${domainName}`);
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
    // For n8n, create empty .env if it doesn't exist (we'll merge with root .env)
    if (config.repoName === 'n8n') {
        const localEnvPath = `${repoPath}/.env`;
        if (!fs.existsSync(localEnvPath)) {
            console.log(`[${config.repoName}] 📝 Creating .env file for n8n...`);
            fs.writeFileSync(localEnvPath, '');
        }
    } else if (config.envFile) {
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
    
    // Special handling for n8n - generate docker-compose.yml if it doesn't exist
    if (config.repoName === 'n8n' && !repoStructure.hasDockerCompose) {
        console.log(`[${config.repoName}] 📦 Generating docker-compose.yml for n8n using official image...`);
        await generateN8nDockerCompose(repoPath, config);
        repoStructure.hasDockerCompose = true;
        repoStructure.composeFile = 'docker-compose.yml';
    }
    
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
        
        // Build and start services (use --no-build for n8n since we're using official image)
        const buildFlag = config.repoName === 'n8n' ? '--no-build' : '--build';
        console.log(`[${config.repoName}] 🚀 Starting services...`);
        await runCommand(`cd ${repoPath} && docker-compose up ${buildFlag} -d`, config.repoName);
        
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
        
        // Step 2: Clone repository (skip for n8n as we use official Docker image)
        if (config.repoName === 'n8n') {
            console.log(`[${config.repoName}] 📦 Using official n8n Docker image, creating directory...`);
            await runCommand(`mkdir -p ${repoPath}`, config.repoName);
        } else {
            console.log(`[${config.repoName}] 📥 Cloning repository...`);
            await runCommand(`git clone -b ${config.branchName} ${config.repoUrl} ${repoPath}`, config.repoName);
        }
        
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

const uninstallWithProgress = async (req, res) => {
    try {
        const solutionType = req.body?.solutionType;
        
        if (!solutionType) {
            throw new Error('Solution type is required');
        }
        
        const config = SOLUTION_CONFIGS[solutionType];
        if (!config) {
            throw new Error(`Unknown solution type: ${solutionType}`);
        }
        
        console.log(`[${config.repoName}] 🗑️ Uninstalling solution: ${solutionType}`);
        
        const repoPath = `/workspace/${config.repoName}`;
        
        // Always use the dynamic uninstall process
        await uninstallSolution(config, repoPath);
        
        console.log(`[${config.repoName}] ✅ Uninstallation completed successfully!`);
        
        return { success: true, solutionType, repoName: config.repoName };
        
    } catch (error) {
        console.error(`[${config.repoName}] ❌ Uninstallation failed: ${error.message}`);
        handleError(error, 'Error - solutionUninstallWithProgress');
        throw error;
    }
};

const syncWithProgress = async (req, res) => {
    try {
        const solutionType = req.body?.solutionType;
        
        if (!solutionType) {
            throw new Error('Solution type is required');
        }
        
        const config = SOLUTION_CONFIGS[solutionType];
        if (!config) {
            throw new Error(`Unknown solution type: ${solutionType}`);
        }
        
        console.log(`[${config.repoName}] 🔄 Syncing solution: ${solutionType}`);
        
        const repoPath = `/workspace/${config.repoName}`;
        
        // Step 1: Clean up existing containers first
        await cleanupExistingContainers(config);
        
        // Step 2: Clean up existing repository
        console.log(`[${config.repoName}] 🧹 Cleaning up existing repository...`);
        await runCommand(`rm -rf ${repoPath}`, config.repoName);
        
        // Step 3: Clone repository (skip for n8n as we use official Docker image)
        if (config.repoName === 'n8n') {
            console.log(`[${config.repoName}] 📦 Using official n8n Docker image, creating directory...`);
            await runCommand(`mkdir -p ${repoPath}`, config.repoName);
        } else {
            console.log(`[${config.repoName}] 📥 Cloning repository...`);
            await runCommand(`git clone -b ${config.branchName} ${config.repoUrl} ${repoPath}`, config.repoName);
        }
        
        // Step 4: Install using Docker Compose
        await installDockerComposeService(config, repoPath);
        
        console.log(`[${config.repoName}] ✅ Sync completed successfully!`);
        
        return { success: true, solutionType, repoName: config.repoName };
        
    } catch (error) {
        console.error(`[${config.repoName}] ❌ Sync failed: ${error.message}`);
        handleError(error, 'Error - solutionSyncWithProgress');
        throw error;
    }
};

module.exports = {
    installWithProgress,
    uninstallWithProgress,
    syncWithProgress,
};